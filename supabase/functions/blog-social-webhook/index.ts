import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext } from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";

const logStep = (step: string, data?: any) => {
  console.log(`[BLOG Social Webhook] ${step}:`, data || "");
};

// Use existing container env vars for URL rewriting
const FRONTEND_URL = Deno.env.get("FRONTEND_URL") || "https://brikly.net";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "https://api.brikly.net";

/**
 * Rewrite any old Supabase storage URLs (*.supabase.co/storage/...)
 * to the public API domain (api.brikly.net/storage/...)
 */
function rewriteStorageUrls(text: string | null | undefined): string | null {
  if (!text) return null;
  // Match any <project-ref>.supabase.co/storage/... pattern
  return text.replace(
    /https?:\/\/[a-z0-9]+\.supabase\.co\/storage\//gi,
    `${SUPABASE_URL}/storage/`
  );
}

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Blog social webhook triggered");

    // Authenticate the caller. This function is invoked by the client SDK
    // (useSocialMediaAutomation) with the user's JWT, so we can verify the
    // caller actually belongs to the company_id they pass — previously it was
    // trusted blindly from the body and used with the service role, letting any
    // authenticated user trigger automation against ANY company (US-198).
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return new Response(
        JSON.stringify({ success: false, error: "Unauthorized", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 401 }
      );
    }

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const { blog_post_id, company_id, status } = await req.json();

    // Enforce that the caller owns the company_id from the body.
    const { data: callerProfile } = await supabaseClient
      .from("user_profiles")
      .select("company_id, role")
      .eq("id", authContext.user.id)
      .maybeSingle();

    const isRootAdmin = callerProfile?.role === "root_admin";
    if (!isRootAdmin && (!callerProfile?.company_id || callerProfile.company_id !== company_id)) {
      logStep("Cross-tenant company_id rejected", {
        callerCompany: callerProfile?.company_id,
        requestedCompany: company_id,
      });
      return new Response(
        JSON.stringify({ success: false, error: "Forbidden", timestamp: new Date().toISOString() }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 403 }
      );
    }

    logStep("Processing blog post", { blog_post_id, company_id, status });

    // Only process published posts
    if (status !== "published") {
      logStep("Post not published, skipping");
      return new Response(
        JSON.stringify({ success: true, message: "Post not published, skipping" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get automation config for this company
    const { data: config, error: configError } = await supabaseClient
      .from("automated_social_posts_config")
      .select("*")
      .eq("company_id", company_id)
      .eq("enabled", true)
      .maybeSingle();

    if (configError) {
      throw new Error(`Error fetching config: ${configError.message}`);
    }

    if (!config) {
      logStep("No active automation config found for company");
      return new Response(
        JSON.stringify({ success: true, message: "No active automation config" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    // Get blog post details
    const { data: blogPost, error: blogError } = await supabaseClient
      .from("blog_posts")
      .select("*")
      .eq("id", blog_post_id)
      .single();

    if (blogError) {
      throw new Error(`Error fetching blog post: ${blogError.message}`);
    }

    const results: any[] = [];

    // Call blog webhook if configured
    if (config.blog_webhook_url) {
      try {
        logStep("Calling blog webhook", config.blog_webhook_url);
        
        const blogUrl = `${FRONTEND_URL}/resources/${blogPost.slug}`;

        const webhookPayload = {
          event: "blog_published",
          blog_post: {
            id: blogPost.id,
            title: blogPost.title,
            slug: blogPost.slug,
            blog_url: blogUrl,
            excerpt: blogPost.excerpt,
            body: rewriteStorageUrls(blogPost.body),
            published_at: blogPost.published_at,
            featured_image_url: rewriteStorageUrls(blogPost.featured_image_url),
            seo_title: blogPost.seo_title,
            seo_description: blogPost.seo_description
          },
          company_id: company_id,
          timestamp: new Date().toISOString()
        };

        const webhookResponse = await fetch(config.blog_webhook_url, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(webhookPayload),
        });

        if (!webhookResponse.ok) {
          throw new Error(`Webhook failed: ${webhookResponse.status} ${webhookResponse.statusText}`);
        }

        const webhookResult = await webhookResponse.text();
        logStep("Blog webhook successful", webhookResult);

        results.push({
          type: "blog_webhook",
          success: true,
          url: config.blog_webhook_url,
          response: webhookResult
        });
      } catch (webhookError) {
        logStep("Blog webhook failed", webhookError);
        results.push({
          type: "blog_webhook",
          success: false,
          url: config.blog_webhook_url,
          error: webhookError instanceof Error ? webhookError.message : 'Unknown error'
        });
      }
    }

    // Also trigger the social post scheduler if auto_schedule is enabled
    if (config.auto_schedule) {
      try {
        logStep("Triggering social post scheduler");
        
        const { data: schedulerResult, error: schedulerError } = await supabaseClient.functions.invoke(
          "social-post-scheduler",
          {
            body: {
              manual_trigger: false,
              company_id: company_id,
              blog_trigger: true,
              blog_post_id: blog_post_id
            },
          }
        );

        if (schedulerError) {
          throw schedulerError;
        }

        logStep("Social post scheduler successful", schedulerResult);
        results.push({
          type: "social_scheduler",
          success: true,
          result: schedulerResult
        });
      } catch (schedulerError) {
        logStep("Social post scheduler failed", schedulerError);
        results.push({
          type: "social_scheduler",
          success: false,
          error: schedulerError instanceof Error ? schedulerError.message : 'Unknown error'
        });
      }
    }

    logStep("Blog social webhook completed", { results });

    return new Response(
      JSON.stringify({
        success: true,
        processed: results.length,
        results,
        blog_post: {
          id: blogPost.id,
          title: blogPost.title,
          status: blogPost.status
        }
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
};