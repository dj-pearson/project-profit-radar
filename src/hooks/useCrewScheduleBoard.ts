/**
 * Data for the weekly crew scheduling board (US-266).
 *
 * Moved out of CrewScheduleBoard. The inline version checked only the crew
 * read, so a failed crew_assignments read rendered an empty week: every
 * worker listed as unassigned, which is the one wrong answer a scheduler
 * acts on. Every read is checked here.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { BoardAssignment, BoardCrewMember } from '@/lib/scheduling/crewBoard';

export const CREW_ROLES = [
  'admin', 'superintendent', 'project_manager', 'foreman', 'field_supervisor',
  'technician', 'equipment_operator', 'journeyman', 'apprentice', 'laborer',
] as const;

export const crewBoardKey = (companyId: string | undefined) => ['crew-board', companyId] as const;
export const crewBoardWeekKey = (companyId: string | undefined, weekStart: string) =>
  [...crewBoardKey(companyId), weekStart] as const;

export interface CrewBoardData {
  crew: BoardCrewMember[];
  assignments: BoardAssignment[];
}

export async function fetchCrewBoard(companyId: string, firstDay: string, lastDay: string): Promise<CrewBoardData> {
  const [crewRes, assignmentsRes, projectsRes] = await Promise.all([
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, role')
      .eq('company_id', companyId)
      .in('role', CREW_ROLES)
      .eq('is_active', true)
      .order('first_name'),
    supabase
      .from('crew_assignments')
      .select('id, crew_member_id, project_id, assigned_date, start_time, end_time, status')
      .eq('company_id', companyId)
      .gte('assigned_date', firstDay)
      .lte('assigned_date', lastDay),
    supabase.from('projects').select('id, name').eq('company_id', companyId),
  ]);
  if (crewRes.error) throw crewRes.error;
  if (assignmentsRes.error) throw assignmentsRes.error;
  if (projectsRes.error) throw projectsRes.error;

  const projectNames = new Map(
    ((projectsRes.data ?? []) as { id: string; name: string }[]).map((p) => [p.id, p.name])
  );
  const crew: BoardCrewMember[] = ((crewRes.data ?? []) as {
    id: string; first_name: string | null; last_name: string | null; role: string | null;
  }[]).map((m) => ({
    id: m.id,
    name: `${m.first_name ?? ''} ${m.last_name ?? ''}`.trim() || 'Unnamed',
    role: m.role,
  }));
  const assignments: BoardAssignment[] = ((assignmentsRes.data ?? []) as BoardAssignment[]).map((a) => ({
    ...a,
    project_name: projectNames.get(a.project_id) ?? 'Project',
  }));
  return { crew, assignments };
}

export interface MoveAssignmentInput {
  id: string;
  crew_member_id: string;
  assigned_date: string;
}

export async function moveCrewAssignment(vars: MoveAssignmentInput): Promise<void> {
  const { data, error } = await supabase
    .from('crew_assignments')
    .update({ crew_member_id: vars.crew_member_id, assigned_date: vars.assigned_date })
    .eq('id', vars.id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The assignment was not moved. You may not have permission to edit the schedule.');
  }
}

export function useCrewScheduleBoard(weekStart: string, weekDays: string[]) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: crewBoardWeekKey(companyId, weekStart),
    enabled: !!companyId,
    queryFn: () => fetchCrewBoard(companyId as string, weekDays[0], weekDays[6]),
  });

  const move = useMutation({
    mutationFn: moveCrewAssignment,
    // Moving across a week boundary changes two weeks, so refresh them all.
    onSettled: () => queryClient.invalidateQueries({ queryKey: crewBoardKey(companyId) }),
  });

  return { ...query, move };
}
