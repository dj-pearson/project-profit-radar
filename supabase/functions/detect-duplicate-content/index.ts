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

    const { url_1, url_2 } = await req.json();
    if (!url_1 || !url_2) {
      return new Response(JSON.stringify({ error: 'Two URLs required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const [response1, response2] = await Promise.all([
      fetch(url_1).then(r => r.text()),
      fetch(url_2).then(r => r.text())
    ]);

    const content1 = response1.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const content2 = response2.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

    // Simple similarity calculation
    const words1 = content1.toLowerCase().split(' ');
    const words2 = content2.toLowerCase().split(' ');
    const commonWords = words1.filter(w => words2.includes(w)).length;
    const similarity = (commonWords / Math.max(words1.length, words2.length)) * 100;

    const duplicateData = {
      url_1,
      url_2,
      similarity_score: Math.round(similarity * 100) / 100,
      duplicate_type: similarity > 90 ? 'exact' : similarity > 70 ? 'near' : 'different',
      duplicate_scope: similarity > 90 ? 'full_page' : 'section',
      severity: similarity > 90 ? 'high' : similarity > 70 ? 'medium' : 'low',
      recommended_action: similarity > 90 ? 'add_canonical' : 'review',
      is_resolved: false,
    };

    const { data: saved } = await supabaseClient
      .from('seo_duplicate_content').insert(duplicateData).select().single();

    return new Response(JSON.stringify({
      success: true,
      duplicate_analysis: saved || duplicateData
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
