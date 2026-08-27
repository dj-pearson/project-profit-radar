import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "npm:zod@3";

const RedeploySchema = z.object({
  company_id: z.string().uuid(),
  topic: z.string().max(500).optional(),
  post_ids: z.array(z.string().uuid()).max(50).optional(),
  platforms_override: z.array(z.string().max(50)).max(20).optional(),
});

function log(step: string, data?: any) {
  console.log(`[Social Post Redeploy] ${step}:`, data ?? "");
}

async function sendToWebhook(url: string, payload: any) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "User-Agent": "Brikly-Social-Post-Redeploy/1.0",
    },
    body: JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "social_content_redeploy",
      data: payload,
    }),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Webhook failed: ${res.status} ${res.statusText} - ${text}`);
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // This handler had no authentication at all: it went straight from
    // req.json() to a service-role client filtered on the body's company_id.
    //
    // It is not in supabase/config.toml, so verify_jwt defaults to true - but
    // that only means "presents a valid project JWT", and the publishable anon
    // key IS one, and it ships in the client bundle. So anyone holding the anon
    // key could name any company_id, read that company's automated_social_posts
    // _config (including its webhook_url) and their last twelve social posts,
    // and fire their webhook. verify_jwt is not authentication.
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const parsed = await validateBody(req, RedeploySchema, { name: 'social-post-redeploy' });
    if (!parsed.ok) return parsed.response;
    const { company_id, topic, post_ids, platforms_override } = parsed.data;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // The caller may only redeploy their own company's posts. Derived from
    // their profile, never from the body - see
    // scripts/check-edge-privilege-writes.mjs.
    const { data: callerProfile, error: callerErr } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', authContext.user.id)
      .single();

    if (callerErr || !callerProfile?.company_id || callerProfile.company_id !== company_id) {
      return errorResponse('Not found', 404, req);
    }

    // Load webhook from config
    const { data: config, error: cfgErr } = await supabase
      .from("automated_social_posts_config")
      .select("webhook_url, platforms")
      .eq("company_id", company_id)
      .maybeSingle();

    if (cfgErr) throw cfgErr;
    if (!config?.webhook_url) {
      return new Response(
        JSON.stringify({ error: "No webhook_url configured for company" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Build selector for posts to redeploy
    let query = supabase
      .from("social_media_posts")
      .select("id, title, content, media_urls, platforms, created_at")
      .eq("company_id", company_id)
      .order("created_at", { ascending: false })
      .limit(12);

    if (Array.isArray(post_ids) && post_ids.length > 0) {
      query = query.in("id", post_ids);
    } else if (topic && typeof topic === "string") {
      query = query.ilike("title", `%${topic}%`);
    }

    const { data: posts, error: postsErr } = await query;
    if (postsErr) throw postsErr;

    if (!posts || posts.length === 0) {
      return new Response(
        JSON.stringify({ error: "No matching posts found to redeploy" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Map posts to platform payloads (one post per platform if available)
    const platformContents = posts.map((post) => {
      const platforms = Array.isArray(post.platforms)
        ? post.platforms
        : (() => {
            try { return JSON.parse(post.platforms as any) } catch { return [] }
          })();
      const platform = platforms?.[0]?.platform || "twitter";
      const media = Array.isArray(post.media_urls)
        ? post.media_urls
        : (() => {
            try { return JSON.parse(post.media_urls as any) } catch { return [] }
          })();

      return {
        platform,
        content: post.content,
        media_urls: media,
        optimal_length: 2800,
      };
    });

    // Optional platform override
    const filteredContents = Array.isArray(platforms_override) && platforms_override.length
      ? platformContents.filter((p) => platforms_override.includes(p.platform))
      : platformContents;

    log("Prepared platform contents", {
      count: filteredContents.length,
      sample: filteredContents.slice(0, 2),
    });

    const payload = {
      company_id,
      trigger_type: "redeploy",
      social_posts: filteredContents,
    };

    await sendToWebhook(config.webhook_url, payload);

    log("Redeploy webhook sent successfully");

    return new Response(
      JSON.stringify({ success: true, redeployed: filteredContents.length }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    log("ERROR", error);
    const message = error instanceof Error ? error.message : String(error);
    return new Response(JSON.stringify({ success: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
