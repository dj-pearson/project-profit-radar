// Check Mobile First Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    console.log("[CHECK-MOBILE-FIRST] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url } = await req.json();
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

    const mobileData = {
      site_id: siteId,  // CRITICAL: Site isolation
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

    const { data: saved } = await supabaseClient
      .from('seo_mobile_analysis').insert(mobileData).select().single();

    return new Response(JSON.stringify({ success: true, mobile_analysis: saved || mobileData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
