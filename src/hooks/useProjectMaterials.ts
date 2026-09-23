/**
 * Material catalogue and per-project usage behind the project Materials tab (US-266).
 *
 * ProjectMaterials.tsx loaded both lists in a useEffect and, when the usage
 * read failed, toasted over a tab that then said "No material usage recorded".
 * The tab now shows the error in place of the list. A usage delete RLS
 * filtered to zero rows used to drop the row from local state and announce
 * success; it now selects the id back and fails.
 *
 * Usage rows are read by project only, as before: material_usage has no
 * company_id column and RLS scopes it through the project.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export const projectMaterialsKey = (companyId: string | undefined, projectId: string) =>
  ['materials', companyId, 'project-usage', projectId] as const;

export async function fetchProjectMaterials<Material, Usage>(
  companyId: string,
  projectId: string,
): Promise<{ materials: Material[]; usage: Usage[] }> {
  const { data: materials, error: materialsError } = await supabase
    .from('materials')
    .select('*')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('name');
  if (materialsError) throw materialsError;

  const { data: usage, error: usageError } = await supabase
    .from('material_usage')
    .select(`
      *,
      materials(*)
    `)
    .eq('project_id', projectId)
    .order('created_at', { ascending: false });
  if (usageError) throw usageError;

  return {
    materials: (materials ?? []) as unknown as Material[],
    // The tab reads the joined row as `material`.
    usage: (usage ?? []).map((row) => ({ ...row, material: row.materials })) as unknown as Usage[],
  };
}

export async function createMaterial(row: TablesInsert<'materials'>): Promise<void> {
  const { error } = await supabase.from('materials').insert([row]).select('id').single();
  if (error) throw error;
}

export async function createMaterialUsage(row: TablesInsert<'material_usage'>): Promise<void> {
  const { error } = await supabase.from('material_usage').insert([row]).select('id').single();
  if (error) throw error;
}

export async function deleteMaterialUsage(id: string): Promise<void> {
  const { data, error } = await supabase.from('material_usage').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The usage record was not deleted. You may not have permission to delete it.');
  }
}

export function useProjectMaterials<Material, Usage>(projectId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = projectMaterialsKey(companyId, projectId);
  const ready = !!projectId && !!companyId;

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchProjectMaterials<Material, Usage>(companyId as string, projectId),
    enabled: ready,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['materials', companyId] });
  const addMaterial = useMutation({ mutationFn: createMaterial, onSettled: invalidate });
  const addUsage = useMutation({ mutationFn: createMaterialUsage, onSettled: invalidate });
  const removeUsage = useMutation({ mutationFn: deleteMaterialUsage, onSettled: invalidate });

  return {
    materials: query.data?.materials ?? [],
    usage: query.data?.usage ?? [],
    isLoading: query.isLoading || !ready,
    error: query.error as Error | null,
    refetch: query.refetch,
    createMaterial: addMaterial.mutateAsync,
    createUsage: addUsage.mutateAsync,
    deleteUsage: removeUsage.mutateAsync,
  };
}
