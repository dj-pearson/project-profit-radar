// Get Crawl Results Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only. SEOManager.tsx sends { limit: 50 }; base_url filters.
const CrawlResultsSchema = z.object({
  base_url: z.string().max(2048).nullish(),
  limit: z.number().int().positive().max(1000).optional(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[GET-CRAWL-RESULTS] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, CrawlResultsSchema, { name: 'get-crawl-results' });
    if (!parsed.ok) return parsed.response;
    const { base_url, limit = 100 } = parsed.data;

    let query = supabaseClient
      .from('seo_crawl_results')
      .select('*')
        // CRITICAL: Site isolation
      .order('crawled_at', { ascending: false })
      .limit(limit);

    if (base_url) {
      query = query.ilike('url', `${base_url}%`);
    }

    const { data: pages, error: fetchError } = await query;

    if (fetchError) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: fetchError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      pages: pages || [],
      total: pages?.length || 0,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await captureException(error, { fn: 'get-crawl-results', req });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
