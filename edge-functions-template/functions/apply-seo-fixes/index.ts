// Apply SEO Fixes Edge Function
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
    console.log("[APPLY-SEO-FIXES] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id).single();

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
      site_id: siteId,  // CRITICAL: Site isolation
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
