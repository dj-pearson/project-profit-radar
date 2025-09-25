import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CompanyMetrics {
  revenue: number;
  teamSize: number;
  projectCount: number;
  averageProjectValue: number;
  currentStage: string;
}

interface ScalingRecommendation {
  category: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  estimatedImpact: string;
  timeframe: string;
  investment: string;
  actionItems: Array<{
    action: string;
    timeframe: string;
    responsible: string;
    success_metric: string;
  }>;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      'https://ilhzuvemiuyfuxfegtlv.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s',
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (authHeader) {
      const { data: { user }, error } = await supabaseClient.auth.getUser(authHeader.replace('Bearer ', ''));
      if (error || !user) {
        return new Response('Unauthorized', { status: 401, headers: corsHeaders });
      }
      supabaseClient.auth.setSession({ access_token: authHeader.replace('Bearer ', ''), refresh_token: '' });
    }

    const { company_id, current_metrics } = await req.json();

    console.log('Generating scaling plan for company:', company_id);

    // Fetch company profile and current data
    const { data: profile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', (await supabaseClient.auth.getUser()).data.user?.id)
      .single();

    if (profileError || !profile) {
      return new Response('Company profile not found', { status: 404, headers: corsHeaders });
    }

    // Get existing scaling guidance
    const { data: guidance, error: guidanceError } = await supabaseClient
      .from('scaling_guidance')
      .select('*')
      .eq('is_active', true)
      .order('priority_score', { ascending: false });

    if (guidanceError) {
      console.error('Error fetching guidance:', guidanceError);
      return new Response('Error fetching guidance', { status: 500, headers: corsHeaders });
    }

    // Analyze company metrics and generate personalized recommendations
    const recommendations = generateScalingRecommendations(current_metrics, guidance || []);

    // Create scaling assessment
    const assessmentData = {
      company_id: profile.company_id,
      assessment_type: 'operational_capacity',
      current_score: calculateOverallScore(current_metrics),
      target_score: calculateTargetScore(current_metrics),
      assessment_data: current_metrics,
      recommendations: recommendations,
      priority_level: determinePriorityLevel(recommendations),
      status: 'completed',
      completed_at: new Date().toISOString()
    };

    const { data: assessment, error: assessmentError } = await supabaseClient
      .from('scaling_assessments')
      .insert(assessmentData)
      .select()
      .single();

    if (assessmentError) {
      console.error('Error creating assessment:', assessmentError);
      return new Response('Error creating assessment', { status: 500, headers: corsHeaders });
    }

    // Generate scaling milestones
    const milestones = generateScalingMilestones(current_metrics, profile.company_id);
    
    if (milestones.length > 0) {
      const { error: milestonesError } = await supabaseClient
        .from('scaling_milestones')
        .insert(milestones);

      if (milestonesError) {
        console.error('Error creating milestones:', milestonesError);
      }
    }

    return new Response(JSON.stringify({
      assessment,
      recommendations,
      milestones,
      success: true
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in generate-scaling-plan function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function generateScalingRecommendations(metrics: CompanyMetrics, guidance: any[]): ScalingRecommendation[] {
  const recommendations: ScalingRecommendation[] = [];
  
  // Determine company size category
  const companySize = metrics.teamSize <= 10 ? 'small' : 
                     metrics.teamSize <= 50 ? 'medium' : 'large';

  // Filter relevant guidance based on company size
  const relevantGuidance = guidance.filter(g => 
    g.applicable_company_size === companySize || g.applicable_company_size === 'general'
  );

  // Team expansion recommendations
  if (metrics.projectCount > metrics.teamSize * 2) {
    recommendations.push({
      category: 'team_expansion',
      title: 'Expand Core Team',
      description: 'Your project-to-team ratio suggests capacity constraints. Consider strategic hiring.',
      priority: 'high',
      estimatedImpact: '30-50% capacity increase',
      timeframe: '3-6 months',
      investment: '$50,000-$150,000',
      actionItems: [
        {
          action: 'Hire experienced project manager',
          timeframe: '30 days',
          responsible: 'HR/Admin',
          success_metric: 'Reduced project manager workload by 40%'
        },
        {
          action: 'Add 2-3 skilled tradespeople',
          timeframe: '60 days',
          responsible: 'Operations',
          success_metric: 'Handle 25% more concurrent projects'
        }
      ]
    });
  }

  // Financial planning recommendations
  if (metrics.averageProjectValue > metrics.revenue * 0.3) {
    recommendations.push({
      category: 'financial_planning',
      title: 'Diversify Project Portfolio',
      description: 'High concentration in large projects creates cash flow risk.',
      priority: 'medium',
      estimatedImpact: '25% risk reduction',
      timeframe: '6-12 months',
      investment: '$10,000-$25,000',
      actionItems: [
        {
          action: 'Target smaller, quick-turn projects',
          timeframe: '90 days',
          responsible: 'Business Development',
          success_metric: '40% of projects under $50k'
        }
      ]
    });
  }

  // Add guidance-based recommendations
  relevantGuidance.slice(0, 3).forEach(guide => {
    recommendations.push({
      category: guide.guidance_category,
      title: guide.title,
      description: guide.description,
      priority: guide.priority_score > 75 ? 'high' : 
                guide.priority_score > 50 ? 'medium' : 'low',
      estimatedImpact: guide.expected_roi || 'Significant improvement',
      timeframe: guide.estimated_timeframe || '3-6 months',
      investment: guide.investment_required || 'Moderate',
      actionItems: (guide.step_by_step_guide || []).slice(0, 3).map((step: any) => ({
        action: step.title || step.description,
        timeframe: '30 days',
        responsible: 'Management',
        success_metric: 'Implementation completed'
      }))
    });
  });

  return recommendations;
}

function generateScalingMilestones(metrics: CompanyMetrics, companyId: string) {
  const milestones = [];
  
  // Revenue milestones
  const nextRevenueTarget = Math.ceil(metrics.revenue * 1.5);
  milestones.push({
    company_id: companyId,
    milestone_category: 'revenue',
    milestone_name: `Reach $${nextRevenueTarget.toLocaleString()} Annual Revenue`,
    description: 'Increase revenue by 50% through improved operations and market expansion',
    target_value: nextRevenueTarget,
    current_value: metrics.revenue,
    unit_type: 'currency',
    target_date: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    difficulty_level: 'medium',
    success_metrics: [
      { metric: 'Monthly recurring revenue growth', target: '10%' },
      { metric: 'New client acquisition', target: '5 per quarter' }
    ]
  });

  // Team size milestones
  const nextTeamTarget = Math.ceil(metrics.teamSize * 1.3);
  milestones.push({
    company_id: companyId,
    milestone_category: 'team_size',
    milestone_name: `Expand Team to ${nextTeamTarget} Members`,
    description: 'Strategic hiring to support increased project capacity',
    target_value: nextTeamTarget,
    current_value: metrics.teamSize,
    unit_type: 'count',
    target_date: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    difficulty_level: 'medium',
    prerequisites: ['Secure additional project contracts', 'Establish recruitment process']
  });

  // Project capacity milestones
  const nextProjectTarget = Math.ceil(metrics.projectCount * 1.4);
  milestones.push({
    company_id: companyId,
    milestone_category: 'project_count',
    milestone_name: `Handle ${nextProjectTarget} Concurrent Projects`,
    description: 'Increase operational capacity and project management efficiency',
    target_value: nextProjectTarget,
    current_value: metrics.projectCount,
    unit_type: 'count',
    target_date: new Date(Date.now() + 270 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    difficulty_level: 'hard'
  });

  return milestones;
}

function calculateOverallScore(metrics: CompanyMetrics): number {
  // Simple scoring algorithm based on growth indicators
  let score = 50; // Base score
  
  // Team efficiency (projects per team member)
  const projectsPerPerson = metrics.projectCount / metrics.teamSize;
  if (projectsPerPerson > 3) score += 20;
  else if (projectsPerPerson > 2) score += 10;
  else if (projectsPerPerson < 1) score -= 10;
  
  // Revenue per team member
  const revenuePerPerson = metrics.revenue / metrics.teamSize;
  if (revenuePerPerson > 100000) score += 20;
  else if (revenuePerPerson > 75000) score += 10;
  else if (revenuePerPerson < 50000) score -= 10;
  
  // Project value consistency
  if (metrics.averageProjectValue > metrics.revenue * 0.5) score -= 15; // Too concentrated
  if (metrics.averageProjectValue < metrics.revenue * 0.1) score += 10; // Good diversification
  
  return Math.max(0, Math.min(100, score));
}

function calculateTargetScore(metrics: CompanyMetrics): number {
  const currentScore = calculateOverallScore(metrics);
  return Math.min(100, currentScore + 25); // Target 25 point improvement
}

function determinePriorityLevel(recommendations: ScalingRecommendation[]): string {
  const highPriority = recommendations.filter(r => r.priority === 'high' || r.priority === 'critical');
  if (highPriority.length > 2) return 'critical';
  if (highPriority.length > 0) return 'high';
  return 'medium';
}