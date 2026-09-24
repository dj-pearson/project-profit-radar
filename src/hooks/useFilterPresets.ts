/**
 * Saved filter presets for a list screen (US-266).
 *
 * FilterPresetsManager swallowed every read error ("table may not exist yet"),
 * so a failed read showed "No saved presets yet". It exists (migration-made),
 * and the error is shown now. The shared-preset filter interpolated an
 * undefined company as `company_id.eq.undefined`; without a company only the
 * user's own presets are asked for. Delete and set-default filtered by id
 * alone and did not read back, so removing a colleague's shared preset (which
 * RLS refuses) toasted "Preset Deleted". Both are scoped to the owner and
 * throw on zero rows.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { SupabaseClient } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';
import { logger } from '@/lib/logger';

// saved_filter_presets and its use-count RPC are migration-made but not yet
// in the generated Database types.
const untyped = supabase as unknown as SupabaseClient;

export interface FilterPreset {
  id: string;
  name: string;
  description?: string;
  filters: Record<string, unknown>;
  is_shared: boolean;
  is_default: boolean;
  use_count: number;
  last_used_at: string | null;
  user_id?: string;
}

export interface NewFilterPreset {
  name: string;
  description: string;
  filters: Record<string, unknown>;
  shareWithCompany: boolean;
  isDefault: boolean;
}

export const filterPresetsKey = (companyId: string | undefined, userId: string | undefined, context: string) =>
  ['filter-presets', companyId, userId, context] as const;

export async function fetchFilterPresets(userId: string, companyId: string | undefined, context: string): Promise<FilterPreset[]> {
  const visible = companyId
    ? `user_id.eq.${userId},and(is_shared.eq.true,company_id.eq.${companyId})`
    : `user_id.eq.${userId}`;
  const { data, error } = await untyped
    .from('saved_filter_presets')
    .select('*')
    .eq('context', context)
    .or(visible)
    .order('is_default', { ascending: false })
    .order('use_count', { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as FilterPreset[];
}

export async function saveFilterPreset(
  userId: string,
  companyId: string | undefined,
  context: string,
  v: NewFilterPreset,
): Promise<void> {
  if (v.shareWithCompany && !companyId) throw new Error('Your profile is not linked to a company, so there is no one to share with.');
  const { data, error } = await untyped
    .from('saved_filter_presets')
    .insert({
      user_id: userId,
      company_id: v.shareWithCompany ? companyId : null,
      name: v.name.trim(),
      description: v.description.trim() || null,
      context,
      filters: v.filters,
      is_shared: v.shareWithCompany,
      is_default: v.isDefault,
    })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The preset was not saved.');
}

const notYours = () => new Error('Only the person who saved a preset can change or delete it.');

export async function deleteFilterPreset(userId: string, id: string): Promise<void> {
  const { data, error } = await untyped
    .from('saved_filter_presets')
    .delete()
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw notYours();
}

export async function setFilterPresetDefault(userId: string, id: string, isDefault: boolean): Promise<void> {
  const { data, error } = await untyped
    .from('saved_filter_presets')
    .update({ is_default: isDefault })
    .eq('id', id)
    .eq('user_id', userId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw notYours();
}

/** Best effort: a failed count bump must not stop the filters applying. */
export async function recordFilterPresetUse(id: string): Promise<void> {
  const { error } = await untyped.rpc('increment_filter_preset_use_count', { preset_id: id });
  if (error) logger.warn('Could not record filter preset use', error.message);
}

export function useFilterPresets(context: string, userId: string | undefined, companyId: string | undefined) {
  const queryClient = useQueryClient();
  const key = filterPresetsKey(companyId, userId, context);
  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchFilterPresets(userId as string, companyId, context),
    enabled: !!userId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const need = () => {
    if (!userId) throw new Error('You are not signed in.');
    return userId;
  };
  const save = useMutation({ mutationFn: (v: NewFilterPreset) => saveFilterPreset(need(), companyId, context, v), onSettled: invalidate });
  const remove = useMutation({ mutationFn: (id: string) => deleteFilterPreset(need(), id), onSettled: invalidate });
  const setDefault = useMutation({
    mutationFn: (v: { id: string; isDefault: boolean }) => setFilterPresetDefault(need(), v.id, v.isDefault),
    onSettled: invalidate,
  });
  const recordUse = useMutation({ mutationFn: recordFilterPresetUse, onSettled: invalidate });
  return { query, save, remove, setDefault, recordUse };
}
