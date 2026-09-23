/**
 * Environmental permits behind the project Permits tab (US-266).
 *
 * ProjectPermits.tsx loaded the list in a useEffect and, on a failed read,
 * toasted over a tab that then offered to add the first permit. The tab now
 * shows the error. Update and delete select the id back so a write RLS
 * filtered to zero rows fails instead of changing local state and announcing
 * success.
 *
 * The list is read by project_id only, as it was; RLS scopes the table.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export const projectPermitsKey = (companyId: string | undefined, projectId: string) =>
  ['environmental-permits', companyId, 'project', projectId] as const;

export async function fetchProjectPermits<Permit>(projectId: string): Promise<Permit[]> {
  const { data, error } = await supabase
    .from('environmental_permits')
    .select('*')
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Permit[];
}

export async function createProjectPermit(row: TablesInsert<'environmental_permits'>): Promise<void> {
  const { error } = await supabase.from('environmental_permits').insert([row]).select('id').single();
  if (error) throw error;
}

export async function updateProjectPermit(id: string, patch: TablesUpdate<'environmental_permits'>): Promise<void> {
  const { data, error } = await supabase.from('environmental_permits').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The permit was not updated. You may not have permission to edit it.');
  }
}

export async function deleteProjectPermit(id: string): Promise<void> {
  const { data, error } = await supabase.from('environmental_permits').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The permit was not deleted. You may not have permission to delete it.');
  }
}

export function useProjectPermits<Permit>(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = projectPermitsKey(companyId, projectId);
  const ready = !!projectId && !!companyId;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchProjectPermits<Permit>(projectId),
    enabled: ready,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['environmental-permits', companyId] });
  const create = useMutation({ mutationFn: createProjectPermit, onSettled: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'environmental_permits'> }) => updateProjectPermit(id, patch),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteProjectPermit, onSettled: invalidate });

  return {
    permits: query.data ?? [],
    isLoading: query.isLoading || !ready,
    error: query.error as Error | null,
    refetch: query.refetch,
    create: create.mutateAsync,
    update: (id: string, patch: TablesUpdate<'environmental_permits'>) => update.mutateAsync({ id, patch }),
    remove: remove.mutateAsync,
  };
}
