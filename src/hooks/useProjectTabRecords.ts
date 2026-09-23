/**
 * RFI, submittal and change-order lists for the project detail tabs (US-266).
 *
 * ProjectRFIs, ProjectSubmittals and ProjectChangeOrders each loaded their
 * list with useState + useEffect and reported a failure only as a toast over a
 * tab that then said "No RFIs yet". They share this module now: one query key
 * per table and project, the error returned for the tab to show in place of
 * the empty state.
 *
 * The filters are the ones each tab used. Change orders were never scoped by
 * company_id in the query (RLS does it), and adding that filter here would
 * hide any legacy row whose company_id is null, so it is left out.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export type ProjectTabTable = 'rfis' | 'submittals' | 'change_orders';

const SCOPED_BY_COMPANY: Record<ProjectTabTable, boolean> = {
  rfis: true,
  submittals: true,
  change_orders: false,
};

export const projectTabRecordsKey = (table: ProjectTabTable, companyId: string | undefined, projectId: string) =>
  [table, companyId, 'project', projectId] as const;

// eslint-disable-next-line @typescript-eslint/no-explicit-any -- the three tabs render untyped rows today
export async function fetchProjectTabRecords(table: ProjectTabTable, projectId: string, companyId: string): Promise<any[]> {
  let query = supabase.from(table).select('*').eq('project_id', projectId);
  if (SCOPED_BY_COMPANY[table]) query = query.eq('company_id', companyId);
  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export function useProjectTabRecords(table: ProjectTabTable, projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  // The change-orders tab never waited for a company; the other two did.
  const ready = !!projectId && (!SCOPED_BY_COMPANY[table] || !!companyId);
  const query = useQuery({
    queryKey: projectTabRecordsKey(table, companyId, projectId),
    queryFn: () => fetchProjectTabRecords(table, projectId, companyId as string),
    enabled: ready,
  });
  return {
    records: query.data ?? [],
    isLoading: query.isLoading || !ready,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
