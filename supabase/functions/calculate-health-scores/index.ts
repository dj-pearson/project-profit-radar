// Calculate health scores for all companies
// Runs daily via cron job

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface Company {
  id: string;
  created_at: string;
  subscription_status: string;
}

interface UserProfile {
  id: string;
  last_login: string | null;
  is_active: boolean;
}

interface HealthScoreComponents {
  loginFrequency: number;
  featureAdoption: number;
  projectActivity: number;
  teamEngagement: number;
  supportScore: number;
  paymentHealth: number;
}

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

    console.log("Starting health score calculation...");

    // Get all companies
    const { data: companies, error: companiesError } = await supabase
      .from("companies")
      .select("*");

    if (companiesError) throw companiesError;

    console.log(`Processing ${companies.length} companies`);

    const results = [];

    for (const company of companies) {
      try {
        const healthScore = await calculateCompanyHealthScore(supabase, company);
        results.push({ companyId: company.id, success: true, score: healthScore.score });
      } catch (error) {
        console.error(`Error calculating health for company ${company.id}:`, error);
        results.push({ companyId: company.id, success: false, error: error.message });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`Completed: ${successCount}/${companies.length} successful`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: companies.length,
        successful: successCount,
        results,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Error in calculate-health-scores:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function calculateCompanyHealthScore(supabase: any, company: Company) {
  // Get all users for this company
  const { data: users, error: usersError } = await supabase
    .from("user_profiles")
    .select("id, last_login, is_active")
    .eq("company_id", company.id);

  if (usersError) throw usersError;

  // Get company settings to check enabled features
  const { data: settings } = await supabase
    .from("company_settings")
    .select("*")
    .eq("company_id", company.id)
    .single();

  // Get projects
  const { data: projects } = await supabase
    .from("projects")
    .select("id, status, updated_at")
    .eq("company_id", company.id);

  // Get recent activity (last 30 days)
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const { data: recentActivity } = await supabase
    .from("user_activity_timeline")
    .select("user_id")
    .eq("company_id", company.id)
    .gte("timestamp", thirtyDaysAgo.toISOString());

  // Get support tickets (last 30 days)
  const { data: supportTickets } = await supabase
    .from("support_tickets")
    .select("id, status")
    .eq("company_id", company.id)
    .gte("created_at", thirtyDaysAgo.toISOString());

  // Calculate component scores
  const components = {
    loginFrequency: calculateLoginFrequencyScore(users || []),
    featureAdoption: calculateFeatureAdoptionScore(settings, recentActivity || []),
    projectActivity: calculateProjectActivityScore(projects || []),
    teamEngagement: calculateTeamEngagementScore(users || [], recentActivity || []),
    supportScore: calculateSupportScore(supportTickets || []),
    paymentHealth: calculatePaymentHealthScore(company),
  };

  // Calculate overall health score (weighted average)
  const overallScore = Math.round(
    components.loginFrequency * 0.25 +
    components.featureAdoption * 0.20 +
    components.projectActivity * 0.20 +
    components.teamEngagement * 0.15 +
    components.supportScore * 0.10 +
    components.paymentHealth * 0.10
  );

  // Determine trend (compare with previous score)
  const { data: previousScore } = await supabase
    .from("account_health_scores")
    .select("score")
    .eq("company_id", company.id)
    .order("created_at", { ascending: false })
    .limit(1)
    .single();

  let trend: 'up' | 'down' | 'stable' = 'stable';
  if (previousScore) {
    const diff = overallScore - previousScore.score;
    if (diff > 5) trend = 'up';
    else if (diff < -5) trend = 'down';
  }

  // Determine risk level
  let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
  if (overallScore < 30) riskLevel = 'critical';
  else if (overallScore < 50) riskLevel = 'high';
  else if (overallScore < 70) riskLevel = 'medium';

  // Insert new health score
  const { error: insertError } = await supabase
    .from("account_health_scores")
    .insert({
      company_id: company.id,
      score: overallScore,
      login_frequency_score: components.loginFrequency,
      feature_adoption_score: components.featureAdoption,
      project_activity_score: components.projectActivity,
      team_engagement_score: components.teamEngagement,
      support_score: components.supportScore,
      payment_health_score: components.paymentHealth,
      trend,
      risk_level: riskLevel,
    });

  if (insertError) throw insertError;

  return {
    score: overallScore,
    components,
    trend,
    riskLevel,
  };
}

function calculateLoginFrequencyScore(users: UserProfile[]): number {
  if (users.length === 0) return 0;

  const now = new Date();
  let totalScore = 0;

  for (const user of users) {
    if (!user.last_login) {
      totalScore += 0; // Never logged in
      continue;
    }

    const lastLogin = new Date(user.last_login);
    const daysSinceLogin = Math.floor((now.getTime() - lastLogin.getTime()) / (1000 * 60 * 60 * 24));

    if (daysSinceLogin <= 1) totalScore += 100; // Daily user
    else if (daysSinceLogin <= 7) totalScore += 70; // Weekly user
    else if (daysSinceLogin <= 30) totalScore += 40; // Monthly user
    else totalScore += 10; // Inactive
  }

  return Math.round(totalScore / users.length);
}

function calculateFeatureAdoptionScore(settings: any, recentActivity: any[]): number {
  if (!settings) return 50; // Default if no settings

  // Count enabled features
  const enabledFeatures = [
    settings.enable_project_management,
    settings.enable_time_tracking,
    settings.enable_financial_management,
    settings.enable_document_management,
    settings.enable_crm,
    settings.enable_safety_management,
    settings.enable_mobile_access,
    settings.enable_reporting,
  ].filter(Boolean).length;

  if (enabledFeatures === 0) return 0;

  // Count actually used features (simplified - would need more detailed activity tracking)
  const usedFeatures = new Set(
    recentActivity
      .map((a) => a.action_details?.feature)
      .filter(Boolean)
  ).size;

  const adoptionRate = (usedFeatures / enabledFeatures) * 100;
  return Math.min(100, Math.round(adoptionRate));
}

function calculateProjectActivityScore(projects: any[]): number {
  if (projects.length === 0) return 0;

  const activeProjects = projects.filter((p) => p.status === 'in_progress' || p.status === 'active').length;

  // Check for recent updates (last 7 days)
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  const recentlyUpdated = projects.filter(
    (p) => new Date(p.updated_at) > sevenDaysAgo
  ).length;

  // Score based on activity and recent updates
  const activityRate = (activeProjects / projects.length) * 60;
  const updateRate = (recentlyUpdated / projects.length) * 40;

  return Math.round(activityRate + updateRate);
}

function calculateTeamEngagementScore(users: UserProfile[], recentActivity: any[]): number {
  if (users.length === 0) return 0;

  const activeUsers = new Set(recentActivity.map((a) => a.user_id));
  const engagementRate = (activeUsers.size / users.length) * 100;

  return Math.round(engagementRate);
}

function calculateSupportScore(tickets: any[]): number {
  if (tickets.length === 0) return 100; // No tickets = good

  const openTickets = tickets.filter((t) => t.status === 'open' || t.status === 'in_progress').length;

  // More tickets = lower score
  if (tickets.length > 10) return 20;
  if (tickets.length > 5) return 40;

  // Open tickets reduce score more
  if (openTickets > 5) return 30;
  if (openTickets > 2) return 60;
  if (openTickets > 0) return 80;

  return 100;
}

function calculatePaymentHealthScore(company: Company): number {
  // Active subscription = 100
  if (company.subscription_status === 'active') return 100;

  // Trial = 70 (not bad, but needs conversion)
  if (company.subscription_status === 'trial') return 70;

  // Expired/cancelled = 0
  return 0;
}
