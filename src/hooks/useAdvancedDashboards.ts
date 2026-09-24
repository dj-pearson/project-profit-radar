/**
 * The latest financial snapshot and today's KPIs for the Advanced Dashboards
 * admin page (US-266).
 *
 * The page looked tenant_id up twice with unchecked reads and caught every
 * error into console.error. With no snapshot (none taken yet, or a failed
 * read) every card read "$0" and "0%", which is a claim about the business
 * rather than an absence of data. Reads throw now, the latest snapshot is read
 * with maybeSingle (none is null, not an error), and the page shows '--' where
 * there is no snapshot.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { fetchTenantId } from './tenantScope';

export interface FinancialSnapshot {
  total_revenue: number | null;
  total_costs: number | null;
  gross_profit: number | null;
  profit_margin: number | null;
  cash_on_hand: number | null;
  accounts_receivable: number | null;
  active_projects_count: number | null;
}

export interface KPIMetric {
  metric_name: string;
  metric_value: number;
  metric_target: number;
  change_percentage: number;
  trend: string;
}

export const advancedDashboardsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['advanced-dashboards', companyId, userId] as const;

export async function fetchAdvancedDashboards(
  userId: string,
  today: Date = new Date()
): Promise<{ tenantId: string | null; snapshot: FinancialSnapshot | null; kpis: KPIMetric[] }> {
  const tenantId = await fetchTenantId(userId);
  if (!tenantId) return { tenantId: null, snapshot: null, kpis: [] };

  const [snapshot, kpis] = await Promise.all([
    supabase
      .from('financial_snapshots')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('snapshot_date', { ascending: false })
      .limit(1)
      .maybeSingle(),
    supabase
      .from('kpi_metrics')
      .select('*')
      .eq('tenant_id', tenantId)
      .eq('metric_date', today.toISOString().split('T')[0]),
  ]);
  if (snapshot.error) throw snapshot.error;
  if (kpis.error) throw kpis.error;
  return {
    tenantId,
    snapshot: (snapshot.data ?? null) as FinancialSnapshot | null,
    kpis: (kpis.data ?? []) as unknown as KPIMetric[],
  };
}

export function useAdvancedDashboards() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: advancedDashboardsKey(companyId, userId),
    queryFn: () => fetchAdvancedDashboards(userId as string),
    enabled: !!userId,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
