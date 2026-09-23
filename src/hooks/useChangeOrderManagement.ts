/**
 * Reads and writes behind the Change Orders tab of /workflow-management (US-266).
 *
 * ChangeOrderManagement loaded change orders and projects in a useEffect and,
 * on a failed read, toasted and rendered zero change orders with a $0 total,
 * which reads as "nothing pending approval". It reads through this query now
 * and shows the error.
 *
 * Updates select the id back so a status change RLS filtered to zero rows
 * fails instead of toasting "Change order approved" over an unchanged row.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface ChangeOrderProjectOption {
  id: string;
  name: string;
}

export const changeOrdersKey = (companyId: string | undefined) => ['change-orders', companyId] as const;
export const changeOrderManagementKey = (companyId: string | undefined) =>
  [...changeOrdersKey(companyId), 'management'] as const;

export async function fetchChangeOrderManagement<Row>(
  companyId: string,
): Promise<{ changeOrders: Row[]; projects: ChangeOrderProjectOption[] }> {
  const orders = await supabase
    .from('change_orders')
    .select('*, projects:project_id(name)')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (orders.error) throw orders.error;

  const projects = await supabase
    .from('projects')
    .select('id, name')
    .eq('company_id', companyId)
    .order('name');
  if (projects.error) throw projects.error;

  return {
    changeOrders: (orders.data ?? []) as unknown as Row[],
    projects: (projects.data ?? []) as ChangeOrderProjectOption[],
  };
}

export async function insertChangeOrder(row: TablesInsert<'change_orders'>): Promise<void> {
  const { data, error } = await supabase.from('change_orders').insert([row]).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The change order was not created. You may not have permission to add change orders.');
  }
}

export async function updateChangeOrder(id: string, patch: TablesUpdate<'change_orders'>): Promise<void> {
  const { data, error } = await supabase.from('change_orders').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The change order was not changed. You may not have permission to edit it.');
  }
}

export function useChangeOrderManagement<Row>() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: changeOrderManagementKey(companyId),
    queryFn: () => fetchChangeOrderManagement<Row>(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: changeOrdersKey(companyId) });

  const create = useMutation({ mutationFn: insertChangeOrder, onSettled: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'change_orders'> }) => updateChangeOrder(id, patch),
    onSettled: invalidate,
  });

  return {
    changeOrders: query.data?.changeOrders ?? [],
    projects: query.data?.projects ?? [],
    isLoading: query.isLoading || !companyId,
    error: query.error as Error | null,
    refetch: query.refetch,
    create,
    update,
  };
}
