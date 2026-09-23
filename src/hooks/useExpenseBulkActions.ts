/**
 * Bulk status and category changes on the expense list (US-266).
 *
 * ExpenseTracker wrote these straight to supabase and then called refetch on
 * its own page of results. As mutations they invalidate every ['expenses', ...]
 * query, which is the prefix usePaginatedQuery builds its keys from (the
 * company_id sits in the serialized filters part of that key).
 */
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

export const expensesKeyPrefix = ['expenses'] as const;

export type ExpenseBulkPatch = { payment_status: 'approved' | 'rejected' } | { category_id: string };

/** Throws when RLS dropped some of the rows, rather than reporting all of them changed. */
export async function bulkUpdateExpenses(ids: string[], patch: ExpenseBulkPatch): Promise<number> {
  const { data, error } = await supabase.from('expenses').update(patch).in('id', ids).select('id');
  if (error) throw error;
  const changed = data?.length ?? 0;
  if (changed < ids.length) {
    throw new Error(`${ids.length - changed} of ${ids.length} expense(s) were not updated. You may not have permission to edit them.`);
  }
  return changed;
}

export function useExpenseBulkActions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ ids, patch }: { ids: string[]; patch: ExpenseBulkPatch }) => bulkUpdateExpenses(ids, patch),
    onSettled: () => queryClient.invalidateQueries({ queryKey: expensesKeyPrefix }),
  });
}
