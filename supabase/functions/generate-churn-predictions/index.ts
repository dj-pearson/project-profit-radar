// Generate Churn Predictions Edge Function
// Runs as cron job - processes all sites
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHURN-PREDICTIONS] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Get all active sites for multi-tenant processing
    const { data: sites, error: sitesError } = await supabaseClient
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (sitesError) throw sitesError;

    logStep("Processing churn predictions for sites", { siteCount: sites?.length || 0 });

    let predictionsGenerated = 0;
    let sitesProcessed = 0;

    // Process each site
    for (const site of sites || []) {
      logStep(`Processing site: ${site.key}`, { siteId: site.id });

      // Get all users with health scores for this site
      const { data: healthScores, error: healthError } = await supabaseClient
        .from("user_health_scores")
        .select(`
          *,
          user_profiles!inner(id, email, first_name, last_name)
        `)
        .eq("site_id", site.id);  // CRITICAL: Site isolation

      if (healthError) {
        logStep(`Error fetching health scores for site ${site.key}`, { error: healthError.message });
        continue;
      }

    for (const score of healthScores || []) {
      // Calculate churn probability based on multiple factors
      let churnProbability = 0;
      const contributingFactors: string[] = [];
      const recommendedInterventions: string[] = [];

      // Factor 1: Health Score (40% weight)
      const healthScoreFactor = (100 - score.health_score) * 0.4;
      churnProbability += healthScoreFactor;
      if (score.health_score < 60) {
        contributingFactors.push("Low health score");
        recommendedInterventions.push("Schedule 1-on-1 onboarding call");
      }

      // Factor 2: Days Since Login (30% weight)
      const loginFactor = Math.min(score.days_since_login || 0, 30) * 1.0; // Max 30 points
      churnProbability += loginFactor;
      if (score.days_since_login > 14) {
        contributingFactors.push("Inactive user (no recent login)");
        recommendedInterventions.push("Send re-engagement email");
      }
      if (score.days_since_login > 30) {
        recommendedInterventions.push("Offer premium feature trial");
      }

      // Factor 3: Active Projects (15% weight)
      const projectFactor = score.active_projects === 0 ? 15 : Math.max(0, 15 - score.active_projects * 3);
      churnProbability += projectFactor;
      if (score.active_projects === 0) {
        contributingFactors.push("No active projects");
        recommendedInterventions.push("Send project setup guide");
      }

      // Factor 4: Weekly Time Entries (15% weight)
      const timeEntryFactor = score.weekly_time_entries === 0 ? 15 : Math.max(0, 15 - score.weekly_time_entries);
      churnProbability += timeEntryFactor;
      if (score.weekly_time_entries === 0) {
        contributingFactors.push("No time tracking activity");
        recommendedInterventions.push("Demo time tracking features");
      }

      // Normalize to 0-100
      churnProbability = Math.min(100, Math.max(0, churnProbability));

      // Determine confidence level based on data completeness
      let confidenceLevel = "high";
      if (!score.days_since_login || score.active_projects === null) {
        confidenceLevel = "medium";
      }
      if (!score.weekly_time_entries && !score.team_size) {
        confidenceLevel = "low";
      }

      // Calculate predicted churn date (based on probability)
      const daysUntilChurn = Math.max(7, Math.round((100 - churnProbability) * 0.9)); // 7-90 days
      const predictedChurnDate = new Date();
      predictedChurnDate.setDate(predictedChurnDate.getDate() + daysUntilChurn);

      // Only create/update predictions for users with meaningful churn risk
      if (churnProbability >= 30 || contributingFactors.length > 0) {
        // Check if prediction already exists with site isolation
        const { data: existingPrediction } = await supabaseClient
          .from("churn_predictions")
          .select("id")
          .eq("site_id", site.id)  // CRITICAL: Site isolation
          .eq("user_id", score.user_id)
          .single();

        const predictionData = {
          site_id: site.id,  // CRITICAL: Site isolation
          user_id: score.user_id,
          churn_probability: Math.round(churnProbability),
          predicted_churn_date: predictedChurnDate.toISOString().split('T')[0],
          confidence_level: confidenceLevel,
          contributing_factors: contributingFactors,
          recommended_interventions: recommendedInterventions,
          prediction_date: new Date().toISOString().split('T')[0],
          model_version: "rule-based-v1.0",
        };

        if (existingPrediction) {
          // Update existing prediction with site isolation
          await supabaseClient
            .from("churn_predictions")
            .update(predictionData)
            .eq("site_id", site.id)  // CRITICAL: Site isolation
            .eq("id", existingPrediction.id);
        } else {
          // Insert new prediction
          await supabaseClient
            .from("churn_predictions")
            .insert(predictionData);
        }

        predictionsGenerated++;
      }
    }

      sitesProcessed++;
    }  // End of sites loop

    logStep("Churn predictions completed", { predictionsGenerated, sitesProcessed });

    return new Response(
      JSON.stringify({
        success: true,
        count: predictionsGenerated,
        sites_processed: sitesProcessed,
        message: `Generated ${predictionsGenerated} churn predictions across ${sitesProcessed} sites`,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error generating churn predictions:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
