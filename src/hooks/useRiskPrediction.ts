/**
 * Reads and writes behind the Risk Prediction admin page (US-266).
 *
 * The page looked up tenant_id before every read and caught every error into
 * console.error. Factors, recommendations, alerts and history ignored their
 * errors outright, so a failed read rendered "No prediction history available"
 * or an empty factor list under a prediction that has factors. Acknowledging an
 * alert removed it from the screen whether or not the update matched a row.
 *
 * Reads now throw; updates select the id back and throw on zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId, NO_TENANT_MESSAGE } from './tenantScope';

export interface RiskPredictionRow {
  id: string;
  project_id: string;
  overall_risk_score: number;
  delay_risk_score: number;
  budget_risk_score: number;
  safety_risk_score: number;
  quality_risk_score: number;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  predicted_delay_days: number;
  predicted_cost_overrun: number;
  predicted_completion_date: string;
  confidence_score: number;
  prediction_date: string;
  created_at: string;
}

export interface RiskFactor {
  id: string;
  factor_type: string;
  factor_name: string;
  description: string;
  impact_score: number;
  likelihood: number;
  mitigation_strategy: string;
  is_mitigated: boolean;
}

export interface RiskRecommendation {
  id: string;
  recommendation_type: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  description: string;
  expected_cost_savings: number;
  expected_time_savings: number;
  success_probability: number;
  status: 'pending' | 'in_progress' | 'completed' | 'declined';
}

export interface RiskAlert {
  id: string;
  alert_type: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  title: string;
  message: string;
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed';
  created_at: string;
}

export interface RiskProjectData {
  prediction: RiskPredictionRow | null;
  factors: RiskFactor[];
  recommendations: RiskRecommendation[];
  alerts: RiskAlert[];
  history: RiskPredictionRow[];
}

export const riskPredictionKey = (companyId: string | undefined, userId: string | undefined) =>
  ['risk-prediction', companyId, userId] as const;

export async function fetchRiskProjects(userId: string) {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId, projects: [] as { id: string; name: string; status: string }[] };
  const { data, error } = await supabase
    .from('projects')
    .select('id, name, status')
    .eq('tenant_id', tenantId)
    .in('status', ['planning', 'active', 'on_hold'])
    .order('name');
  if (error) throw error;
  return { tenantId, projects: (data ?? []) as { id: string; name: string; status: string }[] };
}

export async function fetchRiskProjectData(tenantId: string, projectId: string): Promise<RiskProjectData> {
  const { data: history, error: historyError } = await supabase
    .from('risk_predictions')
    .select('*')
    .eq('project_id', projectId)
    .eq('tenant_id', tenantId)
    .order('created_at', { ascending: false })
    .limit(10);
  if (historyError) throw historyError;

  const rows = (history ?? []) as unknown as RiskPredictionRow[];
  const prediction = rows[0] ?? null;
  if (!prediction) return { prediction: null, factors: [], recommendations: [], alerts: [], history: rows };

  const { data: factors, error: factorsError } = await supabase
    .from('risk_factors')
    .select('*')
    .eq('risk_prediction_id', prediction.id);
  if (factorsError) throw factorsError;

  const { data: recs, error: recsError } = await supabase
    .from('risk_recommendations')
    .select('*')
    .eq('risk_prediction_id', prediction.id)
    .order('priority', { ascending: false });
  if (recsError) throw recsError;

  const { data: alerts, error: alertsError } = await supabase
    .from('risk_alerts')
    .select('*')
    .eq('project_id', projectId)
    .eq('status', 'active')
    .order('severity', { ascending: false });
  if (alertsError) throw alertsError;

  return {
    prediction,
    factors: (factors ?? []) as unknown as RiskFactor[],
    recommendations: (recs ?? []) as unknown as RiskRecommendation[],
    alerts: (alerts ?? []) as unknown as RiskAlert[],
    history: rows,
  };
}

export async function acknowledgeRiskAlert(alertId: string, userId: string | undefined): Promise<void> {
  const { data, error } = await supabase
    .from('risk_alerts')
    .update({ status: 'acknowledged', acknowledged_by: userId, acknowledged_at: new Date().toISOString() })
    .eq('id', alertId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The alert was not acknowledged. You may not have permission to change it.');
  }
}

export async function updateRiskRecommendation(recId: string, status: RiskRecommendation['status']): Promise<void> {
  const { data, error } = await supabase
    .from('risk_recommendations')
    .update({ status })
    .eq('id', recId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The recommendation was not updated. You may not have permission to change it.');
  }
}

export async function generateRiskPrediction(tenantId: string | null, projectId: string, userId: string | undefined) {
  if (!tenantId) throw new Error(NO_TENANT_MESSAGE);
  const { error } = await supabase.functions.invoke('risk-prediction', {
    body: { tenant_id: tenantId, project_id: projectId, user_id: userId },
  });
  if (error) throw error;
}

export function useRiskPrediction(projectId: string) {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = riskPredictionKey(companyId, userId);

  const projects = useQuery({
    queryKey: key,
    queryFn: () => fetchRiskProjects(userId as string),
    enabled: !!userId,
  });
  const tenantId = projects.data?.tenantId ?? null;
  const project = useQuery({
    queryKey: [...key, 'project', projectId] as const,
    queryFn: () => fetchRiskProjectData(tenantId as string, projectId),
    enabled: !!tenantId && !!projectId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const generate = useMutation({
    mutationFn: () => generateRiskPrediction(tenantId, projectId, userId),
    onSettled: invalidate,
  });
  const acknowledge = useMutation({
    mutationFn: (alertId: string) => acknowledgeRiskAlert(alertId, userId),
    onSettled: invalidate,
  });
  const updateRec = useMutation({
    mutationFn: ({ id, status }: { id: string; status: RiskRecommendation['status'] }) => updateRiskRecommendation(id, status),
    onSettled: invalidate,
  });

  return {
    projects: projects.data?.projects ?? [],
    data: project.data,
    isLoading: projects.isLoading || project.isLoading,
    error: (projects.error ?? project.error) as Error | null,
    refetch: () => Promise.all([projects.refetch(), project.refetch()]),
    generating: generate.isPending,
    generate: () => generate.mutateAsync(),
    acknowledgeAlert: (alertId: string) => acknowledge.mutateAsync(alertId),
    updateRecommendation: (id: string, status: RiskRecommendation['status']) => updateRec.mutateAsync({ id, status }),
  };
}
