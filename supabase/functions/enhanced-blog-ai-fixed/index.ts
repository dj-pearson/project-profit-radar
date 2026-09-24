// Version: 2.0.2 - Export handler for self-hosted Supabase
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { aiService } from "../_shared/ai-service.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { requireSystemOrAdmin } from "../_shared/system-auth.ts";
import { validateBody } from "../_shared/validate-body.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

import { initializeAuthContext } from "../_shared/auth-helpers.ts";
import { resolveCompanyScope } from "../_shared/caller-company.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// Callers: BlogAutoGeneration.tsx (analyze-content-diversity, test-generation
// with the settings row, generate-auto-content with ...settings plus
// company_id), BlogAIDebugger.tsx and BlogManager.tsx (topic plus a few
// generation settings), and process-blog-generation-queue ({ action, topic,
// customSettings: { company_id, queue_id } }). customSettings is a whole
// blog_auto_generation_settings row in one of those, so it stays open.
const EnhancedBlogAiFixedSchema = z.object({
  action: z.string().max(50).nullish(),
  topic: z.string().max(1000).nullish(),
  company_id: z.string().uuid().nullish(),
  queue_id: z.string().uuid().nullish(),
  customSettings: z.object({
    company_id: z.string().uuid().nullish(),
    queue_id: z.string().uuid().nullish(),
    preferred_model: z.string().max(100).nullish(),
    model_temperature: z.number().min(0).max(2).nullish(),
    target_word_count: z.number().int().positive().max(20000).nullish(),
  }).passthrough().nullish(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [BLOG-AI-FIXED] ${step}${details ? ` - ${JSON.stringify(details, null, 2)}` : ''}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await requireSystemOrAdmin(req);
  if (denied) return denied;

  try {
    const parsed = await validateBody(req, EnhancedBlogAiFixedSchema, { name: 'enhanced-blog-ai-fixed' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
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

    // SECURITY (US-241): the guard above admits any company admin, and
    // everything below runs on the service role - so a body company_id put a
    // PUBLISHED blog post under another tenant, a body queue_id marked another
    // tenant's queue item completed, and blog_social_webhook then fired that
    // tenant's social automation. A signed-in caller now acts only for their
    // own company (root_admin excepted), and a queue item must belong to it.
    // A scheduler or service-role caller has no user context and keeps the
    // body's company, as before.
    const authContext = await initializeAuthContext(req);
    if (authContext) {
      const { data: callerProfile } = await supabaseClient
        .from('user_profiles')
        .select('role, company_id')
        .eq('id', authContext.user.id)
        .maybeSingle();
      if (callerProfile?.role !== 'root_admin') {
        const scope = resolveCompanyScope(callerProfile?.company_id, finalCompanyId);
        if (!scope.ok) {
          return new Response(
            JSON.stringify({ success: false, error: scope.error, timestamp: new Date().toISOString() }),
            { status: scope.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
          );
        }
        finalCompanyId = scope.companyId;
      }
    }
    if (finalQueueId) {
      const { data: queueItem } = await supabaseClient
        .from('blog_generation_queue')
        .select('company_id')
        .eq('id', finalQueueId)
        .maybeSingle();
      if (!queueItem || (finalCompanyId && queueItem.company_id !== finalCompanyId)) {
        logStep("Ignoring queue_id that does not belong to this company", { queue_id: finalQueueId });
        finalQueueId = undefined;
      } else if (!finalCompanyId) {
        finalCompanyId = queueItem.company_id;
      }
    }
    
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
          url: `https://brikly.net/blog/${blogPost.slug}`
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
    return new Response(JSON.stringify({ ...response, success: response.success, timestamp: new Date().toISOString() }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    await captureException(error, { fn: 'enhanced-blog-ai-fixed', req });
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
    
    return new Response(JSON.stringify({ ...errorDetails, success: errorDetails.success, timestamp: new Date().toISOString() }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
};

function generateSlug(title: string): string {
  const baseSlug = title
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .trim()
    .substring(0, 80);

  // Add timestamp suffix to ensure uniqueness
  const timestamp = Date.now().toString(36);
  return `${baseSlug}-${timestamp}`;
}