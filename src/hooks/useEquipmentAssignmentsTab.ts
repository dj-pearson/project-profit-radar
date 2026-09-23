/**
 * Assignments, fleet and project names for the equipment assignments tab,
 * plus the "return" write (US-266).
 *
 * Moved out of EquipmentAssignmentsTab. The inline read checked only the
 * assignments table, so a failed equipment read showed a fleet of zero and
 * utilization of 0% as though that were the truth.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { AssignmentLike, EquipmentLike } from '@/lib/equipment/utilization';

export interface AssignmentRow extends AssignmentLike {
  id: string;
  assigned_quantity: number | null;
}

export interface EquipmentRow extends EquipmentLike {
  id: string;
  name: string;
  status: string | null;
}

export interface EquipmentAssignmentsData {
  assignments: AssignmentRow[];
  equipment: EquipmentRow[];
  projectNames: Map<string, string>;
}

export const equipmentAssignmentsTabKey = (companyId: string | undefined) =>
  ['equipment-assignments-tab', companyId] as const;

export async function fetchEquipmentAssignments(companyId: string): Promise<EquipmentAssignmentsData> {
  const [assignmentsRes, equipmentRes, projectsRes] = await Promise.all([
    supabase
      .from('equipment_assignments')
      .select(
        'id, equipment_id, project_id, start_date, end_date, planned_start_date, planned_end_date, actual_start_date, actual_end_date, assignment_status, assigned_quantity'
      )
      .eq('company_id', companyId),
    supabase.from('equipment').select('id, name, status').eq('company_id', companyId),
    supabase.from('projects').select('id, name').eq('company_id', companyId),
  ]);
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (equipmentRes.error) throw equipmentRes.error;
  if (projectsRes.error) throw projectsRes.error;
  return {
    assignments: (assignmentsRes.data ?? []) as AssignmentRow[],
    equipment: (equipmentRes.data ?? []) as EquipmentRow[],
    projectNames: new Map(
      ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
    ),
  };
}

/** Closes the assignment, then frees the equipment so it can be re-assigned. */
export async function returnEquipment(assignment: Pick<AssignmentRow, 'id' | 'equipment_id'>): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  const { data: closed, error: aErr } = await supabase
    .from('equipment_assignments')
    .update({ actual_end_date: today, assignment_status: 'completed' })
    .eq('id', assignment.id)
    .select('id');
  if (aErr) throw aErr;
  if (!closed || closed.length === 0) {
    throw new Error('The assignment was not closed. You may not have permission to edit it.');
  }
  const { error: eErr } = await supabase
    .from('equipment')
    .update({ status: 'available' })
    .eq('id', assignment.equipment_id);
  if (eErr) throw eErr;
}

export function useEquipmentAssignmentsTab() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: equipmentAssignmentsTabKey(companyId),
    enabled: !!companyId,
    queryFn: () => fetchEquipmentAssignments(companyId as string),
  });

  const invalidate = (alsoEquipment = true) => {
    void queryClient.invalidateQueries({ queryKey: equipmentAssignmentsTabKey(companyId) });
    if (alsoEquipment) void queryClient.invalidateQueries({ queryKey: ['equipment'] });
  };

  const returnAssignment = useMutation({
    mutationFn: returnEquipment,
    onSettled: () => invalidate(),
  });

  return { ...query, returnAssignment, invalidate };
}
