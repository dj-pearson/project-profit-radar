/**
 * Labor cost entries and labor cost codes for the job-costing LaborTracking
 * tab (US-266).
 *
 * The component looked the company up with an unchecked read through
 * supabase.auth.getUser(); when that failed the cost-code picker was empty and
 * the entry list rendered as if complete. Both reads throw now, the company
 * comes from the auth context, and the insert selects its row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface LaborEntry {
  id: string;
  employee_id?: string | null;
  employee_name: string;
  hours_worked: number;
  hourly_rate: number;
  overtime_hours: number;
  overtime_rate: number;
  total_labor_cost: number;
  burden_rate: number;
  total_cost_with_burden: number;
  work_date: string;
  description: string;
  cost_code_id?: string | null;
}

export interface LaborCostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

export const laborTrackingKey = (companyId: string | undefined, projectId: string) =>
  ['labor-costs', companyId, projectId] as const;

export async function fetchLaborTracking(
  companyId: string,
  projectId: string
): Promise<{ entries: LaborEntry[]; costCodes: LaborCostCode[] }> {
  const [entries, codes] = await Promise.all([
    supabase.from('labor_costs').select('*').eq('project_id', projectId).order('work_date', { ascending: false }),
    supabase
      .from('cost_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('category', 'labor')
      .eq('is_active', true)
      .order('code'),
  ]);
  if (entries.error) throw entries.error;
  if (codes.error) throw codes.error;
  return {
    entries: (entries.data ?? []) as unknown as LaborEntry[],
    costCodes: (codes.data ?? []) as unknown as LaborCostCode[],
  };
}

export async function insertLaborEntry(row: TablesInsert<'labor_costs'>): Promise<void> {
  const { data, error } = await supabase.from('labor_costs').insert(row).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The labor entry was not saved. You may not have permission to add labor costs.');
  }
}

export function useLaborTracking(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = laborTrackingKey(companyId, projectId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchLaborTracking(companyId as string, projectId),
    enabled: !!companyId && !!projectId,
  });
  const add = useMutation({
    mutationFn: insertLaborEntry,
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    entries: query.data?.entries ?? [],
    costCodes: query.data?.costCodes ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    add: (row: TablesInsert<'labor_costs'>) => add.mutateAsync(row),
  };
}
