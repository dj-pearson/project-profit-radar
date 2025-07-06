import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);

    const { company_id, optimizations } = await req.json();
    if (!company_id) throw new Error("Company ID is required");

    console.log(`[APPLY-OPTIMIZATION] Starting optimization for company ${company_id}`);

    // Apply optimizations to actual projects
    const updatePromises = optimizations.map(async (optimization: any) => {
      const { error } = await supabaseClient
        .from('projects')
        .update({
          start_date: optimization.optimizedStartDate,
          end_date: optimization.optimizedEndDate,
          updated_at: new Date().toISOString()
        })
        .eq('id', optimization.projectId)
        .eq('company_id', company_id);

      if (error) {
        console.error(`Failed to update project ${optimization.projectId}:`, error);
        throw error;
      }

      console.log(`Updated project ${optimization.projectName} with new timeline`);
    });

    await Promise.all(updatePromises);

    // Log the optimization application
    const { error: logError } = await supabaseClient
      .from('audit_logs')
      .insert({
        company_id: company_id,
        user_id: userData.user.id,
        action_type: 'update',
        resource_type: 'timeline_optimization',
        description: `Applied timeline optimizations to ${optimizations.length} projects`,
        metadata: {
          optimizationsApplied: optimizations.length,
          totalTimeSaved: optimizations.reduce((sum: number, opt: any) => sum + opt.timeSaved, 0)
        }
      });

    if (logError) {
      console.error('Failed to log optimization:', logError);
    }

    console.log(`[APPLY-OPTIMIZATION] Successfully applied ${optimizations.length} optimizations`);

    return new Response(JSON.stringify({
      success: true,
      message: `Successfully applied timeline optimizations to ${optimizations.length} projects`,
      optimizationsApplied: optimizations.length
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error('Apply optimization error:', error);
    return new Response(JSON.stringify({ 
      success: false,
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});