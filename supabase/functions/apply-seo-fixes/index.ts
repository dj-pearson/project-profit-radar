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

    const { audit_id, fixes } = await req.json();
    if (!audit_id || !fixes || !Array.isArray(fixes)) {
      return new Response(JSON.stringify({ error: 'audit_id and fixes array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appliedFixes = fixes.map(fix => ({
      audit_id,
      issue_type: fix.issue_type,
      issue_severity: fix.severity,
      fix_description: fix.fix_description || `Applied fix for ${fix.issue_type}`,
      fix_type: 'automated',
      status: 'applied',
      applied_at: new Date().toISOString(),
      applied_by: user.id,
    }));

    const { data: saved, error: insertError } = await supabaseClient
      .from('seo_fixes_applied').insert(appliedFixes).select();

    if (insertError) throw insertError;

    return new Response(JSON.stringify({
      success: true,
      fixes_applied: saved?.length || 0,
      fixes: saved
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
