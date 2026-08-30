// Check Mobile First Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

import { validateBody } from "../_shared/validate-body.ts";
import { auditUrl } from "../_shared/audit-url.ts";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// US-241. The URL below is fetched by this function. It used to arrive from the
// request body with nothing but an `if (!url)` check, so the caller decided what
// the edge runtime connected to - and the edge runtime holds the service-role
// key. auditUrl is the shared definition of a fetchable target (see
// _shared/audit-url.ts); it rejects non-http schemes, embedded credentials, and
// loopback/private/link-local hosts. All twelve callers of that helper are
// root_admin-gated, so this is hardening rather than an open hole, and it does
// not reject anything until INPUT_VALIDATION_MODE=enforce.
const MobileFirstSchema = z.object({
  url: auditUrl,
});

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[CHECK-MOBILE-FIRST] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, MobileFirstSchema, { name: 'check-mobile-first' });
    if (!parsed.ok) return parsed.response;
    const { url } = parsed.data as z.infer<typeof MobileFirstSchema>;
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();

    // Check viewport meta tag
    const viewportMatch = html.match(/<meta[^>]*name=["']viewport["'][^>]*content=["']([^"']*)["']/i);
    const hasViewport = !!viewportMatch;
    const viewportConfig = viewportMatch ? viewportMatch[1] : null;

    // Check responsive design indicators
    const hasMediaQueries = html.includes('@media');
    const isResponsive = hasViewport && hasMediaQueries;

    const mobileData = {  // CRITICAL: Site isolation
      url,
      is_mobile_friendly: isResponsive,
      mobile_friendly_score: isResponsive ? 90 : 40,
      has_viewport_meta: hasViewport,
      viewport_config: viewportConfig,
      is_responsive: isResponsive,
      mobile_usability_score: isResponsive ? 85 : 45,
      mobile_performance_score: 75,
      mobile_seo_score: isResponsive ? 80 : 50,
    };

    // The insert's error was discarded and supabase-js returns it rather than
    // throwing. The `saved || <data>` fallback below then hid the consequence
    // perfectly: when the insert failed, `saved` was null and the response fell
    // back to the in-memory object, so the caller received what looked like a
    // stored analysis record while the table it is supposed to live in stayed
    // empty (US-300). The computed analysis is still returned - one caller uses
    // it inline - but `stored` now says whether it was persisted.
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_mobile_analysis').insert(mobileData).select().single();

    if (saveError) {
      console.error(
        '[CHECK-MOBILE-FIRST] Analysis completed but was NOT stored:',
        saveError.message,
      );
    }

    return new Response(JSON.stringify({ success: true, mobile_analysis: saved || mobileData, stored: !saveError, storage_error: saveError?.message ?? null }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
