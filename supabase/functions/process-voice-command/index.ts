import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from "../_shared/rate-limiter.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Cap inbound audio to prevent cost-amplification abuse of the Whisper API.
// ~10MB of base64 ≈ 7.5MB of audio — generous for short voice commands.
const MAX_AUDIO_BASE64_CHARS = 10 * 1024 * 1024;

interface VoiceCommandRequest {
  audio_data: string; // base64 encoded audio
  project_id: string;
  user_id: string;
  company_id: string;
}

interface VoiceCommandResponse {
  transcript: string;
  intent: string;
  entities: Record<string, any>;
  confidence: number;
  action_taken: boolean;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // SECURITY: require an authenticated caller and derive identity from the
    // JWT — never from the request body. Without this, any caller could spoof
    // user_id/company_id and drive unbounded Whisper + Claude spend.
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const authClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
      auth: { persistSession: false },
    });
    const { data: { user }, error: authError } = await authClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Rate limit: 20 req/min per user (service-role client writes the counter).
    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const rl = await checkRateLimit(serviceClient, {
      identifier: user.id,
      endpoint: "process-voice-command",
      ...RATE_LIMITS.AI,
    });
    if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);

    const { audio_data, project_id }: VoiceCommandRequest = await req.json();

    if (!audio_data || !project_id) {
      throw new Error("Missing required parameters");
    }
    if (typeof audio_data !== "string" || audio_data.length > MAX_AUDIO_BASE64_CHARS) {
      return new Response(JSON.stringify({ error: "Audio payload too large" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Step 1: Convert speech to text using OpenAI Whisper
    const transcript = await speechToText(audio_data);
    console.log("Transcript:", transcript);

    if (!transcript || transcript.trim().length === 0) {
      throw new Error("No speech detected in audio");
    }

    // Step 2: Extract intent and entities using Claude
    const analysis = await analyzeCommand(transcript);
    console.log("Analysis:", analysis);

    const response: VoiceCommandResponse = {
      transcript: transcript,
      intent: analysis.intent,
      entities: analysis.entities,
      confidence: analysis.confidence,
      action_taken: false, // Actions are handled by the frontend
    };

    return new Response(JSON.stringify(response), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (error) {
    console.error("Error processing voice command:", error);
    
    const errorMessage = error instanceof Error ? error.message : "Failed to process voice command";

    return new Response(
      JSON.stringify({
        error: errorMessage,
        transcript: "",
        intent: "unknown",
        entities: {},
        confidence: 0,
        action_taken: false,
      }),
      {
        status: 400,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});

async function speechToText(audioBase64: string): Promise<string> {
  const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
  if (!openaiApiKey) {
    throw new Error("OpenAI API key not configured");
  }

  // Convert base64 to blob
  const audioBuffer = Uint8Array.from(atob(audioBase64), (c) =>
    c.charCodeAt(0)
  );

  // Create form data
  const formData = new FormData();
  formData.append(
    "file",
    new Blob([audioBuffer], { type: "audio/webm" }),
    "audio.webm"
  );
  formData.append("model", "whisper-1");
  formData.append("language", "en");

  const response = await fetch(
    "https://api.openai.com/v1/audio/transcriptions",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${openaiApiKey}`,
      },
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Whisper API error: ${error}`);
  }

  const result = await response.json();
  return result.text || "";
}

async function analyzeCommand(transcript: string): Promise<{
  intent: string;
  entities: Record<string, any>;
  confidence: number;
}> {
  const claudeApiKey = Deno.env.get("CLAUDE_API_KEY");
  if (!claudeApiKey) {
    throw new Error("Claude API key not configured");
  }

  const systemPrompt = `You are a construction voice command analyzer. Analyze the given construction-related voice command and extract:

1. Intent: One of these categories:
   - update_progress: Updating task/phase completion percentage
   - report_issue: Reporting problems, safety issues, or concerns
   - request_materials: Requesting materials, supplies, or deliveries
   - log_time: Logging work hours or time entries
   - schedule_inspection: Scheduling inspections or appointments

2. Entities: Extract relevant details like:
   - task_name: Name of task or work phase
   - completion_percentage: Percentage complete (if mentioned)
   - phase: Construction phase (framing, electrical, plumbing, etc.)
   - issue_description: Description of reported issue
   - location: Location or area mentioned
   - severity: Issue severity (low, medium, high)
   - material_name: Name of requested material
   - quantity: Amount or quantity
   - delivery_date: When materials are needed
   - hours: Number of hours worked
   - activity: Type of work activity
   - inspection_type: Type of inspection needed
   - date: Specific date mentioned
   - time: Specific time mentioned

3. Confidence: How confident you are in the analysis (0.0 to 1.0)

Respond with valid JSON only. Be flexible with construction terminology and abbreviations.

Examples:
- "Mark framing 80% complete" → {"intent": "update_progress", "entities": {"phase": "framing", "completion_percentage": 80}, "confidence": 0.9}
- "Report safety issue in area 3" → {"intent": "report_issue", "entities": {"issue_description": "safety issue", "location": "area 3", "severity": "medium"}, "confidence": 0.85}
- "Order 50 sheets of drywall for tomorrow" → {"intent": "request_materials", "entities": {"material_name": "drywall", "quantity": 50, "delivery_date": "tomorrow"}, "confidence": 0.9}`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "X-API-Key": claudeApiKey,
      "Content-Type": "application/json",
      "anthropic-version": "2023-06-01"
    },
    body: JSON.stringify({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 500,
      system: systemPrompt,
      messages: [
        {
          role: "user",
          content: `Analyze this construction voice command: "${transcript}"`
        }
      ]
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Claude API error: ${error}`);
  }

  const result = await response.json();
  const content = result.content[0]?.text;

  if (!content) {
    throw new Error("No analysis result from Claude");
  }

  try {
    const analysis = JSON.parse(content);

    // Validate the analysis structure
    if (
      !analysis.intent ||
      !analysis.entities ||
      typeof analysis.confidence !== "number"
    ) {
      throw new Error("Invalid analysis format");
    }

    // Ensure confidence is between 0 and 1
    analysis.confidence = Math.max(0, Math.min(1, analysis.confidence));

    return analysis;
  } catch (parseError) {
    console.error("Error parsing analysis:", parseError, "Content:", content);

    // Fallback analysis
    return {
      intent: "update_progress",
      entities: { raw_text: transcript },
      confidence: 0.3,
    };
  }
}

/* To deploy this function, you'll need to set the CLAUDE_API_KEY and OPENAI_API_KEY secrets:
   supabase secrets set CLAUDE_API_KEY=your_claude_api_key_here
   supabase secrets set OPENAI_API_KEY=your_openai_api_key_here
*/
