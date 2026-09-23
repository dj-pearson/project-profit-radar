/**
 * The crew on a daily report and the timesheets it is reconciled against
 * (US-330; moved onto a query for US-266).
 *
 * DailyReportCrewPanel loaded both in a useEffect, toasted on a failed read
 * and then rendered the empty crew anyway, next to a "this report and the
 * timesheets disagree" alert computed from rows it never got. A failed crew or
 * time-entry read is thrown now, for the panel to show instead of a
 * reconciliation.
 *
 * Hour edits are optimistic (the inputs write on every change) and roll back
 * when the update fails or RLS filters it to zero rows. The pull is the
 * sync_daily_report_crew RPC, so it behaves the same from web, the mobile
 * report and iOS.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { TimeEntryLike } from '@/lib/dailyReportField';

export interface DailyReportCrewItem {
  id: string;
  user_id: string | null;
  crew_member_name: string;
  role: string | null;
  hours_worked: number | null;
  overtime_hours: number | null;
}

export interface DailyReportCrew {
  items: DailyReportCrewItem[];
  timesheet: TimeEntryLike[];
}

export type CrewHoursField = 'hours_worked' | 'overtime_hours';

export const dailyReportCrewKey = (
  companyId: string | undefined,
  dailyReportId: string,
  projectId: string,
  reportDate: string,
) => ['daily-report-crew', companyId, dailyReportId, projectId, reportDate] as const;

export async function fetchDailyReportCrew(
  dailyReportId: string,
  projectId: string,
  reportDate: string,
): Promise<DailyReportCrew> {
  const [{ data: crew, error: crewError }, { data: entries, error: entryError }] = await Promise.all([
    supabase
      .from('daily_report_crew_items')
      .select('id, user_id, crew_member_name, role, hours_worked, overtime_hours')
      .eq('daily_report_id', dailyReportId)
      .order('crew_member_name'),
    // No embed. time_entries.user_id has no foreign key to user_profiles -
    // no migration creates one, and the generated types list only the
    // cost_code, geofence and project constraints - so both the bare embed
    // and the named-constraint hint return a SelectQueryError rather than
    // rows. The names are fetched separately below.
    supabase
      .from('time_entries')
      .select('user_id, total_hours')
      .eq('project_id', projectId)
      .gte('start_time', `${reportDate}T00:00:00`)
      .lte('start_time', `${reportDate}T23:59:59`),
  ]);
  if (crewError) throw crewError;
  if (entryError) throw entryError;

  const rows = (entries ?? []) as Array<{ user_id: string; total_hours: number | null }>;
  const userIds = [...new Set(rows.map((r) => r.user_id).filter(Boolean))];

  // One extra query rather than an embed that cannot resolve. A failure here
  // costs the names, not the hours, so the reconciliation still works.
  const people = new Map<string, { first_name: string | null; last_name: string | null; role: string | null }>();
  if (userIds.length > 0) {
    const { data: profiles, error: profileError } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name, role')
      .in('id', userIds);
    if (profileError) {
      logger.error('Could not load crew names for the timesheet comparison', profileError);
    }
    for (const p of profiles ?? []) {
      people.set(p.id, { first_name: p.first_name, last_name: p.last_name, role: p.role });
    }
  }

  const timesheet = rows.map((e) => ({
    user_id: e.user_id,
    total_hours: e.total_hours,
    first_name: people.get(e.user_id)?.first_name,
    last_name: people.get(e.user_id)?.last_name,
    role: people.get(e.user_id)?.role,
  }));

  return { items: (crew ?? []) as DailyReportCrewItem[], timesheet };
}

export async function updateCrewHours(id: string, field: CrewHoursField, value: number): Promise<void> {
  const { data, error } = await supabase
    .from('daily_report_crew_items')
    .update({ [field]: value } as never)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The hours were not saved. You may not have permission to edit this report.');
  }
}

export async function deleteCrewItem(id: string): Promise<void> {
  const { data, error } = await supabase.from('daily_report_crew_items').delete().eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('They were not removed. You may not have permission to edit this report.');
  }
}

/** Returns how many crew rows the database added from the day's time entries. */
export async function pullCrewFromTimesheets(dailyReportId: string): Promise<number> {
  const { data, error } = await supabase.rpc('sync_daily_report_crew', { p_daily_report_id: dailyReportId });
  if (error) throw error;
  return (data as number | null) ?? 0;
}

export function useDailyReportCrew(dailyReportId: string, projectId: string, reportDate: string) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = dailyReportCrewKey(companyId, dailyReportId, projectId, reportDate);

  const query = useQuery({
    queryKey: key,
    queryFn: () => fetchDailyReportCrew(dailyReportId, projectId, reportDate),
    enabled: !!dailyReportId && !!projectId && !!reportDate,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });

  const setHours = useMutation({
    mutationFn: ({ id, field, value }: { id: string; field: CrewHoursField; value: number }) =>
      updateCrewHours(id, field, value),
    onMutate: async ({ id, field, value }) => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DailyReportCrew>(key);
      if (previous) {
        queryClient.setQueryData<DailyReportCrew>(key, {
          ...previous,
          items: previous.items.map((i) => (i.id === id ? { ...i, [field]: value } : i)),
        });
      }
      return { previous };
    },
    onError: (_error, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(key, context.previous);
    },
  });

  const remove = useMutation({ mutationFn: deleteCrewItem, onSettled: invalidate });
  const pull = useMutation({ mutationFn: pullCrewFromTimesheets, onSettled: invalidate });

  return {
    items: query.data?.items ?? [],
    timesheet: query.data?.timesheet ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    setHours: (id: string, field: CrewHoursField, value: number) => setHours.mutateAsync({ id, field, value }),
    remove: (id: string) => remove.mutateAsync(id),
    pull: () => pull.mutateAsync(dailyReportId),
    isPulling: pull.isPending,
  };
}
