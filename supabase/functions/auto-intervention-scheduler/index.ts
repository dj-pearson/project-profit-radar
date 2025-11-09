// Automated Intervention Scheduler
// Runs hourly to schedule automated interventions based on account health and trial status

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InterventionRule {
  type: string;
  condition: (health: any, company: any) => boolean;
  template: string;
  subject: string;
  getMessage: (company: any, health: any) => string;
}

const INTERVENTION_RULES: InterventionRule[] = [
  {
    type: "low_engagement_email",
    condition: (health, company) =>
      health.score < 40 &&
      health.risk_level === "critical" &&
      company.subscription_status !== "cancelled",
    template: "low_engagement",
    subject: "We noticed you haven't been active lately",
    getMessage: (company, health) =>
      `Hi ${company.name} team,\n\nWe noticed you haven't logged into BuildDesk recently. We're here to help you get the most out of the platform.\n\nWould you like to schedule a quick call to discuss your needs?\n\nBest regards,\nBuildDesk Team`,
  },
  {
    type: "trial_ending_high_engagement",
    condition: (health, company) => {
      if (company.subscription_status !== "trial" || !company.trial_end_date) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(company.trial_end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0 && health.score >= 70;
    },
    template: "trial_upgrade_offer",
    subject: "Your trial is ending soon - Special upgrade offer inside",
    getMessage: (company, health) => {
      const daysLeft = Math.floor(
        (new Date(company.trial_end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return `Hi ${company.name} team,\n\nWe're excited to see how actively you're using BuildDesk! Your trial expires in ${daysLeft} days.\n\nAs a thank you for being an engaged user, we're offering you 20% off your first 3 months.\n\nUpgrade now to keep all your data and continue building great projects.\n\nBest regards,\nBuildDesk Team`;
    },
  },
  {
    type: "trial_ending_low_engagement",
    condition: (health, company) => {
      if (company.subscription_status !== "trial" || !company.trial_end_date) return false;
      const daysUntilExpiry = Math.floor(
        (new Date(company.trial_end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return daysUntilExpiry <= 3 && daysUntilExpiry >= 0 && health.score < 50;
    },
    template: "trial_onboarding_help",
    subject: "Need help getting started with BuildDesk?",
    getMessage: (company, health) => {
      const daysLeft = Math.floor(
        (new Date(company.trial_end_date).getTime() - new Date().getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return `Hi ${company.name} team,\n\nYour trial expires in ${daysLeft} days, and we want to make sure you get the most out of BuildDesk.\n\nWould you like a personalized onboarding session? We'll help you:\n- Set up your first project\n- Import your team\n- Configure integrations\n- Answer any questions\n\nBook a free 30-minute session here: [link]\n\nBest regards,\nBuildDesk Team`;
    },
  },
  {
    type: "feature_adoption_help",
    condition: (health, company) =>
      health.feature_adoption_score < 30 &&
      company.subscription_status === "active",
    template: "feature_adoption",
    subject: "Unlock more value from BuildDesk",
    getMessage: (company, health) =>
      `Hi ${company.name} team,\n\nWe noticed you're only using a few of BuildDesk's features. There's so much more you can do!\n\nHere are some features that could help your team:\n- Real-time job costing\n- Mobile time tracking\n- QuickBooks integration\n- Document management\n\nWant a quick walkthrough? Reply to this email and we'll set it up.\n\nBest regards,\nBuildDesk Team`,
  },
  {
    type: "no_projects_week_one",
    condition: (health, company) => {
      const accountAge = Math.floor(
        (new Date().getTime() - new Date(company.created_at).getTime()) /
          (1000 * 60 * 60 * 24)
      );
      return (
        accountAge >= 7 &&
        accountAge <= 10 &&
        health.project_activity_score === 0
      );
    },
    template: "quick_start_guide",
    subject: "Quick Start: Create your first project in 5 minutes",
    getMessage: (company, health) =>
      `Hi ${company.name} team,\n\nWelcome to BuildDesk! We noticed you haven't created your first project yet.\n\nHere's a quick 5-minute video guide to get you started: [link]\n\nOr check out our Quick Start Guide: [link]\n\nNeed help? Just reply to this email!\n\nBest regards,\nBuildDesk Team`,
  },
  {
    type: "health_score_drop",
    condition: (health, company) =>
      health.trend === "down" &&
      health.score < 60 &&
      company.subscription_status === "active",
    template: "check_in",
    subject: "Everything okay with BuildDesk?",
    getMessage: (company, health) =>
      `Hi ${company.name} team,\n\nWe noticed your activity on BuildDesk has decreased recently. Is everything okay?\n\nWe're here to help if you're experiencing any issues or if something isn't working as expected.\n\nWould you like to schedule a quick call to discuss?\n\nBest regards,\nBuildDesk Team`,
  },
];

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("Running intervention scheduler...");

    // Get all companies with their latest health scores
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("*");

    if (companiesError) throw companiesError;

    const interventionsScheduled = [];

    for (const company of companies) {
      // Get latest health score
      const { data: health, error: healthError } = await supabase
        .from("account_health_scores")
        .select("*")
        .eq("company_id", company.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .single();

      if (healthError || !health) {
        console.log(`No health score for company ${company.id}, skipping`);
        continue;
      }

      // Check if we've already sent an intervention recently (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: recentInterventions } = await supabase
        .from("admin_interventions")
        .select("id")
        .eq("company_id", company.id)
        .gte("created_at", sevenDaysAgo.toISOString());

      if (recentInterventions && recentInterventions.length > 0) {
        console.log(`Recent intervention exists for ${company.id}, skipping`);
        continue;
      }

      // Check each rule
      for (const rule of INTERVENTION_RULES) {
        if (rule.condition(health, company)) {
          console.log(
            `Scheduling ${rule.type} intervention for company ${company.id}`
          );

          // Get admin email for the company
          const { data: adminUser } = await supabase
            .from("user_profiles")
            .select("id, email, first_name, last_name")
            .eq("company_id", company.id)
            .eq("role", "admin")
            .limit(1)
            .single();

          const message = rule.getMessage(company, health);

          // Schedule intervention
          const { error: insertError } = await supabase
            .from("admin_interventions")
            .insert({
              company_id: company.id,
              user_id: adminUser?.id,
              intervention_type: rule.type,
              trigger_reason: `Health score: ${health.score}, Risk: ${health.risk_level}, Trend: ${health.trend}`,
              template_used: rule.template,
              subject: rule.subject,
              message: message,
              status: "scheduled",
              scheduled_for: new Date().toISOString(),
              metadata: {
                health_score: health.score,
                risk_level: health.risk_level,
                trend: health.trend,
                to_email: adminUser?.email,
                to_name: `${adminUser?.first_name} ${adminUser?.last_name}`,
              },
            });

          if (!insertError) {
            interventionsScheduled.push({
              companyId: company.id,
              type: rule.type,
            });
          } else {
            console.error(
              `Error scheduling intervention for ${company.id}:`,
              insertError
            );
          }

          // Only trigger one intervention per company per run
          break;
        }
      }
    }

    console.log(
      `Scheduled ${interventionsScheduled.length} interventions`
    );

    return new Response(
      JSON.stringify({
        success: true,
        interventionsScheduled: interventionsScheduled.length,
        details: interventionsScheduled,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in auto-intervention-scheduler:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});
