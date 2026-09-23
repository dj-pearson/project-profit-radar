/**
 * Reads and writes behind /punch-list (US-266).
 *
 * PunchList.tsx loaded projects and items in a useEffect and reloaded both by
 * hand after each write. A failed load showed "No punch list items have been
 * created yet" under a toast; the page now shows the error in place of the list.
 *
 * Updates select the id back so a write RLS filtered to zero rows fails instead
 * of announcing "Status updated" over a row that did not change (US-309 was the
 * version of that bug where nothing was written at all).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export interface PunchListProject {
  id: string;
  name: string;
  client_name: string;
  status: string;
}

export const punchListKey = (companyId: string | undefined) => ['punch-list', companyId] as const;

export async function fetchPunchListPage<Item>(companyId: string): Promise<{ projects: PunchListProject[]; items: Item[] }> {
  const { data: projects, error: projectsError } = await supabase
    .from('projects')
    .select('id, name, client_name, status')
    .eq('company_id', companyId)
    .order('name');
  if (projectsError) throw projectsError;

  const { data: items, error: itemsError } = await supabase
    .from('punch_list_items')
    .select(`
      *,
      projects(name, client_name)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });
  if (itemsError) throw itemsError;

  return { projects: (projects ?? []) as PunchListProject[], items: (items ?? []) as unknown as Item[] };
}

export async function createPunchListItem(row: TablesInsert<'punch_list_items'>): Promise<void> {
  const { error } = await supabase.from('punch_list_items').insert(row).select('id');
  if (error) throw error;
}

export async function updatePunchListItem(id: string, patch: TablesUpdate<'punch_list_items'>): Promise<void> {
  const { data, error } = await supabase.from('punch_list_items').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The punch list item was not changed. You may not have permission to edit it.');
  }
}

export function usePunchListPage<Item>({ enabled = true }: { enabled?: boolean } = {}) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = punchListKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPunchListPage<Item>(companyId as string),
    enabled: enabled && !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({ mutationFn: createPunchListItem, onSettled: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'punch_list_items'> }) => updatePunchListItem(id, patch),
    onSettled: invalidate,
  });

  return {
    projects: query.data?.projects ?? [],
    items: query.data?.items ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    // Plain functions over the mutations, so a handler reads as the write it is:
    // `punchList.update(id, patch)` rejects when the row did not change.
    insert: (row: TablesInsert<'punch_list_items'>) => create.mutateAsync(row),
    update: (id: string, patch: TablesUpdate<'punch_list_items'>) => update.mutateAsync({ id, patch }),
  };
}
