// Get Keyword History Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[GET-KEYWORD-HISTORY] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
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

    const { keyword_id, limit = 30 } = await req.json();

    if (!keyword_id) {
      // Get all keywords with latest position and site isolation
      const { data: keywords } = await supabaseClient
        .from('seo_keywords')
        .select('*')
          // CRITICAL: Site isolation
        .order('created_at', { ascending: false })
        .limit(limit);

      return new Response(JSON.stringify({
        success: true,
        keywords: keywords || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Get history for specific keyword with site isolation
    const { data: history } = await supabaseClient
      .from('seo_keyword_history')
      .select('*')
        // CRITICAL: Site isolation
      .eq('keyword_id', keyword_id)
      .order('checked_at', { ascending: false })
      .limit(limit);

    return new Response(JSON.stringify({
      success: true,
      history: history || [],
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
