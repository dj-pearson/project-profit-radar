// Apply Timeline Optimization Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const { optimization_id, company_id } = await req.json();

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