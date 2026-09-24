/**
 * Materials, recent usage and the project picker for /materials (US-266).
 *
 * The page loaded three tables in sequence and reloaded all three by hand
 * after each write. The usage read had no company filter at all (RLS alone
 * scoped it); it is scoped through the material's company now. Recording
 * usage wrote the usage row and then moved the stock count from the number
 * the page last read, reporting success when RLS filtered that update to zero
 * rows, so stock silently stopped going down.
 *
 * Reads throw. Writes select the row back; a usage row saved without its stock
 * update says so rather than reporting success.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface Material {
  id: string;
  name: string;
  description: string | null;
  category: string;
  unit: string;
  unit_cost: number;
  quantity_available: number;
  minimum_stock_level: number;
  supplier_name: string | null;
  supplier_contact: string | null;
  last_ordered_date: string | null;
  location: string | null;
  material_code: string | null;
  is_active: boolean;
  created_at: string;
}

export interface MaterialUsage {
  id: string;
  material_id: string;
  project_id: string;
  quantity_used: number;
  unit_cost: number;
  total_cost: number;
  date_used: string;
  notes: string | null;
  materials?: { name: string } | null;
  projects?: { name: string } | null;
}

export type NewMaterial = Omit<TablesInsert<'materials'>, 'company_id' | 'created_by'>;

export interface NewMaterialUsage {
  material_id: string;
  project_id: string;
  quantity_used: number;
  unit_cost: number;
  notes: string;
}

export const materialTrackingKey = (companyId: string | undefined) => ['material-tracking', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchMaterialTracking(
  companyId: string
): Promise<{ materials: Material[]; usage: MaterialUsage[]; projects: { id: string; name: string; status: string }[] }> {
  const [materials, usage, projects] = await Promise.all([
    supabase.from('materials').select('*').eq('company_id', companyId).eq('is_active', true).order('name'),
    supabase
      .from('material_usage')
      .select('*, materials!inner(name, company_id), projects(name)')
      .eq('materials.company_id', companyId)
      .order('date_used', { ascending: false })
      .limit(50),
    supabase
      .from('projects')
      .select('id, name, status')
      .eq('company_id', companyId)
      .in('status', ['active', 'in_progress'])
      .order('name'),
  ]);
  const failed = [materials, usage, projects].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    materials: (materials.data ?? []) as unknown as Material[],
    usage: (usage.data ?? []) as unknown as MaterialUsage[],
    projects: (projects.data ?? []) as { id: string; name: string; status: string }[],
  };
}

export async function createMaterial(companyId: string, userId: string | undefined, material: NewMaterial): Promise<void> {
  const { data, error } = await supabase
    .from('materials')
    .insert([{ ...material, company_id: companyId, created_by: userId }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The material was not created. You may not have permission to add materials.');
}

/** Records the usage, then takes it off the material's stock. */
export async function recordMaterialUsage(
  material: Pick<Material, 'id' | 'unit_cost' | 'quantity_available'>,
  userId: string | undefined,
  usage: NewMaterialUsage
): Promise<void> {
  const unitCost = usage.unit_cost || material.unit_cost;
  const { data, error } = await supabase
    .from('material_usage')
    .insert([{ ...usage, unit_cost: unitCost, total_cost: usage.quantity_used * unitCost, used_by: userId }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The usage was not recorded. You may not have permission to record material usage.');

  const { data: updated, error: updateError } = await supabase
    .from('materials')
    .update({ quantity_available: material.quantity_available - usage.quantity_used })
    .eq('id', material.id)
    .select('id');
  if (updateError) throw new Error(`The usage was recorded but the stock count was not updated: ${updateError.message}`);
  requireRows(updated, 'The usage was recorded but the stock count was not updated.');
}

export function useMaterialTracking() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = materialTrackingKey(companyId);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchMaterialTracking(companyId as string),
    enabled: !!companyId,
  });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const create = useMutation({
    mutationFn: (material: NewMaterial) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return createMaterial(companyId, user?.id, material);
    },
    onSettled: invalidate,
  });
  const recordUsage = useMutation({
    mutationFn: ({ material, usage }: { material: Material; usage: NewMaterialUsage }) =>
      recordMaterialUsage(material, user?.id, usage),
    onSettled: invalidate,
  });

  return {
    materials: query.data?.materials ?? [],
    usage: query.data?.usage ?? [],
    projects: query.data?.projects ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    invalidate,
    create: (material: NewMaterial) => create.mutateAsync(material),
    recordUsage: (material: Material, usage: NewMaterialUsage) => recordUsage.mutateAsync({ material, usage }),
  };
}
