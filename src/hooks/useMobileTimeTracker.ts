/**
 * Reads and writes behind the mobile time tracker (US-266).
 *
 * MobileTimeTracker read projects, cost codes, tasks, crew, today's entries and
 * the user's open entry in useEffects. A failed or empty project read filled
 * the picker with two invented jobs ("Downtown Office Complex", id "proj-1")
 * and three invented cost codes, so a worker could clock in against a project
 * that does not exist and lose the shift at save. The pickers show what the
 * company has now, and a failed read is returned as an error.
 *
 * Updates select the id back so a clock-out RLS filtered to zero rows fails
 * instead of reporting "Time Tracking Stopped" over a still-open entry.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert, TablesUpdate } from '@/integrations/supabase/types';
import { timeEntriesKey } from '@/hooks/useMyTimeTracking';

export interface TrackerProjectOption {
  id: string;
  name: string;
  client_name: string;
  site_address?: string | null;
  site_latitude?: number | null;
  site_longitude?: number | null;
  geofence_radius_meters?: number | null;
}

export interface TrackerCostCodeOption {
  id: string;
  code: string;
  name: string;
  category?: string | null;
  is_active?: boolean | null;
}

export interface TrackerTaskOption {
  id: string;
  name: string;
  status: string;
}

export interface TrackerCrewMember {
  id: string;
  name: string;
  role: string;
  hourly_rate: number;
  is_present: boolean;
}

export const trackerOptionsKey = (companyId: string | undefined) =>
  ['projects', companyId, 'mobile-time-tracker'] as const;
export const trackerProjectKey = (companyId: string | undefined, projectId: string) =>
  [...timeEntriesKey(companyId), 'mobile-tracker-project', projectId] as const;
export const activeEntryKey = (companyId: string | undefined, userId: string | undefined) =>
  [...timeEntriesKey(companyId), 'active', userId] as const;

const todayDate = () => new Date().toISOString().split('T')[0];

export async function fetchTrackerOptions(companyId: string): Promise<{
  projects: TrackerProjectOption[];
  costCodes: TrackerCostCodeOption[];
}> {
  const [projects, costCodes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, client_name, site_address, site_latitude, site_longitude, geofence_radius_meters')
      .eq('company_id', companyId)
      .eq('status', 'active'),
    supabase.from('cost_codes').select('*').eq('company_id', companyId).eq('is_active', true),
  ]);
  if (projects.error) throw projects.error;
  if (costCodes.error) throw costCodes.error;
  return {
    projects: (projects.data ?? []) as TrackerProjectOption[],
    costCodes: (costCodes.data ?? []) as TrackerCostCodeOption[],
  };
}

/** Active tasks, the assigned crew and today's entries for one project. */
export async function fetchTrackerProjectData<Entry>(companyId: string, projectId: string): Promise<{
  tasks: TrackerTaskOption[];
  crew: TrackerCrewMember[];
  entries: Entry[];
}> {
  const today = todayDate();
  const [tasks, crew, entries] = await Promise.all([
    supabase.from('tasks').select('id, name, status').eq('project_id', projectId).eq('status', 'active'),
    supabase
      .from('user_profiles')
      .select(`
        id,
        first_name,
        last_name,
        role,
        crew_assignments!inner(project_id)
      `)
      .eq('company_id', companyId)
      .eq('crew_assignments.project_id', projectId)
      .eq('is_active', true),
    supabase
      .from('time_entries')
      .select(`
        *,
        user_profiles(first_name, last_name),
        tasks(name),
        cost_codes(code, name)
      `)
      .eq('project_id', projectId)
      .gte('start_time', `${today}T00:00:00`)
      .lt('start_time', `${today}T23:59:59`)
      .order('start_time', { ascending: false }),
  ]);
  if (tasks.error) throw tasks.error;
  if (crew.error) throw crew.error;
  if (entries.error) throw entries.error;
  return {
    tasks: (tasks.data ?? []) as TrackerTaskOption[],
    crew: ((crew.data ?? []) as { id: string; first_name: string; last_name: string; role: string }[]).map((m) => ({
      id: m.id,
      name: `${m.first_name} ${m.last_name}`,
      role: m.role,
      hourly_rate: 25, // Default hourly rate
      is_present: false,
    })),
    entries: (entries.data ?? []) as unknown as Entry[],
  };
}

/** The user's entry started today with no end time, if any. */
export async function fetchActiveTimeEntry<Entry>(userId: string): Promise<Entry | null> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .gte('start_time', `${todayDate()}T00:00:00`)
    .is('end_time', null)
    .maybeSingle();
  if (error) throw error;
  return (data ?? null) as unknown as Entry | null;
}

export async function startTimeEntry<Entry>(row: TablesInsert<'time_entries'>): Promise<Entry> {
  const { data, error } = await supabase.from('time_entries').insert(row).select().single();
  if (error) throw error;
  return data as unknown as Entry;
}

export async function updateTimeEntry(id: string, patch: TablesUpdate<'time_entries'>): Promise<void> {
  const { data, error } = await supabase.from('time_entries').update(patch).eq('id', id).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The time entry was not updated. You may not have permission to edit it.');
  }
}

export function useMobileTimeTracker<Entry>(selectedProjectId: string) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;
  const queryClient = useQueryClient();

  const options = useQuery({
    queryKey: trackerOptionsKey(companyId),
    queryFn: () => fetchTrackerOptions(companyId as string),
    enabled: !!companyId,
  });
  const project = useQuery({
    queryKey: trackerProjectKey(companyId, selectedProjectId),
    queryFn: () => fetchTrackerProjectData<Entry>(companyId as string, selectedProjectId),
    enabled: !!companyId && !!selectedProjectId,
  });
  const active = useQuery({
    queryKey: activeEntryKey(companyId, userId),
    queryFn: () => fetchActiveTimeEntry<Entry>(userId as string),
    enabled: !!userId,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: timeEntriesKey(companyId) });

  const start = useMutation({
    mutationFn: (row: TablesInsert<'time_entries'>) => startTimeEntry<Entry>(row),
    onSettled: invalidate,
  });
  const update = useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: TablesUpdate<'time_entries'> }) => updateTimeEntry(id, patch),
    onSettled: invalidate,
  });

  return {
    projects: options.data?.projects ?? [],
    costCodes: options.data?.costCodes ?? [],
    optionsError: options.error as Error | null,
    refetchOptions: options.refetch,
    tasks: project.data?.tasks ?? [],
    crewMembers: project.data?.crew ?? [],
    dailyEntries: project.data?.entries ?? [],
    projectError: project.error as Error | null,
    refetchProject: project.refetch,
    activeEntry: active.data,
    activeEntryLoaded: active.isSuccess,
    start,
    update,
  };
}
