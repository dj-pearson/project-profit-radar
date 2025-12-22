// CRON Social Scheduler Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const logStep = (step: string, data?: any) => {
  console.log(`[CRON Social Scheduler] ${step}:`, data || "");
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("CRON social scheduler started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    let totalProcessed = 0;
    const allResults: any[] = [];

    // Find all active configurations where it's time to post
    const { data: dueConfigs, error: configError } = await supabaseClient
      .from("automated_social_posts_config")
      .select("*")
      .eq("enabled", true)
      .eq("auto_schedule", true)
      .lt("next_post_at", new Date().toISOString());

    if (configError) {
      logStep("Error fetching configurations:", configError.message);
      return new Response(
        JSON.stringify({
          success: false,
          error: configError.message,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 500,
        }
      );
    }

    if (!dueConfigs || dueConfigs.length === 0) {
      logStep("No posts due");
      return new Response(
        JSON.stringify({
          success: true,
          message: "No posts due",
          processed: 0,
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        }
      );
    }

    logStep(`Found ${dueConfigs.length} configurations due`);

    for (const config of dueConfigs) {
      try {
        logStep(`Processing config for company ${config.company_id}`);

        // Use fetch to call the function directly since functions.invoke may not be available
        const functionUrl = `${Deno.env.get("SUPABASE_URL")}/functions/v1/social-post-scheduler`;
        const response = await fetch(functionUrl, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            company_id: config.company_id,
            manual_trigger: false, // This is a scheduled trigger
          }),
        });

        if (!response.ok) {
          throw new Error(`HTTP error! status: ${response.status}`);
        }

        const schedulerResult = await response.json();

        // Update config with next post time
        const nextPostTime = new Date();
        nextPostTime.setHours(
          nextPostTime.getHours() + config.post_interval_hours
        );

        await supabaseClient
          .from("automated_social_posts_config")
          .update({
            next_post_at: nextPostTime.toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("id", config.id);

        allResults.push({
          company_id: config.company_id,
          success: true,
          next_post_at: nextPostTime.toISOString(),
          scheduler_result: schedulerResult,
        });
        totalProcessed++;

        logStep(
          `Successfully processed config for company ${config.company_id}`
        );
      } catch (error) {
        logStep(
          `Error processing config for company ${config.company_id}`,
          error
        );
        allResults.push({
          company_id: config.company_id,
          success: false,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    logStep(`CRON scheduler completed, processed ${totalProcessed} configurations`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: totalProcessed,
        results: allResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", errorMessage);

    return new Response(
      JSON.stringify({
        error: errorMessage,
        success: false,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
