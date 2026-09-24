/**
 * Custom reports and their generation history for the Reporting Engine admin
 * page (US-266).
 *
 * The page looked tenant_id up before reading report_history and then did not
 * use it: the history read had no tenant filter at all, so it listed whatever
 * RLS let through from every tenant. It is scoped through the report's tenant
 * now. "Generated" was the length of a 20-row page; it is a count. Errors
 * were caught into console.error and read as "No custom reports created".
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId } from './tenantScope';

export interface CustomReport {
  id: string;
  report_name: string;
  report_type: string;
  report_description: string | null;
  is_scheduled: boolean;
  schedule_frequency: string | null;
  is_public: boolean;
  created_at: string;
}

export interface ReportHistory {
  id: string;
  generated_at: string | null;
  output_format: string | null;
  file_size_bytes: number | null;
  delivery_status: string | null;
  execution_time_ms: number | null;
  custom_reports: { report_name: string } | null;
}

export const reportingEngineKey = (companyId: string | undefined, userId: string | undefined) =>
  ['reporting-engine', companyId, userId] as const;

export async function fetchReportingEngine(
  userId: string
): Promise<{ tenantId: string | null; reports: CustomReport[]; history: ReportHistory[]; generatedCount: number }> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId: null, reports: [], history: [], generatedCount: 0 };

  const [reports, history, generated] = await Promise.all([
    supabase.from('custom_reports').select('*').eq('tenant_id', tenantId).order('created_at', { ascending: false }),
    supabase
      .from('report_history')
      .select('*, custom_reports!inner(report_name, tenant_id)')
      .eq('custom_reports.tenant_id', tenantId)
      .order('generated_at', { ascending: false })
      .limit(20),
    supabase
      .from('report_history')
      .select('id, custom_reports!inner(tenant_id)', { count: 'exact', head: true })
      .eq('custom_reports.tenant_id', tenantId),
  ]);
  const failed = [reports, history, generated].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    tenantId,
    reports: (reports.data ?? []) as unknown as CustomReport[],
    history: (history.data ?? []) as unknown as ReportHistory[],
    generatedCount: generated.count ?? 0,
  };
}

export function useReportingEngine() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: reportingEngineKey(companyId, userId),
    queryFn: () => fetchReportingEngine(userId as string),
    enabled: !!userId,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
