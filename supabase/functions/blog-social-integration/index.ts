// Blog Social Integration Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
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
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authContext;
    console.log("[BLOG-SOCIAL] User authenticated", { userId: user.id });

    const { blogContent, companyId } = await req.json();

    console.log("Generating social media content from blog post");

    // Generate social media posts using AI service
    const socialContent = await generateSocialContent(blogContent);

    // Save to database with site isolation
    for (const post of socialContent) {
      await supabase.from('social_media_posts').insert({  // CRITICAL: Site isolation
        company_id: companyId,
        platform: post.platform,
        content: post.content,
        status: 'draft',
        created_at: new Date().toISOString()
      });
    }

    return new Response(JSON.stringify({
      success: true,
      posts_generated: socialContent.length
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error generating social content:', error);
    return new Response(JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function generateSocialContent(blogContent: any) {
  const systemPrompt = `You are a social media expert specializing in construction industry content. 
  Transform the given blog content into engaging social media posts for different platforms.
  
  Return JSON array with this format:
  [
    {
      "platform": "linkedin",
      "content": "Professional post content with relevant hashtags"
    },
    {
      "platform": "twitter",
      "content": "Concise tweet under 280 characters with hashtags"
    },
    {
      "platform": "facebook", 
      "content": "Engaging Facebook post with call-to-action"
    }
  ]`;

  const prompt = `Create social media posts from this blog content:
  Title: ${blogContent.title}
  Excerpt: ${blogContent.excerpt || blogContent.content?.substring(0, 200)}`;

  const response = await aiService.generateSimpleContent(prompt, systemPrompt, 'claude-haiku');
  
  try {
    return JSON.parse(response);
  } catch {
    // Fallback if JSON parsing fails
    return [
      {
        platform: 'linkedin',
        content: `New blog post: ${blogContent.title} - ${blogContent.excerpt || ''} #Construction #Management`
      },
      {
        platform: 'twitter', 
        content: `${blogContent.title} ${blogContent.excerpt?.substring(0, 100) || ''} #Construction`
      },
      {
        platform: 'facebook',
        content: `Check out our latest insights: ${blogContent.title}. ${blogContent.excerpt || ''}`
      }
    ];
  }
}