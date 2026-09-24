/**
 * Projects, crew and the day's assignments for /crew-scheduling (US-266).
 *
 * The page caught a failed assignment read into console.error, so the day
 * showed "no assignments" and the conflict check ran against an empty list: a
 * second booking for the same person and hours went through. Every crew
 * member carried an invented Monday-to-Friday availability and an "Available"
 * badge whatever the schedule said. Status changes and deletes reported
 * success on a write RLS filtered to zero rows.
 *
 * Reads throw, writes select the row back, and a write also refreshes the crew
 * schedule board (crewBoardKey), which reads the same table.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { crewBoardKey } from './useCrewScheduleBoard';

export interface CrewProject {
  id: string;
  name: string;
  description: string | null;
  site_address: string | null;
}

export interface CrewMember {
  id: string;
  name: string;
  role: string;
  phone?: string | null;
}

export type CrewAssignmentStatus = 'scheduled' | 'dispatched' | 'in_progress' | 'completed' | 'cancelled';

export interface CrewAssignment {
  id: string;
  project_id: string;
  project_name: string;
  crew_member_id: string;
  crew_member_name: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  status: CrewAssignmentStatus;
  notes?: string | null;
}

export interface NewCrewAssignment {
  project_id: string;
  crew_member_id: string;
  date: string;
  start_time: string;
  end_time: string;
  location: string;
  notes: string;
}

export const CREW_ROLES = [
  'admin', 'superintendent', 'project_manager', 'foreman', 'field_supervisor',
  'technician', 'equipment_operator', 'journeyman', 'apprentice', 'laborer',
];

export const crewSchedulingKey = (companyId: string | undefined) => ['crew-scheduling', companyId] as const;

function requireRows(data: unknown[] | null, message: string) {
  if (!data || data.length === 0) throw new Error(message);
}

export async function fetchCrewRoster(companyId: string): Promise<{ projects: CrewProject[]; crew: CrewMember[] }> {
  const [projects, crew] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, description, site_address')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .order('name'),
    supabase
      .from('user_profiles')
      .select('id, first_name, last_name, role, phone')
      .eq('company_id', companyId)
      .in('role', CREW_ROLES as never)
      .eq('is_active', true)
      .order('first_name'),
  ]);
  if (projects.error) throw projects.error;
  if (crew.error) throw crew.error;
  return {
    projects: (projects.data ?? []) as CrewProject[],
    crew: (crew.data ?? []).map((m) => ({
      id: m.id,
      name: [m.first_name, m.last_name].filter(Boolean).join(' ') || 'Unnamed user',
      role: m.role as string,
      phone: m.phone,
    })),
  };
}

export async function fetchCrewAssignments(companyId: string, date: string): Promise<CrewAssignment[]> {
  const { data, error } = await supabase
    .from('crew_assignments')
    .select('*, projects(name, site_address), crew_member:user_profiles!crew_member_id(first_name, last_name)')
    .eq('company_id', companyId)
    .eq('assigned_date', date)
    .order('start_time');
  if (error) throw error;
  return (data ?? []).map((a) => {
    const row = a as typeof a & {
      projects: { name: string | null; site_address: string | null } | null;
      crew_member: { first_name: string | null; last_name: string | null } | null;
    };
    return {
      id: row.id,
      project_id: row.project_id,
      project_name: row.projects?.name || '',
      crew_member_id: row.crew_member_id,
      crew_member_name: [row.crew_member?.first_name, row.crew_member?.last_name].filter(Boolean).join(' ') || 'Unknown',
      date: row.assigned_date,
      start_time: row.start_time,
      end_time: row.end_time,
      location: row.location || row.projects?.site_address || '',
      status: row.status as CrewAssignmentStatus,
      notes: row.notes,
    };
  });
}

export async function createCrewAssignment(
  companyId: string,
  userId: string | undefined,
  a: NewCrewAssignment
): Promise<void> {
  const { data, error } = await supabase
    .from('crew_assignments')
    .insert([{
      company_id: companyId,
      project_id: a.project_id,
      crew_member_id: a.crew_member_id,
      assigned_date: a.date,
      start_time: a.start_time,
      end_time: a.end_time,
      location: a.location,
      notes: a.notes,
      created_by: userId,
    }])
    .select('id');
  if (error) throw error;
  requireRows(data, 'The assignment was not created. You may not have permission to schedule crew.');
}

export async function setCrewAssignmentStatus(id: string, status: string): Promise<void> {
  const { data, error } = await supabase.from('crew_assignments').update({ status }).eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The assignment was not changed. You may not have permission to edit it.');
}

export async function deleteCrewAssignment(id: string): Promise<void> {
  const { data, error } = await supabase.from('crew_assignments').delete().eq('id', id).select('id');
  if (error) throw error;
  requireRows(data, 'The assignment was not deleted. You may not have permission to delete it.');
}

export function useCrewScheduling(date: string) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = crewSchedulingKey(companyId);

  const roster = useQuery({
    queryKey: [...key, 'roster'],
    queryFn: () => fetchCrewRoster(companyId as string),
    enabled: !!companyId,
  });
  const day = useQuery({
    queryKey: [...key, 'day', date],
    queryFn: () => fetchCrewAssignments(companyId as string, date),
    enabled: !!companyId && !!date,
  });

  const invalidate = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: key }),
      queryClient.invalidateQueries({ queryKey: crewBoardKey(companyId) }),
    ]);

  const create = useMutation({
    mutationFn: (a: NewCrewAssignment) => {
      if (!companyId) throw new Error('Your account is not linked to a company.');
      return createCrewAssignment(companyId, user?.id, a);
    },
    onSettled: invalidate,
  });
  const setStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) => setCrewAssignmentStatus(id, status),
    onSettled: invalidate,
  });
  const remove = useMutation({ mutationFn: deleteCrewAssignment, onSettled: invalidate });

  return {
    projects: roster.data?.projects ?? [],
    crewMembers: roster.data?.crew ?? [],
    assignments: day.data ?? [],
    isLoading: roster.isLoading,
    assignmentsLoading: day.isLoading,
    error: (roster.error ?? day.error) as Error | null,
    refetch: () => Promise.all([roster.refetch(), day.refetch()]),
    invalidate,
    create: (a: NewCrewAssignment) => create.mutateAsync(a),
    setStatus: (id: string, status: string) => setStatus.mutateAsync({ id, status }),
    remove: (id: string) => remove.mutateAsync(id),
  };
}
