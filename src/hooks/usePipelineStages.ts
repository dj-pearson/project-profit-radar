/**
 * Pipeline stages for CRM pipeline settings (US-266).
 *
 * PipelineSettings read stages, pipeline templates and lead routing rules in a
 * useEffect, then rendered only the stages; the other two reads could only
 * fail the screen. A failed read toasted and left an empty stage list with a
 * "New stage" button, which on a configured pipeline adds a duplicate. The
 * stages read through this query now and the screen shows the error.
 *
 * Reordering is optimistic and rolls back on failure. Each write selects its
 * ids back so a change RLS filtered to zero rows fails instead of toasting.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';

export const pipelineStagesKey = (companyId: string | undefined) => ['pipeline-stages', companyId] as const;

export async function fetchPipelineStages<Stage>(companyId: string): Promise<Stage[]> {
  const { data, error } = await supabase
    .from('pipeline_stages')
    .select('*')
    .eq('company_id', companyId)
    .order('stage_order');
  if (error) throw error;
  return (data ?? []) as unknown as Stage[];
}

const NOT_SAVED = 'The pipeline stage was not saved. You may not have permission to change pipeline settings.';

export async function insertPipelineStage(row: TablesInsert<'pipeline_stages'>): Promise<void> {
  const { data, error } = await supabase.from('pipeline_stages').insert(row).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOT_SAVED);
}

export async function updatePipelineStage(id: string, patch: TablesUpdate<'pipeline_stages'>): Promise<void> {
  const { data, error } = await supabase.from('pipeline_stages').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error(NOT_SAVED);
}

export async function deletePipelineStage(id: string): Promise<void> {
  const { data, error } = await supabase.from('pipeline_stages').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The pipeline stage was not deleted. You may not have permission to change pipeline settings.');
  }
}

/** One update per stage; fails if any stage did not take its new position. */
export async function reorderPipelineStages(order: { id: string; stage_order: number }[]): Promise<void> {
  const results = await Promise.all(
    order.map((s) =>
      supabase.from('pipeline_stages').update({ stage_order: s.stage_order }).eq('id', s.id).select('id'),
    ),
  );
  const saved = results.reduce((n, r) => n + (r.error ? 0 : r.data?.length ?? 0), 0);
  if (saved < order.length) throw new Error('Failed to update some stages');
}

export function usePipelineStages<Stage extends { id: string; stage_order: number }>() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = pipelineStagesKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchPipelineStages<Stage>(companyId as string),
    enabled: !!companyId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({ mutationFn: insertPipelineStage, onSettled: invalidate });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'pipeline_stages'> }) => updatePipelineStage(id, patch),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deletePipelineStage, onSettled: invalidate });
  const reorder = useMutation({
    mutationFn: (ordered: Stage[]) =>
      reorderPipelineStages(ordered.map((s) => ({ id: s.id, stage_order: s.stage_order }))),
    onMutate: async (ordered: Stage[]) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<Stage[]>(key);
      queryClient.setQueryData<Stage[]>(key, ordered);
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) queryClient.setQueryData(key, ctx.previous);
    },
    onSettled: invalidate,
  });

  return {
    stages: query.data ?? [],
    // Without a company there is nothing to load; the old screen waited too.
    isLoading: query.isLoading || !companyId,
    error: query.error as Error | null,
    refetch: query.refetch,
    create,
    update,
    remove,
    reorder,
  };
}
