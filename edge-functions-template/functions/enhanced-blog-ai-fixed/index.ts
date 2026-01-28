// Version: 2.0.1 - Fixed import issues
import { createClient } from "npm:@supabase/supabase-js@2";
import { aiService } from "../_shared/ai-service.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [BLOG-AI-FIXED] ${step}${details ? ` - ${JSON.stringify(details, null, 2)}` : ''}`);
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { topic, company_id, queue_id, action, customSettings } = body;

    logStep("Request received", { hasBody: !!body, action, hasTopic: !!topic });

    // Handle both payload formats
    let finalTopic = topic;
    let finalCompanyId = company_id || customSettings?.company_id;
    let finalQueueId = queue_id || customSettings?.queue_id;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    
    // If no topic provided, generate a random one
    if (!finalTopic || finalTopic.trim() === '') {
      const topics = [
        "Construction Project Management Best Practices",
        "Safety Compliance in Modern Construction",
        "Technology Trends Transforming Construction",
        "Effective Budget Management for Contractors",
        "Improving Communication on Construction Sites",
        "Document Management for Construction Projects",
        "Time Tracking and Productivity in Construction"
      ];
      finalTopic = topics[Math.floor(Math.random() * topics.length)];
      logStep("Generated random topic", { topic: finalTopic });
    }

    logStep("Starting blog generation", {
      topic: finalTopic,
      company_id: finalCompanyId,
      queue_id: finalQueueId,
      action: action || 'direct'
    });

    // If no company_id, fetch the first available company (for auto-generation mode)
    if (!finalCompanyId) {
      logStep("No company_id provided, fetching default company");
      const { data: companies } = await supabaseClient
        .from('companies')
        .select('id')
        .limit(1)
        .single();

      if (companies) {
        finalCompanyId = companies.id;
        logStep("Using default company", { company_id: finalCompanyId });
      } else {
        throw new Error('No company found. Please provide a company_id.');
      }
    }

    // Use model from customSettings if provided
    const model = customSettings?.preferred_model || 'claude-sonnet-4-5';
    logStep("Using AI model", { model });

    // Use centralized AI service for blog generation
    let blogContent;
    try {
      logStep("Calling AI service generateBlogContent");
      blogContent = await aiService.generateBlogContent(finalTopic, model);
      logStep("AI service returned successfully");
    } catch (aiError) {
      logStep("AI service error", { 
        error: aiError instanceof Error ? aiError.message : 'Unknown error',
        stack: aiError instanceof Error ? aiError.stack : undefined
      });
      throw new Error(`AI generation failed: ${aiError instanceof Error ? aiError.message : 'Unknown error'}`);
    }
    
    logStep("Blog content generated", { 
      title: blogContent.title,
      contentLength: blogContent.content?.length || 0
    });

    const insertData = {
      company_id: finalCompanyId,
      queue_id: finalQueueId,
      title: blogContent.title,
      content: blogContent.content,
      excerpt: blogContent.excerpt,
      seo_description: blogContent.seo_description,
      keywords: blogContent.keywords || [finalTopic],
      estimated_read_time: blogContent.estimated_read_time || 5,
      topic: finalTopic,
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

    if (finalQueueId) {
      const { error: updateError } = await supabaseClient
        .from('blog_generation_queue')
        .update({
          status: 'completed',
          completed_at: new Date().toISOString(),
          error_message: null
        })
        .eq('id', finalQueueId);

      if (updateError) {
        logStep("Failed to update queue status", { error: updateError.message });
      } else {
        logStep("Queue status updated to completed");
      }
    } else {
      logStep("No queue_id provided, skipping queue update");
    }

    // Trigger social media automation if enabled
    try {
      logStep("Triggering social media automation");
      await supabaseClient.functions.invoke('blog_social_webhook', {
        body: {
          blog_post_id: blogPost.id,
          company_id: finalCompanyId,
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
    logStep("Fatal error", { 
      error: error instanceof Error ? error.message : 'Unknown error', 
      stack: error instanceof Error ? error.stack : undefined,
      errorType: error?.constructor?.name
    });
    
    const errorDetails = {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      errorType: error?.constructor?.name || 'Unknown',
      stack: error instanceof Error ? error.stack?.split('\n').slice(0, 5).join('\n') : undefined,
      message: "Blog generation failed"
    };
    
    console.error("Full error details:", JSON.stringify(errorDetails, null, 2));
    
    return new Response(JSON.stringify(errorDetails), {
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