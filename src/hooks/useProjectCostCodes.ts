/**
 * Cost codes behind the project Cost Codes tab (US-266).
 *
 * ProjectCostCodes.tsx loaded the project's codes in a useEffect and, on a
 * failed read, toasted over a tab that then said "No Cost Codes Yet" and
 * offered to import defaults on top of codes that already existed. The tab now
 * shows the error instead. The import is a bulk insert that selects the rows
 * back, so an insert RLS trimmed reports how many landed rather than
 * "N cost codes imported".
 *
 * The project list is read by project_id only, as it was: filtering on
 * company_id here would hide any legacy row whose company_id is null.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface ProjectCostCodeRow {
  id: string;
  code: string;
  name: string;
  description: string;
  category: string;
  budgeted: number;
  actual: number;
  committed: number;
}

export interface CompanyCostCode {
  id: string;
  code: string;
  name: string;
  description: string | null;
  category: string | null;
}

export const projectCostCodesKey = (companyId: string | undefined, projectId: string) =>
  ['project-cost-codes', companyId, projectId] as const;
export const companyCostCodesKey = (companyId: string | undefined) => ['cost-codes', companyId, 'active'] as const;

export async function fetchProjectCostCodes(projectId: string): Promise<ProjectCostCodeRow[]> {
  const { data, error } = await supabase
    .from('project_cost_codes')
    .select('*')
    .eq('project_id', projectId)
    .order('code', { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row) => ({
    id: row.id,
    code: row.code,
    name: row.description || row.code,
    description: row.description || '',
    category: row.category || 'General',
    budgeted: row.budget_amount ?? 0,
    // Actual and committed would come from a transactions table; zero until then.
    actual: 0,
    committed: 0,
  }));
}

export async function fetchCompanyCostCodes(companyId: string): Promise<CompanyCostCode[]> {
  const { data, error } = await supabase
    .from('cost_codes')
    .select('id, code, name, description, category')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('code', { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Inserts the rows and returns how many came back; throws when fewer landed than were sent. */
export async function insertProjectCostCodes(rows: TablesInsert<'project_cost_codes'>[]): Promise<number> {
  const { data, error } = await supabase.from('project_cost_codes').insert(rows).select('id');
  if (error) throw error;
  const saved = data?.length ?? 0;
  if (saved < rows.length) {
    throw new Error(`Only ${saved} of ${rows.length} cost code${rows.length === 1 ? '' : 's'} were saved.`);
  }
  return saved;
}

export function useProjectCostCodes(projectId: string, { loadCompanyCodes = false }: { loadCompanyCodes?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = projectCostCodesKey(companyId, projectId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchProjectCostCodes(projectId),
    enabled: !!projectId,
  });

  // The company catalogue is only read while the import dialog is open.
  const companyCodes = useQuery({
    queryKey: companyCostCodesKey(companyId),
    queryFn: () => fetchCompanyCostCodes(companyId as string),
    enabled: loadCompanyCodes && !!companyId,
  });

  const insert = useMutation({
    mutationFn: insertProjectCostCodes,
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    costCodes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    companyCodes: companyCodes.data ?? [],
    companyCodesLoading: companyCodes.isFetching,
    companyCodesError: companyCodes.error as Error | null,
    insert: insert.mutateAsync,
  };
}
