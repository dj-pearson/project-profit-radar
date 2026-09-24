/**
 * Reads and writes behind /admin/audit (US-266).
 *
 * The page read four tables in sequence inside one try, so the first failure
 * left the rest of the page on whatever it had and toasted once. "Total Audit
 * Logs" was the length of a 100-row page, so it never read above 100. Writes
 * reported success on an update RLS filtered to zero rows.
 *
 * The reads are unfiltered as before: these are admin tables and RLS decides
 * what an admin sees. The audit read asks for an exact count alongside its
 * 100-row page, and the card shows that count. Writes select the row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/format';

export interface AuditLog {
  id: string;
  event_type: string;
  action: string;
  resource_type: string;
  resource_name: string | null;
  status: string;
  user_id: string;
  ip_address: string | null;
  created_at: string;
  changes: unknown;
  is_sensitive: boolean;
}

export interface GDPRRequest {
  id: string;
  request_type: string;
  status: string;
  requester_email: string;
  requester_name: string;
  deadline: string;
  is_overdue: boolean;
  created_at: string;
  completed_at: string | null;
}

export interface RetentionPolicy {
  id: string;
  name: string;
  resource_type: string;
  retention_period_days: number;
  action_on_expiry: string;
  is_active: boolean;
  last_applied_at: string | null;
  created_at: string;
}

export interface ComplianceReport {
  id: string;
  report_type: string;
  report_name: string;
  status: string;
  date_range_start: string;
  date_range_end: string;
  generated_at: string;
  file_url: string | null;
  compliance_standard: string | null;
}

export interface AuditComplianceData {
  auditLogs: AuditLog[];
  /** Every audit row RLS lets this user see, not just the 100 listed. */
  auditLogTotal: number;
  gdprRequests: GDPRRequest[];
  retentionPolicies: RetentionPolicy[];
  complianceReports: ComplianceReport[];
}

export const AUDIT_LOG_PAGE = 100;

export const auditComplianceKey = (companyId: string | undefined, userId: string | undefined) =>
  ['audit-compliance', companyId, userId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchAuditCompliance(): Promise<AuditComplianceData> {
  const [logs, gdpr, policies, reports] = await Promise.all([
    supabase
      .from('audit_logs')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(AUDIT_LOG_PAGE),
    supabase.from('gdpr_requests').select('*').order('created_at', { ascending: false }),
    supabase.from('data_retention_policies').select('*').order('created_at', { ascending: false }),
    supabase.from('compliance_reports').select('*').order('generated_at', { ascending: false }),
  ]);
  const failed = [logs, gdpr, policies, reports].find((r) => r.error)?.error;
  if (failed) throw failed;

  const auditLogs = (logs.data ?? []) as unknown as AuditLog[];
  return {
    auditLogs,
    auditLogTotal: logs.count ?? auditLogs.length,
    gdprRequests: (gdpr.data ?? []) as unknown as GDPRRequest[],
    retentionPolicies: (policies.data ?? []) as unknown as RetentionPolicy[],
    complianceReports: (reports.data ?? []) as unknown as ComplianceReport[],
  };
}

export async function queueComplianceReport(userId: string | undefined, now: Date = new Date()): Promise<void> {
  const start = new Date(now);
  start.setMonth(start.getMonth() - 1);
  const { data, error } = await supabase
    .from('compliance_reports')
    .insert({
      report_type: 'audit_summary',
      report_name: `Monthly Compliance Report - ${formatDate(now)}`,
      date_range_start: start.toISOString().split('T')[0],
      date_range_end: now.toISOString().split('T')[0],
      status: 'pending',
      generated_by: userId,
    })
    .select('id');
  if (error) throw error;
  requireRows(data, 'The report was not queued. You may not have permission to create compliance reports.');
}

export async function setGDPRRequestStatus(id: string, status: string, now: Date = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('gdpr_requests')
    .update({ status, completed_at: status === 'completed' ? now.toISOString() : null })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The request was not updated. You may not have permission to edit GDPR requests.');
}

export async function setRetentionPolicyActive(id: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase
    .from('data_retention_policies')
    .update({ is_active: isActive })
    .eq('id', id)
    .select('id');
  if (error) throw error;
  requireRows(data, 'The policy was not changed. You may not have permission to edit retention policies.');
}

export function useAuditLoggingCompliance() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = auditComplianceKey(companyId, userId);

  const query = useQuery({ queryKey: key, queryFn: fetchAuditCompliance, enabled: !!userId });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const queueReport = useMutation({ mutationFn: () => queueComplianceReport(userId), onSettled: invalidate });
  const setGdpr = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setGDPRRequestStatus(id, status),
    onSettled: invalidate,
  });
  const setPolicy = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setRetentionPolicyActive(id, isActive),
    onSettled: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    queueReport: () => queueReport.mutateAsync(),
    setGdprStatus: (id: string, status: string) => setGdpr.mutateAsync({ id, status }),
    setPolicyActive: (id: string, isActive: boolean) => setPolicy.mutateAsync({ id, isActive }),
  };
}
