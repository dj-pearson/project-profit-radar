import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { aiService } from "../_shared/ai-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [BLOG-AI] ${step}${details ? ` - ${JSON.stringify(details, null, 2)}` : ''}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { topic, company_id, queue_id } = await req.json();
    
    if (!topic || !company_id || !queue_id) {
      throw new Error('Missing required fields: topic, company_id, queue_id');
    }

    logStep("Starting blog generation", { topic, company_id, queue_id });

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Use centralized AI service for blog generation
    const blogContent = await aiService.generateBlogContent(topic, 'claude-sonnet-4');
    
    logStep("Blog content generated", { 
      title: blogContent.title,
      contentLength: blogContent.content?.length || 0
    });

    // Store the generated content in database
    const insertData = {
      company_id: company_id,
      queue_id: queue_id,
      title: blogContent.title,
      content: blogContent.content,
      excerpt: blogContent.excerpt,
      seo_description: blogContent.seo_description,
      keywords: blogContent.keywords || [topic],
      estimated_read_time: blogContent.estimated_read_time || 5,
      topic: topic,
      status: 'published',
      published_at: new Date().toISOString(),
      slug: generateSlug(blogContent.title)
    };
    
    logStep("Inserting blog post", { title: insertData.title, slug: insertData.slug });
    
    const { data: blogPost, error: insertError } = await supabaseClient
      .from('blog_posts')
      .insert(insertData)
      .select()
      .single();
      
    if (insertError) {
      logStep("Insert error", { error: insertError.message });
      throw new Error(`Failed to save blog post: ${insertError.message}`);
    }
    
    logStep("Blog post created successfully", { id: blogPost.id, title: blogPost.title });

    // Update queue item status to completed
    const { error: updateError } = await supabaseClient
      .from('blog_generation_queue')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString(),
        error_message: null
      })
      .eq('id', queue_id);

    if (updateError) {
      logStep("Failed to update queue status", { error: updateError.message });
    }

    // Trigger social media automation if enabled
    try {
      logStep("Triggering social media automation");
      await supabaseClient.functions.invoke('blog_social_webhook', {
        body: {
          blog_post_id: blogPost.id,
          company_id: company_id,
          title: blogPost.title,
          excerpt: blogPost.excerpt || '',
          url: `https://builddesk.com/blog/${blogPost.slug}`
        }
      });
      logStep("Social media automation triggered successfully");
    } catch (socialError) {
      logStep("Social media automation failed", { error: socialError instanceof Error ? socialError.message : 'Unknown error' });
      // Don't fail the entire process if social automation fails
    }
    
    // Return the response
    const response = {
      success: true,
      blog_post: blogPost,
      message: `Blog post "${blogContent.title}" generated and published successfully`
    };
    
    logStep("Response prepared", { blogPostId: blogPost.id, title: blogPost.title });
    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    logStep("Fatal error", { error: error instanceof Error ? error.message : 'Unknown error', stack: error instanceof Error ? error.stack : undefined });
    
    return new Response(JSON.stringify({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: "Blog generation failed"
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateSlug(title: string): string {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 100);
}