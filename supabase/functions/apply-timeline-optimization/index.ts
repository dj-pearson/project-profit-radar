// Apply Timeline Optimization Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// optimization_id is OPTIONAL on purpose, and that is a finding rather than a
// preference: the only caller (TimelineOptimization.tsx) sends company_id and
// `optimizations` and never an optimization_id, so this update has been
// matching on id = undefined. Requiring it would log every real request.
const ApplyOptimizationSchema = z.object({
  optimization_id: z.string().uuid().optional(),
  company_id: z.string().uuid(),
  optimizations: z.unknown().optional(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[APPLY-TIMELINE-OPT] User authenticated", { userId: user.id });

    const parsed = await validateBody(req, ApplyOptimizationSchema, { name: 'apply-timeline-optimization' });
    if (!parsed.ok) return parsed.response;
    const { optimization_id, company_id } = parsed.data;

    // Update the optimization status to "applied" with site isolation
    const { error: updateError } = await supabaseClient
      .from('timeline_optimizations')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString()
      })
        // CRITICAL: Site isolation
      .eq('id', optimization_id)
      .eq('company_id', company_id);

    if (updateError) {
      throw new Error(`Failed to update optimization: ${updateError.message}`);
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error applying timeline optimization:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});