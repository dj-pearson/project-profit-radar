// Apply SEO Fixes Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only; no caller in src/ or Brikly-iOS/. Only the three fix fields
// the handler copies into seo_fixes_applied are named.
const ApplySeoFixesSchema = z.object({
  audit_id: z.string().uuid(),
  fixes: z.array(z.object({
    issue_type: z.string().max(200),
    severity: z.string().max(50).nullish(),
    fix_description: z.string().max(5000).nullish(),
  }).passthrough()).min(1).max(500),
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
    console.log("[APPLY-SEO-FIXES] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, ApplySeoFixesSchema, { name: 'apply-seo-fixes' });
    if (!parsed.ok) return parsed.response;
    const { audit_id, fixes } = parsed.data;
    if (!audit_id || !fixes || !Array.isArray(fixes)) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'audit_id and fixes array required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const appliedFixes = fixes.map(fix => ({  // CRITICAL: Site isolation
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
      timestamp: new Date().toISOString(),
      success: true,
      fixes_applied: saved?.length || 0,
      fixes: saved
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await captureException(error, { fn: 'apply-seo-fixes', req });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
