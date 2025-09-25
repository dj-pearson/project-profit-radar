import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { aiService } from "../_shared/ai-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { prompt, system_prompt, model_alias, content_type } = await req.json();

    if (!prompt) {
      throw new Error('Prompt is required');
    }

    console.log('Generating content with AI service:', { content_type, model_alias });

    let result;

    switch (content_type) {
      case 'blog':
        result = await aiService.generateBlogContent(prompt, model_alias);
        break;
      
      case 'social':
        const socialSystemPrompt = system_prompt || `You are a social media expert specializing in construction industry content. 
        Create engaging social media posts that are professional, informative, and include relevant hashtags.
        
        Return JSON array with this format:
        [
          { "platform": "linkedin", "content": "Professional post with hashtags" },
          { "platform": "twitter", "content": "Concise tweet under 280 chars" },
          { "platform": "facebook", "content": "Engaging Facebook post" }
        ]`;
        
        const socialResponse = await aiService.generateSimpleContent(
          prompt, 
          socialSystemPrompt, 
          model_alias || 'claude-haiku'
        );
        
        try {
          result = JSON.parse(socialResponse);
        } catch {
          result = { content: socialResponse };
        }
        break;
      
      default:
        result = await aiService.generateSimpleContent(prompt, system_prompt, model_alias);
    }

    return new Response(JSON.stringify({ 
      success: true, 
      content: result,
      model_used: model_alias || 'default'
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('AI content generation error:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});