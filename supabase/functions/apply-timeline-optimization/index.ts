// Apply Timeline Optimization Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { planTimelineOptimizationApply } from '../_shared/timeline-optimization-apply.ts';
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// optimization_id is OPTIONAL on purpose: the only caller
// (TimelineOptimization.tsx) sends company_id and `optimizations` and never an
// optimization_id. See _shared/timeline-optimization-apply.ts for how each
// shape is handled.
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
    const plan = planTimelineOptimizationApply(parsed.data, user.id);

    if (plan.kind === 'invalid') {
      console.warn('[APPLY-TIMELINE-OPT] Nothing to apply', { userId: user.id });
      return errorResponse(plan.error, 400, req);
    }

    // User-scoped client: RLS ("Staff can manage timeline optimizations")
    // limits both writes to the caller's company; company_id is matched too.
    let applied = 0;
    if (plan.kind === 'update') {
      const { data, error: updateError } = await supabaseClient
        .from('timeline_optimizations')
        .update(plan.values)
        .eq('id', plan.id)
        .eq('company_id', parsed.data.company_id)
        .select('id');
      if (updateError) {
        throw new Error(`Failed to update optimization: ${updateError.message}`);
      }
      applied = data?.length ?? 0;
    } else {
      const { data, error: insertError } = await supabaseClient
        .from('timeline_optimizations')
        .insert(plan.rows)
        .select('id');
      if (insertError) {
        throw new Error(`Failed to record optimizations: ${insertError.message}`);
      }
      applied = data?.length ?? 0;
    }

    return new Response(JSON.stringify({
      success: true,
      data: { applied },
      timestamp: new Date().toISOString(),
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    await captureException(error, { fn: 'apply-timeline-optimization', req });
    console.error('Error applying timeline optimization:', error);
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error instanceof Error ? error.message : 'Unknown error' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});