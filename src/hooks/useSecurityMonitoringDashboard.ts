/**
 * Alerts, monitoring rules and metrics for the security monitoring dashboard
 * inside SecurityDashboard (US-266).
 *
 * The component looked the company up with an unchecked read through
 * supabase.auth.getUser() before the metrics RPC, so a failed lookup left the
 * cards on "0 alerts, 0% resolved" rather than an error. Alert status writes
 * reported success on an update RLS filtered to zero rows.
 *
 * Reads throw, the company and user come from the auth context, writes select
 * the row back. The alerts and rules reads keep their RLS-only scope.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SecurityAlert {
  id: string;
  alert_type: string;
  severity: string;
  title: string;
  description: string;
  status: string;
  triggered_at: string;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  event_data: unknown;
}

export interface MonitoringRule {
  id: string;
  rule_name: string;
  rule_type: string;
  severity: string;
  is_active: boolean;
  threshold_value?: number | null;
  threshold_period_minutes?: number | null;
  recipients: string[];
}

export interface SecurityMetrics {
  total_alerts: number;
  critical_alerts: number;
  resolved_alerts: number;
  resolution_rate: number;
  avg_resolution_time_hours: number;
  failed_logins_24h: number;
}

export interface NewMonitoringRule {
  rule_name: string;
  rule_type: string;
  severity: string;
  description: string;
  threshold_value: number;
  threshold_period_minutes: number;
  recipients: string[];
}

export const securityMonitoringKey = (companyId: string | undefined) => ['security-monitoring', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchSecurityMonitoring(
  companyId: string
): Promise<{ alerts: SecurityAlert[]; rules: MonitoringRule[]; metrics: SecurityMetrics | null }> {
  const [alerts, rules, metrics] = await Promise.all([
    supabase.from('security_alerts').select('*').order('triggered_at', { ascending: false }).limit(50),
    supabase.from('security_monitoring_rules').select('*').order('created_at', { ascending: false }),
    supabase.rpc('calculate_security_metrics', { p_company_id: companyId }),
  ]);
  const failed = [alerts, rules, metrics].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    alerts: (alerts.data ?? []) as unknown as SecurityAlert[],
    rules: (rules.data ?? []) as unknown as MonitoringRule[],
    metrics: (metrics.data ?? null) as unknown as SecurityMetrics | null,
  };
}

export async function createMonitoringRule(companyId: string, userId: string | undefined, rule: NewMonitoringRule): Promise<void> {
  const { data, error } = await supabase
    .from('security_monitoring_rules')
    .insert({ ...rule, company_id: companyId, created_by: userId })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The rule was not created. You may not have permission to add monitoring rules.');
}

export async function setSecurityAlertStatus(
  id: string,
  status: string,
  userId: string | undefined,
  notes?: string,
  now: Date = new Date()
): Promise<void> {
  const at = now.toISOString();
  const { data, error } = await supabase
    .from('security_alerts')
    .update({
      status,
      ...(status === 'resolved' && { resolved_at: at, resolved_by: userId, resolution_notes: notes }),
      ...(status === 'investigating' && { acknowledged_at: at, acknowledged_by: userId }),
    })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The alert was not updated. You may not have permission to change security alerts.');
}

export function useSecurityMonitoringDashboard() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();
  const key = securityMonitoringKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchSecurityMonitoring(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const addRule = useMutation({
    mutationFn: (rule: NewMonitoringRule) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return createMonitoringRule(companyId, userId, rule);
    },
    onSettled: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      setSecurityAlertStatus(id, status, userId, notes),
    onSettled: invalidate,
  });

  return {
    alerts: query.data?.alerts ?? [],
    rules: query.data?.rules ?? [],
    metrics: query.data?.metrics ?? null,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    addRule: (rule: NewMonitoringRule) => addRule.mutateAsync(rule),
    setAlertStatus: (id: string, status: string, notes?: string) => setStatus.mutateAsync({ id, status, notes }),
  };
}
