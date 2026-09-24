// Check Keyword Positions Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  estimateCtr,
  findDomainPosition,
  isSerpConfigured,
  mergeSavedPositions,
  serpNotConfiguredResponse,
  summarizePositions,
  toPositionRecord,
  toSerpPositionRow,
  type KeywordPosition,
} from '../_shared/keyword-positions.ts';
import { resolveSeoSiteId } from '../_shared/seo-site.ts';
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only. SEOManager.tsx sends { keywords, domain }, keywords being a
// comma-split of a free-text input, so an empty string in the array is normal.
const KeywordPositionsSchema = z.object({
  keywords: z.array(z.string().max(200)).min(1).max(100),
  domain: z.string().min(1).max(255),
  country: z.string().max(10).optional(),
  device: z.string().max(20).optional(),
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
    console.log("[CHECK-KEYWORD-POS] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, KeywordPositionsSchema, { name: 'check-keyword-positions' });
    if (!parsed.ok) return parsed.response;
    const { keywords, domain, country = 'us', device = 'desktop' } = parsed.data;
    if (!keywords || !Array.isArray(keywords) || keywords.length === 0) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Keywords array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!domain) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Domain required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // No simulated path (see _shared/keyword-positions.ts): without a key
    // there is nothing to measure, so say so instead of inventing rankings.
    const serpApiKey = Deno.env.get('SERP_API_KEY');
    if (!isSerpConfigured(serpApiKey)) {
      console.error('[CHECK-KEYWORD-POS] SERP_API_KEY is not set');
      return serpNotConfiguredResponse(corsHeaders);
    }

    const results: KeywordPosition[] = [];
    const failed: Array<{ keyword: string; error: string }> = [];

    for (const keyword of keywords) {
      if (!keyword.trim()) continue;
      try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(country)}&device=${encodeURIComponent(device)}&api_key=${serpApiKey}`;
        const serpResponse = await fetch(searchUrl);
        if (!serpResponse.ok) throw new Error(`SerpApi returned ${serpResponse.status}`);
        const serpData = await serpResponse.json();
        const { position, url } = findDomainPosition(serpData.organic_results, domain);
        results.push({ keyword, position, url, ctr: estimateCtr(position) });
      } catch (error) {
        // A failed lookup is not "not ranking". Leave it out of the saved rows
        // and report it, rather than storing a null position that reads as one.
        console.error('SERP API error:', error);
        failed.push({ keyword, error: error instanceof Error ? error.message : String(error) });
      }
    }

    if (results.length === 0 && failed.length === 0) {
      // Every entry was blank (SEOManager comma-splits a free-text input).
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Keywords array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (results.length === 0) {
      return new Response(JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: 'No keyword could be checked against the SERP API',
        failed,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // The response keeps the shape SEOManager reads (toPositionRecord); the
    // table gets the columns it actually has (toSerpPositionRow). Inserting
    // the display shape failed on every call: current_position, ranking_url,
    // domain, country and friends are not columns, and site_id was missing.
    const serpRecords = results.map((r) => toPositionRecord(r, { domain, country, device }));
    const siteId = await resolveSeoSiteId(supabaseClient, user.id);
    const serpRows = results.map((r) => toSerpPositionRow(r, { country, device, siteId }));

    const { data: saved, error: insertError } = await supabaseClient
      .from('seo_serp_positions')
      .insert(serpRows)
      .select();

    if (insertError) {
      console.error('Insert error:', insertError);
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      summary: summarizePositions(results),
      positions: mergeSavedPositions(serpRecords, insertError ? null : saved),
      failed,
      saved: !insertError,
      storage_error: insertError?.message ?? null,
      note: 'Live SERP data. Search volume and traffic are not reported by the SERP API and are left empty.'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await captureException(error, { fn: 'check-keyword-positions', req });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
