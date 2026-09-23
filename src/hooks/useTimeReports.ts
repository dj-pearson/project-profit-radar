/**
 * The reads behind /time-reports (US-266).
 *
 * TimeReports loaded projects, time entries and employee names in a useEffect.
 * A failed read toasted and then rendered "No time entries in this range",
 * which on a payroll report reads as nobody worked. The report shows the error
 * now. A failed name lookup still only costs the names: entries are grouped by
 * user id either way, and the report is usable without them.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';
import type { TimeEntryInput, ProjectMeta, EmployeeMeta } from '@/lib/reports/timeReports';

export interface TimeReportData {
  projects: ProjectMeta[];
  entries: TimeEntryInput[];
  employees: EmployeeMeta[];
}

export const timeReportsKey = (companyId: string | undefined) => ['time-entries', companyId, 'reports'] as const;

export async function fetchTimeReportData(companyId: string): Promise<TimeReportData> {
  const { data: projData, error: projErr } = await supabase
    .from('projects')
    .select('id, name, estimated_hours')
    .eq('company_id', companyId);
  if (projErr) throw projErr;
  const projects = (projData ?? []) as ProjectMeta[];

  let entries: TimeEntryInput[] = [];
  const projectIds = projects.map((p) => p.id);
  if (projectIds.length > 0) {
    const { data: entryData, error: entryErr } = await supabase
      .from('time_entries')
      .select('id, user_id, project_id, start_time, end_time, total_hours, break_duration')
      .in('project_id', projectIds)
      .order('start_time', { ascending: false });
    if (entryErr) throw entryErr;
    entries = (entryData ?? []) as TimeEntryInput[];
  }

  const { data: empData, error: empErr } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, email')
    .eq('company_id', companyId);
  if (empErr) logger.warn('Time reports: employee names could not be loaded', empErr);
  const employees = ((empData ?? []) as { id: string; first_name: string | null; last_name: string | null; email: string }[])
    .map((u) => ({
      id: u.id,
      name: [u.first_name, u.last_name].filter(Boolean).join(' ').trim() || u.email,
    }));

  return { projects, entries, employees };
}

const EMPTY: TimeReportData = { projects: [], entries: [], employees: [] };

export function useTimeReports() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: timeReportsKey(companyId),
    queryFn: () => fetchTimeReportData(companyId as string),
    enabled: !!companyId,
  });
  const data = query.data ?? EMPTY;
  return {
    ...data,
    isLoading: query.isLoading || !companyId,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
