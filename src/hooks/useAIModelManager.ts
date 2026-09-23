/**
 * Reads and writes behind the root-admin AI model manager (US-266).
 *
 * AIModelManager loaded ai_model_configurations in a useEffect and reloaded
 * after every write. It also read ai_environment_config into state nothing
 * rendered; that read is gone. Writes checked the error but not the row count,
 * so an update RLS filtered to nothing reported "AI model updated". The alias
 * refresh read each family's latest model with .single() and dropped the
 * error, so a family with no active model and a failed read looked the same.
 *
 * ai_model_configurations is platform-wide; the key carries company_id only so
 * one account's cache is never served to another.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import type { AIModel } from '@/components/admin/ai-model-manager/types';

export const aiModelsKey = (companyId: string | undefined) => ['ai-models', companyId] as const;

// task_type and usage_category exist in the database (20260204000000) but not
// in the generated types yet (US-369).
type ModelForm = TablesInsert<'ai_model_configurations'> & { task_type?: string; usage_category?: string };

export async function fetchAIModels(): Promise<AIModel[]> {
  const { data, error } = await supabase
    .from('ai_model_configurations')
    .select('*')
    .order('priority_order', { ascending: false });
  if (error) throw error;
  return (data ?? []).map((model) => ({
    ...model,
    auth_method: model.auth_method as AIModel['auth_method'],
  })) as AIModel[];
}

/**
 * Clears the previous default of the same provider and task type first (it may
 * match no row, which is fine), then inserts or updates. The update selects
 * the id back and fails when RLS let it touch nothing.
 */
export async function saveAIModel(form: ModelForm, editingId?: string): Promise<void> {
  if (form.is_default) {
    const { error: clearError } = await supabase
      .from('ai_model_configurations')
      .update({ is_default: false })
      .eq('provider', form.provider)
      .eq('task_type', form.task_type as string);
    if (clearError) throw clearError;
  }

  const { data, error } = editingId
    ? await supabase
        .from('ai_model_configurations')
        .update(form as TablesUpdate<'ai_model_configurations'>)
        .eq('id', editingId)
        .select('id')
    : await supabase.from('ai_model_configurations').insert([form]).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The model was not saved. You may not have permission to change AI models.');
  }
}

export async function deleteAIModel(id: string): Promise<void> {
  const { data, error } = await supabase.from('ai_model_configurations').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The model was not deleted. You may not have permission to delete AI models.');
  }
}

/** Points each auto-updating alias at its family's newest active model. Returns how many moved. */
export async function refreshAIModelAliases(now = new Date()): Promise<number> {
  const { data: aliases, error: aliasError } = await supabase
    .from('ai_model_configurations')
    .select('*')
    .eq('is_alias', true)
    .eq('auto_update_alias', true);
  if (aliasError) throw aliasError;

  let moved = 0;
  for (const alias of aliases ?? []) {
    const { data: latest, error: latestError } = await supabase
      .from('ai_model_configurations')
      .select('model_name')
      .eq('model_family', alias.model_family as string)
      .eq('is_alias', false)
      .eq('is_active', true)
      .is('deprecated_date', null)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (latestError) throw latestError;
    if (!latest || latest.model_name === alias.points_to_model) continue;

    const { data, error } = await supabase
      .from('ai_model_configurations')
      .update({ points_to_model: latest.model_name, last_updated: now.toISOString() })
      .eq('id', alias.id)
      .select('id');
    if (error) throw error;
    if (!data || data.length === 0) {
      throw new Error(`Alias ${alias.model_display_name} was not updated. You may not have permission to change AI models.`);
    }
    moved += 1;
  }
  return moved;
}

export function useAIModelManager() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const isRootAdmin = userProfile?.role === 'root_admin';
  const queryClient = useQueryClient();
  const key = aiModelsKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: fetchAIModels, enabled: isRootAdmin });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const save = useMutation({
    mutationFn: ({ form, editingId }: { form: ModelForm; editingId?: string }) => saveAIModel(form, editingId),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteAIModel, onSettled: invalidate });
  const aliases = useMutation({ mutationFn: () => refreshAIModelAliases(), onSettled: invalidate });

  return {
    models: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    save: (form: ModelForm, editingId?: string) => save.mutateAsync({ form, editingId }),
    remove: (id: string) => remove.mutateAsync(id),
    refreshAliases: () => aliases.mutateAsync(),
  };
}
