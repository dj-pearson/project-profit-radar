/**
 * Budget line items and cost codes for the job-costing BudgetManager (US-266).
 *
 * The component read the company with an unchecked lookup through
 * supabase.auth.getUser() and, when that failed, silently left the cost-code
 * picker empty while the budget list rendered as if complete. Writes reported
 * success on an update or delete RLS filtered to zero rows.
 *
 * Both reads throw now, the company comes from the auth context, and every
 * write selects the row back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface BudgetItem {
  id: string;
  category: string;
  description: string;
  budgeted_quantity: number;
  budgeted_unit_cost: number;
  budgeted_total: number;
  actual_quantity: number;
  actual_total: number;
  variance: number;
  cost_code_id?: string | null;
}

export interface BudgetCostCode {
  id: string;
  code: string;
  name: string;
  category: string;
}

export const budgetManagerKey = (companyId: string | undefined, projectId: string) =>
  ['budget-line-items', companyId, projectId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchBudgetManager(
  companyId: string,
  projectId: string
): Promise<{ items: BudgetItem[]; costCodes: BudgetCostCode[] }> {
  const [items, codes] = await Promise.all([
    supabase
      .from('budget_line_items')
      .select('*')
      .eq('project_id', projectId)
      .order('category', { ascending: true }),
    supabase
      .from('cost_codes')
      .select('*')
      .eq('company_id', companyId)
      .eq('is_active', true)
      .order('code'),
  ]);
  if (items.error) throw items.error;
  if (codes.error) throw codes.error;
  return {
    items: (items.data ?? []) as unknown as BudgetItem[],
    costCodes: (codes.data ?? []) as unknown as BudgetCostCode[],
  };
}

export async function saveBudgetItem(
  id: string | null,
  row: TablesInsert<'budget_line_items'> & TablesUpdate<'budget_line_items'>
): Promise<void> {
  const { data, error } = id
    ? await supabase.from('budget_line_items').update(row).eq('id', id).select('id')
    : await supabase.from('budget_line_items').insert(row).select('id');
  if (error) throw error;
  requireRows(data, 'The budget item was not saved. You may not have permission to edit this budget.');
}

export async function deleteBudgetItem(id: string): Promise<void> {
  const { data, error } = await supabase.from('budget_line_items').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The budget item was not deleted. You may not have permission to edit this budget.');
}

export function useBudgetManager(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = budgetManagerKey(companyId, projectId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchBudgetManager(companyId as string, projectId),
    enabled: !!companyId && !!projectId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const save = useMutation({
    mutationFn: ({ id, row }: { id: string | null; row: TablesInsert<'budget_line_items'> }) => saveBudgetItem(id, row),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteBudgetItem, onSettled: invalidate });

  return {
    items: query.data?.items ?? [],
    costCodes: query.data?.costCodes ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (id: string | null, row: TablesInsert<'budget_line_items'>) => save.mutateAsync({ id, row }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
