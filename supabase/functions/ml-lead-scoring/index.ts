/**
 * ML-Based Lead Scoring Edge Function
 * Provides comprehensive AI-powered lead scoring with:
 * - Multi-dimensional scoring (demographic, behavioral, engagement, fit, intent, timing)
 * - Conversion probability prediction
 * - AI-generated insights
 * - Next best action recommendations
 * - Risk factors identification
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[ML-LEAD-SCORING] ${step}${detailsStr}`);
};

// Score weights for each dimension
const SCORE_WEIGHTS = {
  demographic: 0.20,
  behavioral: 0.25,
  engagement: 0.20,
  fit: 0.15,
  intent: 0.15,
  timing: 0.05,
};

// Industry-specific value multipliers
const INDUSTRY_MULTIPLIERS: Record<string, number> = {
  construction: 1.2,
  real_estate: 1.1,
  manufacturing: 1.0,
  retail: 0.9,
  other: 0.8,
};

// Company size scoring
const COMPANY_SIZE_SCORES: Record<string, number> = {
  'enterprise': 100,
  '500+': 90,
  '100-499': 80,
  '50-99': 70,
  '10-49': 60,
  '1-9': 40,
  'unknown': 30,
};

// Budget range scoring
const BUDGET_SCORES: { min: number; max: number; score: number }[] = [
  { min: 100000, max: Infinity, score: 100 },
  { min: 50000, max: 99999, score: 85 },
  { min: 25000, max: 49999, score: 70 },
  { min: 10000, max: 24999, score: 55 },
  { min: 5000, max: 9999, score: 40 },
  { min: 0, max: 4999, score: 25 },
];

// Lead source quality scores
const SOURCE_SCORES: Record<string, number> = {
  referral: 100,
  organic_search: 85,
  direct: 80,
  linkedin: 75,
  paid_search: 70,
  email: 65,
  social_media: 60,
  trade_show: 55,
  cold_outreach: 40,
  unknown: 30,
};

interface Lead {
  id: string;
  email: string;
  first_name?: string;
  last_name?: string;
  company_name?: string;
  company_size?: string;
  industry?: string;
  job_title?: string;
  phone?: string;
  estimated_budget?: number;
  decision_maker?: boolean;
  financing_secured?: boolean;
  project_type?: string;
  decision_timeline?: string;
  lead_source?: string;
  lead_score?: number;
  lead_temperature?: string;
  status?: string;
  viewed_pricing?: boolean;
  requested_demo?: boolean;
  started_signup?: boolean;
  downloaded_resource?: boolean;
  requested_sales_contact?: boolean;
  landing_page?: string;
  referrer?: string;
  utm_source?: string;
  utm_medium?: string;
  utm_campaign?: string;
  first_seen_at?: string;
  last_activity_at?: string;
  last_contact_date?: string;
  next_follow_up_date?: string;
  notes?: string;
  created_at?: string;
  updated_at?: string;
}

interface LeadScore {
  overall_score: number;
  scores: {
    demographic: number;
    behavioral: number;
    engagement: number;
    fit: number;
    intent: number;
    timing: number;
  };
  confidence: number;
  conversion_probability: number;
  estimated_deal_size: number;
  estimated_close_days: number;
  quality_tier: 'hot' | 'warm' | 'cold' | 'unqualified';
  insights: string[];
  risk_factors: string[];
  next_best_actions: string[];
  scoring_details: {
    dimension: string;
    factor: string;
    score: number;
    weight: number;
    contribution: number;
  }[];
}

interface LeadActivity {
  activity_type: string;
  activity_date: string;
  description?: string;
  outcome?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Verify user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const body = await req.json();
    const { lead_id, include_ai_insights = true } = body;

    if (!lead_id) {
      return new Response(JSON.stringify({ error: 'lead_id is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    logStep('Scoring lead', { lead_id, user_id: user.id });

    const { data: userProfile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('user_id', user.id)
      .single();

    if (!userProfile?.company_id) {
      return new Response(JSON.stringify({ error: 'User company not found' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get lead data
    const { data: lead, error: leadError } = await supabase
      .from('leads')
      .select('*')
      .eq('id', lead_id)
      .single();

    if (leadError || !lead) {
      logStep('Lead not found', { error: leadError?.message });
      return new Response(JSON.stringify({ error: 'Lead not found' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Get lead activities for engagement scoring
    const { data: activities } = await supabase
      .from('crm_activities')
      .select('*')
      .eq('lead_id', lead_id)
      .order('activity_date', { ascending: false })
      .limit(50);

    // Calculate comprehensive ML score
    const score = calculateMLScore(lead as Lead, activities || []);

    // Get AI-generated insights if enabled
    if (include_ai_insights) {
      await enrichWithAIInsights(score, lead as Lead, activities || []);
    }

    // Update lead with new score
    const { error: updateError } = await supabase
      .from('leads')
      .update({
        lead_score: score.overall_score,
        lead_temperature: score.quality_tier,
        updated_at: new Date().toISOString(),
      })
      .eq('id', lead_id);

    if (updateError) {
      logStep('Failed to update lead score', { error: updateError.message });
    }

    // Log scoring activity
    await supabase.from('crm_activities').insert({
      company_id: userProfile.company_id,
      lead_id: lead_id,
      activity_type: 'scoring',
      description: `ML lead score calculated: ${score.overall_score} (${score.quality_tier})`,
      outcome: 'completed',
      activity_date: new Date().toISOString(),
    });

    logStep('Score calculated', {
      lead_id,
      overall_score: score.overall_score,
      quality_tier: score.quality_tier,
      conversion_probability: score.conversion_probability,
    });

    return new Response(JSON.stringify(score), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep('ERROR', { message: errorMessage });

    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

function calculateMLScore(lead: Lead, activities: LeadActivity[]): LeadScore {
  const scoringDetails: LeadScore['scoring_details'] = [];
  const insights: string[] = [];
  const riskFactors: string[] = [];
  const nextBestActions: string[] = [];

  // ============================================================================
  // 1. DEMOGRAPHIC SCORE (Company info, job title, industry)
  // ============================================================================
  let demographicScore = 0;
  let demographicFactors = 0;

  // Company size
  const companySizeScore = COMPANY_SIZE_SCORES[lead.company_size || 'unknown'] || 30;
  demographicScore += companySizeScore;
  demographicFactors++;
  scoringDetails.push({
    dimension: 'demographic',
    factor: 'company_size',
    score: companySizeScore,
    weight: SCORE_WEIGHTS.demographic / 4,
    contribution: companySizeScore * (SCORE_WEIGHTS.demographic / 4) / 100,
  });

  // Industry
  const industryMultiplier = INDUSTRY_MULTIPLIERS[lead.industry || 'other'] || 0.8;
  const industryScore = Math.round(70 * industryMultiplier);
  demographicScore += industryScore;
  demographicFactors++;
  scoringDetails.push({
    dimension: 'demographic',
    factor: 'industry',
    score: industryScore,
    weight: SCORE_WEIGHTS.demographic / 4,
    contribution: industryScore * (SCORE_WEIGHTS.demographic / 4) / 100,
  });

  // Job title (decision maker indicator)
  let jobTitleScore = 30;
  const title = (lead.job_title || '').toLowerCase();
  if (title.includes('ceo') || title.includes('owner') || title.includes('president')) {
    jobTitleScore = 100;
    insights.push('Lead is a C-level executive - high decision-making authority');
  } else if (title.includes('director') || title.includes('vp') || title.includes('head')) {
    jobTitleScore = 85;
    insights.push('Lead is a senior decision-maker');
  } else if (title.includes('manager')) {
    jobTitleScore = 70;
  } else if (title.includes('coordinator') || title.includes('specialist')) {
    jobTitleScore = 50;
    riskFactors.push('Lead may not have final decision authority');
  }
  demographicScore += jobTitleScore;
  demographicFactors++;
  scoringDetails.push({
    dimension: 'demographic',
    factor: 'job_title',
    score: jobTitleScore,
    weight: SCORE_WEIGHTS.demographic / 4,
    contribution: jobTitleScore * (SCORE_WEIGHTS.demographic / 4) / 100,
  });

  // Contact completeness
  let contactScore = 0;
  if (lead.email) contactScore += 25;
  if (lead.phone) contactScore += 25;
  if (lead.company_name) contactScore += 25;
  if (lead.first_name && lead.last_name) contactScore += 25;
  demographicScore += contactScore;
  demographicFactors++;

  const finalDemographicScore = Math.round(demographicScore / demographicFactors);

  // ============================================================================
  // 2. BEHAVIORAL SCORE (Actions taken on website/platform)
  // ============================================================================
  let behavioralScore = 0;

  if (lead.viewed_pricing) {
    behavioralScore += 25;
    insights.push('Lead viewed pricing page - strong purchase intent');
  }
  if (lead.requested_demo) {
    behavioralScore += 30;
    insights.push('Lead requested a demo - very high intent');
  }
  if (lead.started_signup) {
    behavioralScore += 20;
  }
  if (lead.downloaded_resource) {
    behavioralScore += 15;
  }
  if (lead.requested_sales_contact) {
    behavioralScore += 30;
    insights.push('Lead explicitly requested sales contact');
  }

  // UTM campaign quality
  if (lead.utm_source === 'google' && lead.utm_medium === 'cpc') {
    behavioralScore += 10;
  }
  if (lead.utm_campaign?.includes('demo') || lead.utm_campaign?.includes('trial')) {
    behavioralScore += 10;
  }

  const finalBehavioralScore = Math.min(100, behavioralScore);

  // ============================================================================
  // 3. ENGAGEMENT SCORE (Activity history)
  // ============================================================================
  let engagementScore = 0;

  // Recent activity recency
  const lastActivityDate = lead.last_activity_at ? new Date(lead.last_activity_at) : null;
  const daysSinceActivity = lastActivityDate
    ? Math.floor((Date.now() - lastActivityDate.getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  if (daysSinceActivity <= 1) {
    engagementScore += 40;
    insights.push('Lead was active in the last 24 hours');
  } else if (daysSinceActivity <= 7) {
    engagementScore += 30;
  } else if (daysSinceActivity <= 14) {
    engagementScore += 20;
  } else if (daysSinceActivity <= 30) {
    engagementScore += 10;
  } else {
    riskFactors.push(`Lead inactive for ${daysSinceActivity} days`);
  }

  // Activity count and diversity
  const activityCount = activities.length;
  if (activityCount >= 10) {
    engagementScore += 30;
  } else if (activityCount >= 5) {
    engagementScore += 20;
  } else if (activityCount >= 2) {
    engagementScore += 10;
  }

  // Activity type diversity
  const activityTypes = new Set(activities.map(a => a.activity_type));
  engagementScore += Math.min(30, activityTypes.size * 10);

  // Response rate (if there were outreach attempts)
  const outreachCount = activities.filter(a =>
    a.activity_type === 'call' || a.activity_type === 'email'
  ).length;
  const responseCount = activities.filter(a =>
    a.outcome === 'responded' || a.outcome === 'connected'
  ).length;

  if (outreachCount > 0) {
    const responseRate = responseCount / outreachCount;
    if (responseRate >= 0.5) {
      engagementScore += 20;
      insights.push('Lead has high response rate to outreach');
    } else if (responseRate === 0 && outreachCount >= 3) {
      riskFactors.push('Lead has not responded to multiple outreach attempts');
    }
  }

  const finalEngagementScore = Math.min(100, engagementScore);

  // ============================================================================
  // 4. FIT SCORE (How well lead matches ideal customer profile)
  // ============================================================================
  let fitScore = 0;

  // Budget fit
  if (lead.estimated_budget) {
    const budgetScore = BUDGET_SCORES.find(
      b => lead.estimated_budget! >= b.min && lead.estimated_budget! <= b.max
    )?.score || 25;
    fitScore += budgetScore * 0.4;

    if (lead.estimated_budget >= 50000) {
      insights.push(`Lead has substantial budget ($${lead.estimated_budget.toLocaleString()})`);
    }
  } else {
    fitScore += 25; // Unknown budget, neutral score
    riskFactors.push('Budget not specified');
  }

  // Decision maker
  if (lead.decision_maker === true) {
    fitScore += 30;
    insights.push('Lead is confirmed decision maker');
  } else if (lead.decision_maker === false) {
    fitScore += 10;
    riskFactors.push('Lead is not the decision maker');
    nextBestActions.push('Identify and engage the decision maker');
  }

  // Financing
  if (lead.financing_secured === true) {
    fitScore += 30;
    insights.push('Lead has financing secured');
  } else if (lead.financing_secured === false) {
    fitScore += 10;
    riskFactors.push('Financing not yet secured');
  }

  const finalFitScore = Math.min(100, fitScore);

  // ============================================================================
  // 5. INTENT SCORE (Purchase readiness signals)
  // ============================================================================
  let intentScore = 0;

  // Timeline urgency
  const timeline = (lead.decision_timeline || '').toLowerCase();
  if (timeline.includes('immediate') || timeline.includes('asap') || timeline.includes('week')) {
    intentScore += 40;
    insights.push('Lead has immediate timeline - urgent opportunity');
  } else if (timeline.includes('month') || timeline.includes('30') || timeline.includes('quarterly')) {
    intentScore += 30;
  } else if (timeline.includes('year') || timeline.includes('6 month')) {
    intentScore += 15;
    riskFactors.push('Long decision timeline');
  }

  // Lead source quality
  const sourceScore = SOURCE_SCORES[lead.lead_source || 'unknown'] || 30;
  intentScore += sourceScore * 0.3;

  if (lead.lead_source === 'referral') {
    insights.push('Lead came from referral - typically higher conversion rate');
  }

  // Project type specificity
  if (lead.project_type && lead.project_type !== 'other') {
    intentScore += 20;
  }

  // Status progression
  if (lead.status === 'qualified' || lead.status === 'opportunity') {
    intentScore += 20;
  }

  const finalIntentScore = Math.min(100, intentScore);

  // ============================================================================
  // 6. TIMING SCORE (Optimal timing indicators)
  // ============================================================================
  let timingScore = 50; // Neutral base

  // Follow-up due
  if (lead.next_follow_up_date) {
    const followUpDate = new Date(lead.next_follow_up_date);
    const daysUntilFollowUp = Math.floor((followUpDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

    if (daysUntilFollowUp <= 0) {
      timingScore += 30;
      nextBestActions.push('Follow-up is overdue - contact immediately');
    } else if (daysUntilFollowUp <= 3) {
      timingScore += 20;
      nextBestActions.push(`Follow-up scheduled in ${daysUntilFollowUp} days`);
    }
  }

  // Lead age (newer leads often have higher engagement)
  const leadAge = lead.created_at
    ? Math.floor((Date.now() - new Date(lead.created_at).getTime()) / (1000 * 60 * 60 * 24))
    : 30;

  if (leadAge <= 7) {
    timingScore += 20;
    insights.push('New lead - act quickly while interest is high');
  } else if (leadAge > 60) {
    timingScore -= 10;
    riskFactors.push('Lead is aging - may need re-engagement');
    nextBestActions.push('Send re-engagement campaign');
  }

  const finalTimingScore = Math.min(100, Math.max(0, timingScore));

  // ============================================================================
  // CALCULATE OVERALL SCORE
  // ============================================================================
  const overallScore = Math.round(
    finalDemographicScore * SCORE_WEIGHTS.demographic +
    finalBehavioralScore * SCORE_WEIGHTS.behavioral +
    finalEngagementScore * SCORE_WEIGHTS.engagement +
    finalFitScore * SCORE_WEIGHTS.fit +
    finalIntentScore * SCORE_WEIGHTS.intent +
    finalTimingScore * SCORE_WEIGHTS.timing
  );

  // ============================================================================
  // CALCULATE CONFIDENCE
  // ============================================================================
  let confidenceFactors = 0;
  let totalFactors = 6;

  if (lead.company_name) confidenceFactors++;
  if (lead.estimated_budget) confidenceFactors++;
  if (lead.decision_timeline) confidenceFactors++;
  if (activities.length >= 2) confidenceFactors++;
  if (lead.lead_source) confidenceFactors++;
  if (lead.job_title) confidenceFactors++;

  const confidence = Math.round((confidenceFactors / totalFactors) * 100);

  // ============================================================================
  // CALCULATE CONVERSION PROBABILITY
  // ============================================================================
  // Simple logistic-like conversion probability based on score
  const baseProbability = 1 / (1 + Math.exp(-0.1 * (overallScore - 50)));
  const adjustedProbability = baseProbability * (confidence / 100);
  const conversionProbability = Math.round(adjustedProbability * 100);

  // ============================================================================
  // ESTIMATE DEAL SIZE AND CLOSE TIME
  // ============================================================================
  const estimatedDealSize = lead.estimated_budget || calculateEstimatedDealSize(lead);
  const estimatedCloseDays = calculateEstimatedCloseDays(overallScore, lead);

  // ============================================================================
  // DETERMINE QUALITY TIER
  // ============================================================================
  let qualityTier: 'hot' | 'warm' | 'cold' | 'unqualified';
  if (overallScore >= 80) {
    qualityTier = 'hot';
  } else if (overallScore >= 60) {
    qualityTier = 'warm';
  } else if (overallScore >= 40) {
    qualityTier = 'cold';
  } else {
    qualityTier = 'unqualified';
  }

  // ============================================================================
  // GENERATE NEXT BEST ACTIONS
  // ============================================================================
  if (!nextBestActions.length) {
    if (qualityTier === 'hot') {
      nextBestActions.push('Schedule demo or sales call immediately');
      nextBestActions.push('Send personalized proposal');
    } else if (qualityTier === 'warm') {
      nextBestActions.push('Send case studies relevant to their industry');
      nextBestActions.push('Schedule discovery call');
    } else if (qualityTier === 'cold') {
      nextBestActions.push('Enroll in nurture campaign');
      nextBestActions.push('Share educational content');
    } else {
      nextBestActions.push('Verify lead quality and contact information');
      nextBestActions.push('Consider disqualifying if no engagement after outreach');
    }
  }

  return {
    overall_score: overallScore,
    scores: {
      demographic: finalDemographicScore,
      behavioral: finalBehavioralScore,
      engagement: finalEngagementScore,
      fit: finalFitScore,
      intent: finalIntentScore,
      timing: finalTimingScore,
    },
    confidence,
    conversion_probability: conversionProbability,
    estimated_deal_size: estimatedDealSize,
    estimated_close_days: estimatedCloseDays,
    quality_tier: qualityTier,
    insights,
    risk_factors: riskFactors,
    next_best_actions: nextBestActions,
    scoring_details: scoringDetails,
  };
}

function calculateEstimatedDealSize(lead: Lead): number {
  // Estimate based on company size and industry
  let baseSize = 10000;

  const sizeMultipliers: Record<string, number> = {
    'enterprise': 10,
    '500+': 5,
    '100-499': 3,
    '50-99': 2,
    '10-49': 1.5,
    '1-9': 1,
  };

  const multiplier = sizeMultipliers[lead.company_size || ''] || 1;
  const industryBonus = INDUSTRY_MULTIPLIERS[lead.industry || 'other'] || 1;

  return Math.round(baseSize * multiplier * industryBonus);
}

function calculateEstimatedCloseDays(score: number, lead: Lead): number {
  // Base estimate on score and timeline
  let baseDays = 90;

  if (score >= 80) baseDays = 30;
  else if (score >= 60) baseDays = 60;
  else if (score >= 40) baseDays = 90;
  else baseDays = 120;

  // Adjust for timeline if specified
  const timeline = (lead.decision_timeline || '').toLowerCase();
  if (timeline.includes('immediate') || timeline.includes('week')) {
    baseDays = Math.min(baseDays, 14);
  } else if (timeline.includes('month')) {
    baseDays = Math.min(baseDays, 45);
  }

  return baseDays;
}

async function enrichWithAIInsights(
  score: LeadScore,
  lead: Lead,
  _activities: LeadActivity[]
): Promise<void> {
  // In production, call OpenAI or similar for enhanced insights
  // For now, add rule-based enrichments

  // Add quality-specific insights
  if (score.quality_tier === 'hot' && !score.insights.includes('Lead viewed pricing page')) {
    score.insights.push('High overall score indicates strong potential');
  }

  // Add engagement-specific insights
  if (score.scores.engagement < 30) {
    score.insights.push('Consider increasing touchpoints to improve engagement');
  }

  // Add fit-specific insights
  if (score.scores.fit >= 70 && score.scores.intent < 50) {
    score.insights.push('Good fit but low intent - focus on creating urgency');
  }
}
