// Generate Performance Benchmarks Edge Function
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts'
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { buildHistoricalTrends, type HistoryProject } from '../_shared/benchmark-history.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The caller, src/components/analytics/PerformanceBenchmarking.tsx, sends
// { company_id: userProfile.company_id }. Reads and writes run on the
// caller's JWT client, so RLS scopes company_id.
const PerformanceBenchmarksSchema = z.object({
  company_id: z.string().uuid(),
}).passthrough();

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openaiApiKey = Deno.env.get('OPENAI_API_KEY');

    if (!openaiApiKey) {
      throw new Error('OpenAI API key not configured');
    }

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase } = authContext;
    console.log('[GENERATE-PERFORMANCE-BENCHMARKS] User authenticated', { userId: user.id });

    const parsed = await validateBody(req, PerformanceBenchmarksSchema, { name: 'generate-performance-benchmarks' });
    if (!parsed.ok) return parsed.response;
    const { company_id } = parsed.data;
    if (!company_id) {
      throw new Error('Company ID is required');
    }

    console.log('Generating performance benchmarks for company:', {  company_id });

    // Get company and project data with site isolation
    const { data: company } = await supabase
      .from('companies')
      .select('*')
        // CRITICAL: Site isolation
      .eq('id', company_id)
      .single();

    const { data: projects } = await supabase
      .from('projects')
      .select('*')
        // CRITICAL: Site isolation
      .eq('company_id', company_id);

    const { data: expenses } = await supabase
      .from('expenses')
      .select('*')
        // CRITICAL: Site isolation
      .eq('company_id', company_id);

    // Calculate company metrics
    const metrics = calculatePerformanceMetrics(projects || [], expenses || []);
    console.log('Calculated metrics:', metrics);

    // Generate industry benchmarks using AI
    const prompt = `You are a construction industry analyst. Based on the following company data, generate realistic industry benchmarks and competitive analysis.

Company Profile:
- Name: ${company?.name || 'Construction Company'}
- Size: ${projects?.length || 0} projects
- Performance Metrics: ${JSON.stringify(metrics, null, 2)}

Please provide a JSON response with the following structure:
{
  "industryComparison": {
    "avgProfitMargin": 15.2,
    "avgCompletionRate": 89.5,
    "avgBudgetVariance": 8.3,
    "avgSafetyIncidents": 2.1,
    "avgClientSatisfaction": 4.2,
    "avgProductivity": 85.7
  },
  "performanceMetrics": [
    {
      "metric": "Project Success Rate",
      "current": ${metrics.successRate},
      "target": 95,
      "benchmark": 89,
      "trend": "up"
    },
    {
      "metric": "Profit Margin",
      "current": ${metrics.profitMargin},
      "target": 20,
      "benchmark": 15.2,
      "trend": "stable"
    },
    {
      "metric": "Budget Variance",
      "current": ${Math.abs(metrics.budgetVariance)},
      "target": 5,
      "benchmark": 8.3,
      "trend": "down"
    }
  ],
  "competitiveAnalysis": {
    "marketPosition": null,
    "strengths": ["Strong project completion rate", "Effective cost management"],
    "weaknesses": ["Safety incident frequency", "Client communication"],
    "opportunities": ["Digital transformation", "Specialized services"],
    "threats": ["Increased competition", "Material cost inflation"]
  },
  "historicalTrends": [
    { "month": "Jan", "performance": ${Math.max(0, metrics.successRate - 10)}, "industry": 89 },
    { "month": "Feb", "performance": ${Math.max(0, metrics.successRate - 5)}, "industry": 90 },
    { "month": "Mar", "performance": ${metrics.successRate}, "industry": 89 }
  ],
  "improvementOpportunities": [
    {
      "area": "Safety Management",
      "currentScore": null,
      "potentialScore": 95,
      "impact": "high",
      "difficulty": "medium",
      "actions": ["Implement digital safety reporting", "Enhanced training programs"]
    },
    {
      "area": "Cost Control",
      "currentScore": null,
      "potentialScore": 92,
      "impact": "high",
      "difficulty": "low",
      "actions": ["Real-time budget tracking", "Automated expense categorization"]
    }
  ],
  "kpiDashboard": {
    "overallScore": null,
    "categories": [
      { "name": "Financial", "score": null, "trend": "up" },
      { "name": "Operational", "score": null, "trend": "stable" },
      { "name": "Safety", "score": null, "trend": "up" },
      { "name": "Quality", "score": null, "trend": "down" }
    ]
  }
}

Ensure all numbers are realistic for the construction industry and consistent with the company's actual performance data.
The company data above does not determine marketPosition, currentScore, overallScore or the category scores. Leave them null unless the metrics above support a specific value; do not invent them.`;

    // Call OpenAI API
    const openaiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openaiApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are a construction industry analyst. Provide accurate, realistic benchmark data in valid JSON format.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 2000,
      }),
    });

    if (!openaiResponse.ok) {
      throw new Error(`OpenAI API error: ${openaiResponse.status}`);
    }

    const openaiData = await openaiResponse.json();
    const benchmarkData = JSON.parse(openaiData.choices[0].message.content);

    // Enhance with actual company metrics
    const enhancedBenchmarks = enhanceBenchmarkData(benchmarkData, metrics, company, projects || []);

    // Store in database with site isolation
    const { data: savedBenchmark, error: saveError } = await supabase
      .from('performance_benchmarks')
      .insert({  // CRITICAL: Site isolation
        company_id,
        benchmark_period: 'quarterly',
        period_start: new Date(new Date().getFullYear(), Math.floor(new Date().getMonth() / 3) * 3, 1).toISOString().split('T')[0],
        period_end: new Date().toISOString().split('T')[0],
        company_profit_margin: metrics.profitMargin,
        company_project_completion_rate: metrics.successRate,
        company_budget_variance: metrics.budgetVariance,
        company_safety_incidents: 0,
        company_client_satisfaction: 4.5,
        company_employee_productivity: metrics.onTimeRate,
        industry_avg_profit_margin: enhancedBenchmarks.industryComparison.avgProfitMargin,
        industry_avg_completion_rate: enhancedBenchmarks.industryComparison.avgCompletionRate,
        industry_avg_budget_variance: enhancedBenchmarks.industryComparison.avgBudgetVariance,
        industry_avg_safety_incidents: enhancedBenchmarks.industryComparison.avgSafetyIncidents,
        industry_avg_client_satisfaction: enhancedBenchmarks.industryComparison.avgClientSatisfaction,
        industry_avg_productivity: enhancedBenchmarks.industryComparison.avgProductivity,
        top_performer_profit_margin: enhancedBenchmarks.industryComparison.avgProfitMargin * 1.3,
        top_performer_completion_rate: 95,
        top_performer_budget_variance: 3,
        top_performer_safety_incidents: 0,
        top_performer_client_satisfaction: 4.8,
        top_performer_productivity: 95,
        market_position_percentile: enhancedBenchmarks.competitiveAnalysis.marketPosition,
        areas_for_improvement: enhancedBenchmarks.improvementOpportunities,
        competitive_advantages: enhancedBenchmarks.competitiveAnalysis.strengths,
        company_size_category: (projects?.length || 0) > 20 ? 'large' : (projects?.length || 0) > 5 ? 'medium' : 'small',
        geographic_region: 'North America'
      })
      .select()
      .single();

    if (saveError) {
      console.error('Error saving benchmark:', saveError);
    }

    return new Response(
      JSON.stringify({ success: true, timestamp: new Date().toISOString(), ...enhancedBenchmarks }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );

  } catch (error) {
    console.error('Error generating performance benchmarks:', error);
    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json' 
        } 
      }
    );
  }
});

function calculatePerformanceMetrics(projects: any[], expenses: any[]): any {
  const completedProjects = projects.filter(p => p.status === 'completed');
  const totalProjects = projects.length || 1;
  
  const successRate = (completedProjects.length / totalProjects) * 100;
  
  const totalRevenue = projects.reduce((sum, p) => sum + (p.budget || 0), 0);
  const totalExpenses = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);
  const profitMargin = totalRevenue > 0 ? ((totalRevenue - totalExpenses) / totalRevenue) * 100 : 0;
  
  const avgCompletionTime = calculateAverageCompletionTime(completedProjects);
  const onTimeRate = calculateOnTimeRate(completedProjects);
  const budgetVariance = calculateBudgetVariance(projects, expenses);
  
  return {
    successRate: Math.round(successRate * 10) / 10,
    profitMargin: Math.round(profitMargin * 10) / 10,
    avgCompletionTime,
    totalRevenue,
    onTimeRate: Math.round(onTimeRate * 10) / 10,
    budgetVariance: Math.round(budgetVariance * 10) / 10
  };
}

function calculateAverageCompletionTime(completedProjects: any[]): number {
  if (completedProjects.length === 0) return 0;
  
  const completionTimes = completedProjects
    .filter(p => p.start_date && p.end_date)
    .map(p => {
      const start = new Date(p.start_date);
      const end = new Date(p.end_date);
      return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    });
    
  return completionTimes.length > 0 
    ? Math.round(completionTimes.reduce((sum, time) => sum + time, 0) / completionTimes.length)
    : 0;
}

function calculateOnTimeRate(completedProjects: any[]): number {
  if (completedProjects.length === 0) return 0;
  
  const onTimeProjects = completedProjects.filter(p => {
    if (!p.planned_end_date || !p.end_date) return false;
    const planned = new Date(p.planned_end_date);
    const actual = new Date(p.end_date);
    return actual <= planned;
  });
  
  return (onTimeProjects.length / completedProjects.length) * 100;
}

function calculateBudgetVariance(projects: any[], expenses: any[]): number {
  if (projects.length === 0) return 0;
  
  const projectVariances = projects.map(project => {
    const budget = project.budget || 0;
    const projectExpenses = expenses
      .filter(e => e.project_id === project.id)
      .reduce((sum, e) => sum + (e.amount || 0), 0);
    
    return budget > 0 ? ((projectExpenses - budget) / budget) * 100 : 0;
  });
  
  return projectVariances.length > 0
    ? projectVariances.reduce((sum, variance) => sum + variance, 0) / projectVariances.length
    : 0;
}

function enhanceBenchmarkData(benchmarkData: any, metrics: any, company: any, projects: HistoryProject[]): any {
  // Update benchmark data with actual company metrics
  benchmarkData.performanceMetrics = benchmarkData.performanceMetrics.map((metric: any) => {
    if (metric.metric === 'Project Success Rate') {
      metric.current = metrics.successRate;
    } else if (metric.metric === 'Profit Margin') {
      metric.current = metrics.profitMargin;
    } else if (metric.metric === 'Budget Variance') {
      metric.current = Math.abs(metrics.budgetVariance);
    }
    return metric;
  });

  // Twelve months of completion rate computed from the company's own
  // projects (see _shared/benchmark-history.ts). This was successRate plus
  // random noise, and a random "industry" line, saved and charted as history.
  benchmarkData.historicalTrends = buildHistoricalTrends(
    projects,
    benchmarkData.industryComparison?.avgCompletionRate,
    new Date(),
  );

  // Enhance competitive analysis with company-specific insights
  benchmarkData.competitiveAnalysis.companyName = company?.name || 'Your Company';
  
  return benchmarkData;
}