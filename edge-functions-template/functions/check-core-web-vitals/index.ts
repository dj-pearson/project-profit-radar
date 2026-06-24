// Check Core Web Vitals Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CoreWebVitalsRequest {
  url: string;
  device_type?: 'mobile' | 'desktop';
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    console.log("[CHECK-CORE-WEB-VITALS] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: CoreWebVitalsRequest = await req.json();
    const { url, device_type = 'mobile' } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const pagespeedApiKey = Deno.env.get('PAGESPEED_INSIGHTS_API_KEY');
    if (!pagespeedApiKey) {
      return new Response(
        JSON.stringify({
          error: 'PageSpeed Insights API key not configured',
          message: 'Set PAGESPEED_INSIGHTS_API_KEY in Supabase secrets',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking Core Web Vitals for: ${url} (${device_type})`);

    const strategy = device_type === 'mobile' ? 'mobile' : 'desktop';
    const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${pagespeedApiKey}&strategy=${strategy}&category=PERFORMANCE`;

    const response = await fetch(pagespeedUrl);

    if (!response.ok) {
      throw new Error(`PageSpeed API error: ${response.statusText}`);
    }

    const data = await response.json();
    const lighthouse = data.lighthouseResult;
    const loadingExperience = data.loadingExperience;

    // Extract Core Web Vitals
    const metrics = lighthouse.audits.metrics.details.items[0];

    const lcp = metrics.largestContentfulPaint / 1000; // Convert to seconds
    const fid = metrics.maxPotentialFID || metrics.totalBlockingTime; // Use TBT as proxy for FID
    const cls = metrics.cumulativeLayoutShift;
    const fcp = metrics.firstContentfulPaint / 1000;
    const ttfb = metrics.timeToFirstByte || 0;
    const tti = metrics.interactive / 1000;
    const tbt = metrics.totalBlockingTime;
    const si = metrics.speedIndex / 1000;

    // Calculate scores
    const performanceScore = Math.round(lighthouse.categories.performance.score * 100);

    // LCP: Good < 2.5s, Needs Improvement < 4s, Poor >= 4s
    const lcpScore = lcp <= 2.5 ? 100 : lcp <= 4 ? 50 : 0;
    const lcpStatus = lcp <= 2.5 ? 'good' : lcp <= 4 ? 'needs_improvement' : 'poor';

    // FID: Good < 100ms, Needs Improvement < 300ms, Poor >= 300ms
    const fidScore = fid <= 100 ? 100 : fid <= 300 ? 50 : 0;
    const fidStatus = fid <= 100 ? 'good' : fid <= 300 ? 'needs_improvement' : 'poor';

    // CLS: Good < 0.1, Needs Improvement < 0.25, Poor >= 0.25
    const clsScore = cls <= 0.1 ? 100 : cls <= 0.25 ? 50 : 0;
    const clsStatus = cls <= 0.1 ? 'good' : cls <= 0.25 ? 'needs_improvement' : 'poor';

    const overallStatus = (lcpStatus === 'good' && fidStatus === 'good' && clsStatus === 'good') ? 'good' :
                         (lcpStatus === 'poor' || fidStatus === 'poor' || clsStatus === 'poor') ? 'poor' : 'needs_improvement';

    // Extract opportunities and diagnostics
    const opportunities = Object.entries(lighthouse.audits)
      .filter(([key, audit]: [string, any]) => audit.score !== null && audit.score < 1 && audit.details?.type === 'opportunity')
      .map(([key, audit]: [string, any]) => ({
        id: key,
        title: audit.title,
        description: audit.description,
        score: audit.score,
        savings_ms: audit.numericValue || 0,
      }));

    const diagnostics = Object.entries(lighthouse.audits)
      .filter(([key, audit]: [string, any]) => audit.score !== null && audit.score < 1 && audit.details?.type === 'table')
      .map(([key, audit]: [string, any]) => ({
        id: key,
        title: audit.title,
        description: audit.description,
        score: audit.score,
      }));

    // Prepare data for database with site isolation
    const vitalsData = {
      site_id: siteId,  // CRITICAL: Site isolation
      url,
      device_type,
      lcp,
      fid,
      cls,
      fcp,
      ttfb,
      tti,
      tbt,
      si,
      performance_score: performanceScore,
      lcp_score: lcpScore,
      fid_score: fidScore,
      cls_score: clsScore,
      lcp_status: lcpStatus,
      fid_status: fidStatus,
      cls_status: clsStatus,
      overall_status: overallStatus,
      data_source: 'lab',
      field_data: loadingExperience?.metrics || null,
      lab_data: metrics,
      origin_summary: loadingExperience?.origin_fallback ? null : loadingExperience,
      opportunities,
      diagnostics,
      lighthouse_version: lighthouse.lighthouseVersion,
      user_agent: lighthouse.userAgent,
    };

    // Save to database
    const { data: savedVitals, error: insertError } = await supabaseClient
      .from('seo_core_web_vitals')
      .insert(vitalsData)
      .select()
      .single();

    if (insertError) {
      console.error('Error saving Core Web Vitals:', insertError);
    }

    console.log(`Core Web Vitals check completed. Performance Score: ${performanceScore}/100`);

    return new Response(
      JSON.stringify({
        success: true,
        vitals: {
          ...vitalsData,
          id: savedVitals?.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Core Web Vitals Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
