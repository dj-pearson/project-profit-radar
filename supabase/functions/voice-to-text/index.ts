import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface VoiceToTextRequest {
  audioBlob: string; // base64 encoded audio
  language?: string;
  model?: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { audioBlob, language = "en", model = "whisper-1" }: VoiceToTextRequest = await req.json();

    console.log("Processing voice-to-text request...");

    // Convert base64 to blob
    const audioBuffer = Uint8Array.from(atob(audioBlob), c => c.charCodeAt(0));
    const audioFile = new File([audioBuffer], "audio.webm", { type: "audio/webm" });

    const openAIApiKey = Deno.env.get("OPENAI_API_KEY");
    if (!openAIApiKey) {
      throw new Error("OpenAI API key not configured");
    }

    // Create form data for OpenAI Whisper API
    const formData = new FormData();
    formData.append("file", audioFile);
    formData.append("model", model);
    formData.append("language", language);

    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openAIApiKey}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("OpenAI API error:", errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const result = await response.json();
    console.log("Transcription completed successfully");

    return new Response(JSON.stringify({ 
      text: result.text,
      success: true 
    }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });

  } catch (error: any) {
    console.error("Error in voice-to-text function:", error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        success: false 
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);