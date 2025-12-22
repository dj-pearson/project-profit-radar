/**
 * AI-Powered Lead Insights Hook
 * Provides intelligent analysis, predictions, and recommendations for leads
 * Integrates with ML lead scoring edge function
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

// Types
export interface LeadScore {
  lead_id: string;
  overall_score: number;
  quality_tier: 'hot' | 'warm' | 'cold' | 'unqualified';
  scores: {
    demographic: number;
    behavioral: number;
    engagement: number;
    fit: number;
    intent: number;
    timing: number;
  };
  conversion_probability: number;
  estimated_deal_size: number;
  estimated_days_to_close: number;
  insights: string[];
  risk_factors: string[];
  next_best_actions: string[];
  last_scored_at: string;
}

export interface LeadInsight {
  id: string;
  lead_id: string;
  insight_type: InsightType;
  title: string;
  description: string;
  confidence: number;
  impact: 'high' | 'medium' | 'low';
  data?: Record<string, unknown>;
  created_at: string;
  expires_at?: string;
}

export type InsightType =
  | 'engagement_pattern'
  | 'buying_signal'
  | 'risk_alert'
  | 'opportunity'
  | 'recommendation'
  | 'competitor_activity'
  | 'timing_suggestion'
  | 'content_suggestion';

export interface LeadPrediction {
  lead_id: string;
  prediction_type: PredictionType;
  predicted_value: unknown;
  confidence: number;
  factors: Array<{ name: string; contribution: number }>;
  prediction_date: string;
}

export type PredictionType =
  | 'conversion_likelihood'
  | 'deal_size'
  | 'close_date'
  | 'churn_risk'
  | 'next_action';

export interface LeadActivityTimeline {
  date: string;
  activities: Array<{
    type: string;
    description: string;
    timestamp: string;
    score_impact?: number;
  }>;
  cumulative_score: number;
}

export interface LeadComparison {
  lead_id: string;
  lead_name: string;
  score: number;
  tier: string;
  conversion_probability: number;
  strengths: string[];
  weaknesses: string[];
}

export interface AIRecommendation {
  id: string;
  type: 'action' | 'content' | 'timing' | 'channel';
  title: string;
  description: string;
  priority: 'high' | 'medium' | 'low';
  expected_impact: number;
  implementation_steps?: string[];
  supporting_data?: Record<string, unknown>;
}

export interface EngagementAnalysis {
  lead_id: string;
  engagement_level: 'high' | 'medium' | 'low' | 'none';
  recent_trend: 'increasing' | 'stable' | 'decreasing';
  most_engaged_channel: string;
  peak_engagement_times: string[];
  content_preferences: string[];
  interaction_frequency: number;
  last_interaction: string;
}

export interface SimilarLead {
  id: string;
  name: string;
  company?: string;
  score: number;
  tier: string;
  similarity_score: number;
  common_attributes: string[];
  outcome?: 'converted' | 'lost' | 'active';
}

/**
 * Hook to get AI-powered lead score
 */
export function useLeadScore(leadId: string, options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId],
    queryFn: async (): Promise<LeadScore> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'score_lead',
          lead_id: leadId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get lead score');
      }

      return response.data as LeadScore;
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
    staleTime: 5 * 60 * 1000, // Consider fresh for 5 minutes
  });
}

/**
 * Hook to batch score multiple leads
 */
export function useBatchLeadScoring() {
  const {  session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadIds: string[]): Promise<LeadScore[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'batch_score',
          lead_ids: leadIds,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to batch score leads');
      }

      return response.data as LeadScore[];
    },
    onSuccess: (scores) => {
      // Update individual lead score caches
      for (const score of scores) {
        queryClient.setQueryData([ score.lead_id], score);
      }
      queryClient.invalidateQueries({ queryKey: ['lead-insights'] });
    },
  });
}

/**
 * Hook to get lead insights
 */
export function useLeadInsights(leadId: string, options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId],
    queryFn: async (): Promise<LeadInsight[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'get_insights',
          lead_id: leadId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get lead insights');
      }

      return (response.data?.insights || []) as LeadInsight[];
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
  });
}

/**
 * Hook to get AI recommendations for a lead
 */
export function useLeadRecommendations(leadId: string, options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId],
    queryFn: async (): Promise<AIRecommendation[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'get_recommendations',
          lead_id: leadId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get recommendations');
      }

      return (response.data?.recommendations || []) as AIRecommendation[];
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
  });
}

/**
 * Hook to get lead predictions
 */
export function useLeadPredictions(leadId: string, options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId],
    queryFn: async (): Promise<LeadPrediction[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'get_predictions',
          lead_id: leadId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to get predictions');
      }

      return (response.data?.predictions || []) as LeadPrediction[];
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
  });
}

/**
 * Hook to get engagement analysis for a lead
 */
export function useEngagementAnalysis(leadId: string, options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId],
    queryFn: async (): Promise<EngagementAnalysis> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'analyze_engagement',
          lead_id: leadId,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze engagement');
      }

      return response.data as EngagementAnalysis;
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
  });
}

/**
 * Hook to find similar leads
 */
export function useSimilarLeads(leadId: string, options?: { limit?: number; enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadId, options?.limit],
    queryFn: async (): Promise<SimilarLead[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'find_similar',
          lead_id: leadId,
          limit: options?.limit || 10,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to find similar leads');
      }

      return (response.data?.similar_leads || []) as SimilarLead[];
    },
    enabled: !!leadId && !!session?.access_token && (options?.enabled !== false),
  });
}

/**
 * Hook to get lead activity timeline with score changes
 */
export function useLeadActivityTimeline(
  leadId: string,
  options?: { days?: number; enabled?: boolean }
) {
    return useQuery({
    queryKey: [ leadId, options?.days],
    queryFn: async (): Promise<LeadActivityTimeline[]> => {
            // Get lead activities
      const { data: activities, error } = await supabase
        .from('crm_activities')
        .select('*')
        .eq('lead_id', leadId)
        .gte(
          'created_at',
          new Date(Date.now() - (options?.days || 30) * 24 * 60 * 60 * 1000).toISOString()
        )
        .order('created_at', { ascending: true });

      if (error) throw error;

      // Group by date
      const timeline: Map<string, LeadActivityTimeline> = new Map();
      let cumulativeScore = 0;

      for (const activity of activities || []) {
        const date = new Date(activity.created_at).toISOString().split('T')[0];

        if (!timeline.has(date)) {
          timeline.set(date, {
            date,
            activities: [],
            cumulative_score: cumulativeScore,
          });
        }

        // Estimate score impact based on activity type
        const scoreImpact = getActivityScoreImpact(activity.activity_type);
        cumulativeScore += scoreImpact;

        timeline.get(date)!.activities.push({
          type: activity.activity_type,
          description: activity.description || activity.activity_type,
          timestamp: activity.created_at,
          score_impact: scoreImpact,
        });

        timeline.get(date)!.cumulative_score = cumulativeScore;
      }

      return Array.from(timeline.values());
    },
    enabled: !!leadId && (options?.enabled !== false),
  });
}

/**
 * Hook to compare multiple leads
 */
export function useLeadComparison(leadIds: string[], options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: [ leadIds],
    queryFn: async (): Promise<LeadComparison[]> => {
            if (!session?.access_token) throw new Error('Not authenticated');
      if (leadIds.length === 0) return [];

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'compare_leads',
          lead_ids: leadIds,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to compare leads');
      }

      return (response.data?.comparisons || []) as LeadComparison[];
    },
    enabled:
      leadIds.length > 0 &&
      !!session?.access_token &&
      (options?.enabled !== false),
  });
}

/**
 * Hook to get pipeline health analysis
 */
export function usePipelineHealthAnalysis(options?: { enabled?: boolean }) {
  const {  session } = useAuth();

  return useQuery({
    queryKey: ['pipeline-health'],
    queryFn: async () => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'analyze_pipeline',
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze pipeline');
      }

      return response.data as {
        overall_health: 'healthy' | 'needs_attention' | 'at_risk';
        total_pipeline_value: number;
        weighted_pipeline_value: number;
        conversion_rate_trend: 'improving' | 'stable' | 'declining';
        average_deal_cycle: number;
        bottlenecks: Array<{ stage: string; issue: string; recommendations: string[] }>;
        at_risk_deals: Array<{ lead_id: string; lead_name: string; risk_factors: string[] }>;
        quick_wins: Array<{ lead_id: string; lead_name: string; potential_value: number }>;
      };
    },
    enabled: !!session?.access_token && (options?.enabled !== false),
    staleTime: 10 * 60 * 1000, // Consider fresh for 10 minutes
  });
}

/**
 * Hook to get score distribution across leads
 */
export function useScoreDistribution(options?: { enabled?: boolean }) {
    return useQuery({
    queryKey: ['score-distribution'],
    queryFn: async () => {
            const { data: leads, error } = await supabase
        .from('leads')
        .select('id, score, status')
        ;

      if (error) throw error;

      const distribution = {
        hot: { count: 0, leads: [] as string[] },
        warm: { count: 0, leads: [] as string[] },
        cold: { count: 0, leads: [] as string[] },
        unqualified: { count: 0, leads: [] as string[] },
      };

      for (const lead of leads || []) {
        const score = lead.score || 0;
        const tier = getQualityTier(score);
        distribution[tier].count++;
        distribution[tier].leads.push(lead.id);
      }

      return {
        distribution,
        total_leads: leads?.length || 0,
        average_score:
          leads?.length > 0
            ? leads.reduce((sum, l) => sum + (l.score || 0), 0) / leads.length
            : 0,
      };
    },
    enabled: (options?.enabled !== false),
  });
}

/**
 * Hook to refresh lead score
 */
export function useRefreshLeadScore() {
  const {  session } = useAuth();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (leadId: string): Promise<LeadScore> => {
            if (!session?.access_token) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('ml-lead-scoring', {
        body: {
          action: 'score_lead',
          lead_id: leadId,
          force_refresh: true,
        },
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to refresh score');
      }

      return response.data as LeadScore;
    },
    onSuccess: (score) => {
      queryClient.setQueryData([ score.lead_id], score);
      queryClient.invalidateQueries({ queryKey: [ score.lead_id] });
      queryClient.invalidateQueries({ queryKey: ['score-distribution'] });
    },
  });
}

// Helper functions
function getActivityScoreImpact(activityType: string): number {
  const impacts: Record<string, number> = {
    email_sent: 1,
    email_opened: 2,
    email_clicked: 3,
    email_replied: 5,
    call_completed: 4,
    meeting_scheduled: 6,
    meeting_completed: 8,
    proposal_sent: 7,
    proposal_viewed: 5,
    demo_requested: 6,
    demo_completed: 8,
    quote_requested: 7,
    contract_sent: 8,
    contract_signed: 10,
    website_visit: 1,
    form_submitted: 4,
    document_downloaded: 3,
    note_added: 0,
    status_changed: 0,
  };

  return impacts[activityType] || 0;
}

function getQualityTier(score: number): 'hot' | 'warm' | 'cold' | 'unqualified' {
  if (score >= 80) return 'hot';
  if (score >= 60) return 'warm';
  if (score >= 40) return 'cold';
  return 'unqualified';
}

// Constants
export const INSIGHT_TYPES: Array<{ value: InsightType; label: string; icon: string }> = [
  { value: 'engagement_pattern', label: 'Engagement Pattern', icon: '📊' },
  { value: 'buying_signal', label: 'Buying Signal', icon: '🎯' },
  { value: 'risk_alert', label: 'Risk Alert', icon: '⚠️' },
  { value: 'opportunity', label: 'Opportunity', icon: '💡' },
  { value: 'recommendation', label: 'Recommendation', icon: '💭' },
  { value: 'competitor_activity', label: 'Competitor Activity', icon: '👀' },
  { value: 'timing_suggestion', label: 'Timing Suggestion', icon: '⏰' },
  { value: 'content_suggestion', label: 'Content Suggestion', icon: '📝' },
];

export const QUALITY_TIERS = {
  hot: { label: 'Hot', color: 'red', minScore: 80 },
  warm: { label: 'Warm', color: 'orange', minScore: 60 },
  cold: { label: 'Cold', color: 'blue', minScore: 40 },
  unqualified: { label: 'Unqualified', color: 'gray', minScore: 0 },
} as const;

// Utility functions
export function formatScore(score: number): string {
  return `${Math.round(score)}%`;
}

export function formatProbability(probability: number): string {
  return `${(probability * 100).toFixed(1)}%`;
}

export function getScoreColor(score: number): string {
  if (score >= 80) return 'text-red-600';
  if (score >= 60) return 'text-orange-500';
  if (score >= 40) return 'text-blue-500';
  return 'text-gray-500';
}

export function getScoreBadgeClass(score: number): string {
  if (score >= 80) return 'bg-red-100 text-red-800 border-red-200';
  if (score >= 60) return 'bg-orange-100 text-orange-800 border-orange-200';
  if (score >= 40) return 'bg-blue-100 text-blue-800 border-blue-200';
  return 'bg-gray-100 text-gray-800 border-gray-200';
}

export function getImpactBadgeClass(impact: 'high' | 'medium' | 'low'): string {
  switch (impact) {
    case 'high':
      return 'bg-red-100 text-red-800';
    case 'medium':
      return 'bg-yellow-100 text-yellow-800';
    case 'low':
      return 'bg-green-100 text-green-800';
    default:
      return 'bg-gray-100 text-gray-800';
  }
}

export function sortInsightsByPriority(insights: LeadInsight[]): LeadInsight[] {
  const impactOrder = { high: 0, medium: 1, low: 2 };
  return [...insights].sort((a, b) => {
    // First by impact
    const impactDiff = impactOrder[a.impact] - impactOrder[b.impact];
    if (impactDiff !== 0) return impactDiff;
    // Then by confidence
    return b.confidence - a.confidence;
  });
}
