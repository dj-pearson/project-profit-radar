/**
 * Pickers and the save behind EquipmentAssignmentForm (US-266).
 *
 * The form read projects and equipment in a useEffect. A failed equipment read,
 * or a company with no equipment yet, filled the picker with six made-up
 * machines ("Excavator CAT 320", id "eq-1"); choosing one could only fail at
 * save, since equipment_id is a uuid foreign key. The picker shows what the
 * company has, and a failed read is returned as an error.
 *
 * The update selects its id back so an edit RLS filtered to zero rows fails
 * instead of toasting "updated successfully". A save invalidates the
 * assignments tab and the equipment list, which both show assignments.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { equipmentAssignmentsTabKey } from '@/hooks/useEquipmentAssignmentsTab';

export interface AssignmentProjectOption {
  id: string;
  name: string;
}

export interface AssignmentEquipmentOption {
  id: string;
  name: string;
  type: string;
}

export const assignmentFormOptionsKey = (companyId: string | undefined) =>
  ['equipment', companyId, 'assignment-form-options'] as const;

export async function fetchAssignmentFormOptions(companyId: string): Promise<{
  projects: AssignmentProjectOption[];
  equipment: AssignmentEquipmentOption[];
}> {
  const [projects, equipment] = await Promise.all([
    supabase.from('projects').select('id, name').eq('company_id', companyId).order('name'),
    supabase
      .from('equipment')
      .select('id, name, equipment_type, model, status')
      .eq('company_id', companyId)
      .order('name'),
  ]);
  if (projects.error) throw projects.error;
  if (equipment.error) throw equipment.error;
  return {
    projects: (projects.data ?? []) as AssignmentProjectOption[],
    equipment: ((equipment.data ?? []) as { id: string; name: string; equipment_type: string | null; model: string | null }[])
      .map((eq) => ({
        id: eq.id,
        name: `${eq.name}${eq.model ? ` ${eq.model}` : ''}`,
        type: eq.equipment_type || 'Equipment',
      })),
  };
}

export async function saveEquipmentAssignment(
  assignmentId: string | undefined,
  row: TablesInsert<'equipment_assignments'>,
): Promise<void> {
  const { data, error } = assignmentId
    ? await supabase
      .from('equipment_assignments')
      .update(row as TablesUpdate<'equipment_assignments'>)
      .eq('id', assignmentId)
      .select('id')
    : await supabase.from('equipment_assignments').insert([row]).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The assignment was not saved. You may not have permission to schedule equipment.');
  }
}

export function useEquipmentAssignmentForm() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const options = useQuery({
    queryKey: assignmentFormOptionsKey(companyId),
    queryFn: () => fetchAssignmentFormOptions(companyId as string),
    enabled: !!companyId,
  });

  const save = useMutation({
    mutationFn: ({ assignmentId, row }: { assignmentId?: string; row: TablesInsert<'equipment_assignments'> }) =>
      saveEquipmentAssignment(assignmentId, row),
    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: equipmentAssignmentsTabKey(companyId) });
      void queryClient.invalidateQueries({ queryKey: ['equipment'] });
    },
  });

  return {
    projects: options.data?.projects ?? [],
    equipment: options.data?.equipment ?? [],
    optionsLoading: options.isLoading,
    optionsError: options.error as Error | null,
    refetchOptions: options.refetch,
    save,
  };
}
