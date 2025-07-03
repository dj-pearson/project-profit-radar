import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  console.log(`[BLOG-AI] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");

    // Check if user is root admin
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profileError || userProfile.role !== 'root_admin') {
      throw new Error("Insufficient permissions");
    }

    const { action, prompt, blogTopic } = await req.json();

    if (action === 'generate-content') {
      // Get active AI settings
      const { data: aiSettings, error: settingsError } = await supabaseClient
        .from('ai_settings')
        .select('*')
        .eq('is_active', true)
        .single();

      if (settingsError || !aiSettings) {
        throw new Error("No active AI provider configured");
      }

      logStep("Using AI provider", { provider: aiSettings.provider });

      let generatedContent;

      if (aiSettings.provider === 'openai') {
        generatedContent = await generateWithOpenAI(aiSettings, blogTopic || prompt);
      } else if (aiSettings.provider === 'claude') {
        generatedContent = await generateWithClaude(aiSettings, blogTopic || prompt);
      } else if (aiSettings.provider === 'gemini') {
        generatedContent = await generateWithGemini(aiSettings, blogTopic || prompt);
      } else {
        throw new Error("Unsupported AI provider");
      }

      return new Response(JSON.stringify({ content: generatedContent }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ error: "Invalid action" }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});

async function generateWithOpenAI(settings: any, topic: string) {
  const apiKey = Deno.env.get(settings.api_key_name);
  if (!apiKey) {
    throw new Error(`API key ${settings.api_key_name} not found in environment`);
  }

  const prompt = `${settings.global_instructions}

${settings.blog_instructions}

Topic: ${topic}

Please generate a comprehensive blog article with the following structure:
{
  "title": "Engaging blog title",
  "body": "Full article content in markdown format with proper headings, paragraphs, and structure",
  "excerpt": "Brief 2-3 sentence summary",
  "seo_title": "SEO optimized title (max 60 chars)",
  "seo_description": "SEO meta description (max 160 chars)"
}

Make sure the content is professional, informative, and engaging for construction industry professionals.`;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: settings.model,
      messages: [
        { role: 'user', content: prompt }
      ],
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    throw new Error(`OpenAI API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content;
  
  try {
    return JSON.parse(content);
  } catch {
    // If JSON parsing fails, return structured content
    return {
      title: topic,
      body: content,
      excerpt: content.substring(0, 200) + "...",
      seo_title: topic.substring(0, 60),
      seo_description: content.substring(0, 160) + "..."
    };
  }
}

async function generateWithClaude(settings: any, topic: string) {
  const apiKey = Deno.env.get(settings.api_key_name);
  if (!apiKey) {
    throw new Error(`API key ${settings.api_key_name} not found in environment`);
  }

  const prompt = `${settings.global_instructions}

${settings.blog_instructions}

Topic: ${topic}

Please generate a comprehensive blog article with the following JSON structure:
{
  "title": "Engaging blog title",
  "body": "Full article content in markdown format",
  "excerpt": "Brief summary",
  "seo_title": "SEO title (max 60 chars)",
  "seo_description": "SEO description (max 160 chars)"
}`;

  const response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: settings.model,
      max_tokens: 4000,
      messages: [
        { role: 'user', content: prompt }
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(`Claude API error: ${response.statusText}`);
  }

  const data = await response.json();
  const content = data.content[0].text;
  
  try {
    return JSON.parse(content);
  } catch {
    return {
      title: topic,
      body: content,
      excerpt: content.substring(0, 200) + "...",
      seo_title: topic.substring(0, 60),
      seo_description: content.substring(0, 160) + "..."
    };
  }
}

async function generateWithGemini(settings: any, topic: string) {
  const apiKey = Deno.env.get(settings.api_key_name);
  if (!apiKey) {
    throw new Error(`API key ${settings.api_key_name} not found in environment`);
  }

  // Implementation for Gemini would go here
  // For now, return a placeholder
  return {
    title: `${topic} - Generated with Gemini`,
    body: `# ${topic}\n\nThis content would be generated using Google's Gemini AI...`,
    excerpt: `Generated content about ${topic}`,
    seo_title: topic.substring(0, 60),
    seo_description: `Learn about ${topic} in construction management.`
  };
}