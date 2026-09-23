/**
 * Who is on a scheduled task, and who could be (US-329; moved onto a query for US-266).
 *
 * ScheduleTaskAssignees renders once per task row. It loaded the whole active
 * crew per row in a useEffect, and a failed read was logged and rendered as
 * "Nobody assigned". The crew list is one cached query per company now, shared
 * by every row, and a failed read is returned for the widget to say so.
 *
 * Assigning writes one schedule_task_assignees row; the database trigger
 * writes the crew_assignments row and the notification. Both writes select
 * back so a write RLS refused fails instead of reporting "is scheduled".
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ScheduleCrewMember {
  id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
}

export interface ScheduleAssigneeRow {
  id: string;
  crew_member_id: string;
}

export const scheduleCrewOptionsKey = (companyId: string | undefined) => ['schedule-crew-options', companyId] as const;
export const scheduleTaskAssigneesKey = (companyId: string | undefined, scheduleTaskId: string) =>
  ['schedule-task-assignees', companyId, scheduleTaskId] as const;

export async function fetchScheduleCrewOptions(companyId: string): Promise<ScheduleCrewMember[]> {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, role')
    .eq('company_id', companyId)
    .eq('is_active', true)
    .order('first_name');
  if (error) throw error;
  return (data ?? []) as ScheduleCrewMember[];
}

export async function fetchScheduleTaskAssignees(scheduleTaskId: string): Promise<ScheduleAssigneeRow[]> {
  const { data, error } = await supabase
    .from('schedule_task_assignees')
    .select('id, crew_member_id')
    .eq('schedule_task_id', scheduleTaskId);
  if (error) throw error;
  return (data ?? []) as ScheduleAssigneeRow[];
}

export interface AssignCrewInput {
  scheduleTaskId: string;
  projectId: string;
  companyId: string;
  crewMemberId: string;
  createdBy: string;
}

export async function assignCrewToTask(input: AssignCrewInput): Promise<void> {
  const { data, error } = await supabase
    .from('schedule_task_assignees')
    .insert({
      schedule_task_id: input.scheduleTaskId,
      project_id: input.projectId,
      company_id: input.companyId,
      crew_member_id: input.crewMemberId,
      created_by: input.createdBy,
    } as never)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The assignment was not saved. You may not have permission to schedule this crew.');
  }
}

export async function unassignCrewFromTask(id: string): Promise<void> {
  const { data, error } = await supabase.from('schedule_task_assignees').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The assignment was not removed. You may not have permission to change it.');
  }
}

export function useScheduleTaskAssignees(scheduleTaskId: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = scheduleTaskAssigneesKey(companyId, scheduleTaskId);

  const crew = useQuery({
    queryKey: scheduleCrewOptionsKey(companyId),
    queryFn: () => fetchScheduleCrewOptions(companyId as string),
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
  });
  const assignees = useQuery({
    queryKey: key,
    queryFn: () => fetchScheduleTaskAssignees(scheduleTaskId),
    enabled: !!companyId && !!scheduleTaskId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const assign = useMutation({ mutationFn: assignCrewToTask, onSettled: invalidate });
  const unassign = useMutation({ mutationFn: unassignCrewFromTask, onSettled: invalidate });

  return {
    crew: crew.data ?? [],
    assignees: assignees.data ?? [],
    error: (crew.error ?? assignees.error) as Error | null,
    refetch: () => {
      void crew.refetch();
      void assignees.refetch();
    },
    assign: assign.mutateAsync,
    unassign: unassign.mutateAsync,
  };
}
