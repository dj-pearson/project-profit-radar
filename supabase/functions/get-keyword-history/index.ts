import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { keyword_id, limit = 30 } = await req.json();

    if (!keyword_id) {
      // Get all keywords with latest position
      const { data: keywords } = await supabaseClient
        .from('seo_keywords')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);

      return new Response(JSON.stringify({
        success: true,
        keywords: keywords || [],
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    // Get history for specific keyword
    const { data: history } = await supabaseClient
      .from('seo_keyword_history')
      .select('*')
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
