// Analyze Images Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { checkRateLimit, rateLimitResponse, RATE_LIMITS } from '../_shared/rate-limiter.ts';
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
const AnalyzeImagesSchema = z.object({
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

    // Rate limit: 20 req/min per user for AI endpoints
    const serviceClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );
    const rlResult = await checkRateLimit(serviceClient, {
      identifier: user.id, endpoint: 'analyze-images', ...RATE_LIMITS.AI
    });
    if (!rlResult.allowed) return rateLimitResponse(rlResult, corsHeaders);

    // Check user role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, AnalyzeImagesSchema, { name: 'analyze-images' });
    if (!parsed.ok) return parsed.response;
    const { url } = parsed.data as z.infer<typeof AnalyzeImagesSchema>;
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();
    const imageMatches = html.matchAll(/<img([^>]*)>/gi);
    const images = [];

    for (const match of imageMatches) {
      const imgTag = match[0];
      const srcMatch = imgTag.match(/src=["']([^"']*)["']/i);
      const altMatch = imgTag.match(/alt=["']([^"']*)["']/i);
      const titleMatch = imgTag.match(/title=["']([^"']*)["']/i);

      if (srcMatch) {
        const imageUrl = new URL(srcMatch[1], url).href;
        images.push({            source_page_url: url,
          image_url: imageUrl,
          image_alt: altMatch ? altMatch[1] : null,
          image_title: titleMatch ? titleMatch[1] : null,
          has_alt_text: !!altMatch,
        });
      }
    }

    // Storing the analysis is the point of this function, and the error was
    // discarded - supabase-js returns it rather than throwing - so the response
    // reported a completed image audit while seo_image_analysis stayed empty
    // (US-300).
    let imagesStoreError: string | null = null;
    if (images.length > 0) {
      const { error: storeError } = await supabaseClient
        .from('seo_image_analysis')
        .insert(images);

      if (storeError) {
        imagesStoreError = storeError.message;
        console.error('[ANALYZE-IMAGES] Image analysis was NOT stored:', storeError.message);
      }
    }

    return new Response(JSON.stringify({
      success: true,
      stored: imagesStoreError === null,
      storage_error: imagesStoreError,
      summary: {
        total_images: images.length,
        images_with_alt: images.filter(i => i.has_alt_text).length,
        images_without_alt: images.filter(i => !i.has_alt_text).length,
      },
      images
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
