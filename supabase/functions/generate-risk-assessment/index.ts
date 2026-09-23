// Generate Risk Assessment Edge Function
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { scoreProjectRisk } from '../_shared/risk-scoring.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The caller, src/components/analytics/RiskAssessment.tsx, sends
// { company_id: userProfile.company_id }. Reads and writes run on the
// caller's JWT client, so RLS scopes company_id.
const RiskAssessmentSchema = z.object({
  company_id: z.string().uuid(),
}).passthrough();

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GENERATE-RISK-ASSESSMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Risk assessment started");

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const parsed = await validateBody(req, RiskAssessmentSchema, { name: 'generate-risk-assessment' });
    if (!parsed.ok) return parsed.response;
    const { company_id } = parsed.data;
    if (!company_id) throw new Error("Company ID is required");

    logStep("Loading company data for risk analysis", {  company_id });

    // First get project IDs with site isolation
    const { data: projectIds } = await supabaseClient
      .from('projects')
      .select('id')
        // CRITICAL: Site isolation
      .eq('company_id', company_id);

    const projectIdList = projectIds?.map(p => p.id) || [];

    // Load comprehensive company data for risk analysis with site isolation
    const [
      { data: projects },
      { data: expenses },
      { data: changeOrders },
      { data: dailyReports }
    ] = await Promise.all([
      supabaseClient.from('projects').select('*')
          // CRITICAL: Site isolation
        .eq('company_id', company_id),
      supabaseClient.from('expenses').select('*')
          // CRITICAL: Site isolation
        .eq('company_id', company_id),
      supabaseClient.from('change_orders').select('*')
          // CRITICAL: Site isolation
        .in('project_id', projectIdList.length > 0 ? projectIdList : ['00000000-0000-0000-0000-000000000000']),
      supabaseClient.from('daily_reports').select('*')
          // CRITICAL: Site isolation
        .in('project_id', projectIdList.length > 0 ? projectIdList : ['00000000-0000-0000-0000-000000000000'])
    ]);

    const riskAnalysisPrompt = `
    Analyze the following construction company data and generate a comprehensive risk assessment:

    Company Overview:
    - Total Projects: ${projects?.length || 0}
    - Active Projects: ${projects?.filter(p => ['active', 'in_progress'].includes(p.status)).length || 0}
    - Total Expenses: $${expenses?.reduce((sum, e) => sum + (e.amount || 0), 0).toLocaleString() || 0}
    - Change Orders: ${changeOrders?.length || 0}
    - Daily Reports: ${dailyReports?.length || 0}

    Generate a JSON response with this structure:
    {
      "overallRiskScore": 65,
      "riskCategories": [
        {
          "category": "Budget",
          "score": 75,
          "level": "high",
          "description": "Budget overruns detected in 60% of active projects",
          "factors": ["Frequent change orders", "Material cost inflation", "Labor shortage impacts"]
        }
      ],
      "projectRisks": [
        {
          "projectId": "uuid",
          "projectName": "Project Name",
          "riskScore": 85,
          "topRisks": [
            {
              "type": "Budget Overrun",
              "severity": "high",
              "probability": 0.8,
              "impact": 9,
              "description": "Current spending 25% over budget",
              "mitigation": "Implement weekly budget reviews"
            }
          ]
        }
      ],
      "riskTrends": [
        {
          "period": "2024-01",
          "overallRisk": 60,
          "budgetRisk": 70,
          "scheduleRisk": 55,
          "qualityRisk": 45,
          "resourceRisk": 65
        }
      ],
      "recommendations": [
        {
          "priority": "high",
          "title": "Implement Budget Monitoring",
          "description": "Weekly budget reviews to catch overruns early",
          "actionItems": ["Set up automated alerts", "Weekly manager reviews"],
          "expectedImpact": "Reduce budget overruns by 30%"
        }
      ]
    }
    `;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4.1-2025-04-14',
        messages: [
          { role: 'system', content: 'You are a construction risk management expert. Provide detailed JSON risk assessments.' },
          { role: 'user', content: riskAnalysisPrompt }
        ],
        temperature: 0.2,
      }),
    });

    const aiResult = await response.json();
    const riskData = JSON.parse(aiResult.choices[0].message.content);

    // Enhance with real project data
    const enhancedRiskData = enhanceRiskDataWithProjects(riskData, projects || [], expenses || []);

    logStep("Risk assessment completed", {
      projectsAnalyzed: projects?.length || 0,
      riskCategories: enhancedRiskData.riskCategories?.length || 0
    });

    return new Response(JSON.stringify({ success: true, timestamp: new Date().toISOString(), ...enhancedRiskData }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in risk assessment", { message: errorMessage });
    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function enhanceRiskDataWithProjects(
  riskData: any,
  projects: any[],
  expenses: Array<{ project_id?: string | null; amount?: unknown }>,
): any {
  const activeProjects = projects.filter(p => ['active', 'in_progress'].includes(p.status));
  const now = new Date();

  // Scored from budget, spend, dates and percent complete (see
  // _shared/risk-scoring.ts). These were random 40-80 / 30-60 ranges.
  riskData.projectRisks = activeProjects.map(project => {
    const spent = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, e) => sum + (Number(e.amount) || 0), 0);
    return scoreProjectRisk(project, spent, now);
  });

  // No risk history is stored; this was twelve months of random scores.
  riskData.riskTrends = [];
  riskData.riskTrendsNote = 'Risk history is not recorded, so no trend is shown.';

  return riskData;
}
