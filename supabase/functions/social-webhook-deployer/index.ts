import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The caller, src/components/social-media/PostQueueActions.tsx, sends
// { queueId, forceRedeploy }.
const SocialWebhookDeployerSchema = z.object({
  queueId: z.string().uuid(),
  forceRedeploy: z.boolean().nullish(),
}).passthrough();

const logStep = (step: string, data?: any) => {
  console.log(`[Social Webhook Deployer] ${step}:`, data || "");
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseServiceKey);

  try {
    // Authenticate the caller: invoked from src/components/social-media/PostQueueActions.tsx.
    // verify_jwt = true is a signature check the publishable anon key
    // satisfies, not authentication (US-241).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    logStep("Social webhook deployer started");

    const parsed = await validateBody(req, SocialWebhookDeployerSchema, { name: 'social-webhook-deployer' });
    if (!parsed.ok) return parsed.response;
    const { queueId, forceRedeploy } = parsed.data;

    if (!queueId) {
      return new Response(
        JSON.stringify({ error: "queueId is required" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    logStep("Processing webhook deployment", { queueId, forceRedeploy });

    // Get the queue item
    const { data: queueItem, error: queueError } = await supabase
      .from("automated_social_posts_queue")
      .select("*")
      .eq("id", queueId)
      .single();

    // SECURITY (US-241): the queue item is looked up on the SERVICE ROLE by a
    // body-supplied id, and its company's webhook is then fired with that
    // company's posts. Any signed-in user could redeploy another tenant's
    // queue item into that tenant's webhook. The item must belong to the
    // caller's company (root_admin excepted); a miss answers like a missing id.
    let callerOwnsItem = false;
    if (queueItem) {
      const { data: callerProfile } = await supabase
        .from("user_profiles")
        .select("role, company_id")
        .eq("id", authContext.user.id)
        .maybeSingle();
      callerOwnsItem = callerProfile?.role === "root_admin" ||
        (!!callerProfile?.company_id && queueItem.company_id === callerProfile.company_id);
    }

    if (queueError || !queueItem || !callerOwnsItem) {
      logStep("Queue item not found", { queueId, error: queueError });
      return new Response(
        JSON.stringify({ error: "Queue item not found" }),
        { 
          status: 404, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the company's automation config
    const { data: config, error: configError } = await supabase
      .from("automated_social_posts_config")
      .select("webhook_url")
      .eq("company_id", queueItem.company_id)
      .single();

    if (configError || !config?.webhook_url) {
      logStep("No webhook URL configured", { 
        company_id: queueItem.company_id, 
        error: configError 
      });
      return new Response(
        JSON.stringify({ error: "No webhook URL configured for company" }),
        { 
          status: 400, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Get the generated social media posts for this queue item
    const { data: socialPosts, error: postsError } = await supabase
      .from("social_media_posts")
      .select("*")
      .eq("company_id", queueItem.company_id)
      .gte("created_at", queueItem.created_at);

    if (postsError) {
      logStep("Error fetching social posts", postsError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch social posts" }),
        { 
          status: 500, 
          headers: { ...corsHeaders, "Content-Type": "application/json" } 
        }
      );
    }

    // Build webhook payload
    const webhookPayload = {
      timestamp: new Date().toISOString(),
      event: "social_posts_generated",
      data: {
        queue_item: queueItem,
        social_posts: socialPosts.map(post => ({
          platform: post.platforms?.[0]?.platform || "unknown",
          content: post.content,
          hashtags: post.content.match(/#\w+/g) || [],
          media_urls: post.media_urls || [],
          optimal_length: post.content.length,
          post_type: post.content.length > 1000 ? "long" : post.content.length > 300 ? "medium" : "short",
          includes_url: post.content.includes("brikly.net")
        })),
        company_id: queueItem.company_id,
        trigger_type: "automated",
        routing: {
          by_platform: socialPosts.reduce((acc, post) => {
            const platform = post.platforms?.[0]?.platform || "unknown";
            if (!acc[platform]) acc[platform] = [];
            acc[platform].push({
              content: post.content,
              hashtags: post.content.match(/#\w+/g) || [],
              media_urls: post.media_urls || []
            });
            return acc;
          }, {}),
          by_length: {
            short: socialPosts.filter(p => p.content.length <= 300),
            medium: socialPosts.filter(p => p.content.length > 300 && p.content.length <= 1000),
            long: socialPosts.filter(p => p.content.length > 1000)
          }
        }
      }
    };

    logStep("Sending webhook payload", {
      webhook_url: config.webhook_url,
      posts_count: socialPosts.length,
      payload_size: JSON.stringify(webhookPayload).length
    });

    // Send webhook
    const webhookResponse = await fetch(config.webhook_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Brikly-Social-Webhook/1.0"
      },
      body: JSON.stringify(webhookPayload)
    });

    const webhookSuccess = webhookResponse.ok;
    const webhookResponseText = await webhookResponse.text();

    logStep("Webhook response received", {
      status: webhookResponse.status,
      ok: webhookSuccess,
      response_preview: webhookResponseText.substring(0, 200)
    });

    // Update queue item with webhook status
    const { error: updateError } = await supabase
      .from("automated_social_posts_queue")
      .update({
        webhook_sent: webhookSuccess,
        status: webhookSuccess ? "completed" : "failed",
        processed_at: new Date().toISOString(),
        posts_created: socialPosts.length,
        platforms_processed: [...new Set(socialPosts.map(p => p.platforms?.[0]?.platform).filter(Boolean))],
        error_message: webhookSuccess ? null : `Webhook failed: ${webhookResponse.status} - ${webhookResponseText}`
      })
      .eq("id", queueId);

    if (updateError) {
      logStep("Failed to update queue item", updateError);
    } else {
      logStep("Queue item updated successfully", {
        webhook_sent: webhookSuccess,
        posts_created: socialPosts.length
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        webhook_sent: webhookSuccess,
        webhook_status: webhookResponse.status,
        posts_deployed: socialPosts.length,
        queue_item_updated: !updateError
      }),
      { 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    const errorObj = error as Error;
    logStep("Social webhook deployer error", {
      error_message: errorObj.message,
      error_stack: errorObj.stack
    });

    return new Response(
      JSON.stringify({ 
        error: "Internal server error",
        details: errorObj.message 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );
  }
});