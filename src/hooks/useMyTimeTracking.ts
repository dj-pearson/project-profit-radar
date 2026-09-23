/**
 * The signed-in user's own time entries and projects, for the time-tracking
 * dashboard and the quick time entry form (US-266).
 *
 * Both components queried supabase themselves: the dashboard under keys with
 * no company in them, the quick-entry form in a useEffect that swallowed a
 * failed project read and left the picker empty. They share these queries now,
 * keyed by company and user, and a quick entry invalidates the dashboard's
 * list. The project list keeps the filter both screens used (projects the user
 * created).
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import type { TablesInsert } from '@/integrations/supabase/types';

export interface MyProjectOption {
  id: string;
  name: string;
}

export const timeEntriesKey = (companyId: string | undefined) => ['time-entries', companyId] as const;
export const myTimeEntriesKey = (companyId: string | undefined, userId: string | undefined) =>
  [...timeEntriesKey(companyId), 'mine', userId] as const;
export const myProjectsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['projects', companyId, 'created-by', userId] as const;

/** The ten most recent entries; an open one (no end_time) is the running timer. */
export async function fetchMyTimeEntries<Row>(userId: string): Promise<Row[]> {
  const { data, error } = await supabase
    .from('time_entries')
    .select('*')
    .eq('user_id', userId)
    .order('start_time', { ascending: false })
    .limit(10);
  if (error) throw error;
  return (data ?? []) as unknown as Row[];
}

export async function fetchMyProjects(userId: string): Promise<MyProjectOption[]> {
  const { data, error } = await supabase
    .from('projects')
    .select('id, name')
    .eq('created_by', userId)
    .order('name', { ascending: true });
  if (error) throw error;
  return (data ?? []) as MyProjectOption[];
}

export async function insertMyTimeEntry(row: TablesInsert<'time_entries'>): Promise<void> {
  const { data, error } = await supabase.from('time_entries').insert(row).select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The time entry was not saved. You may not have permission to log time.');
  }
}

function useIds() {
  const { user, userProfile } = useAuth();
  return { userId: user?.id, companyId: userProfile?.company_id ?? undefined };
}

export function useMyTimeEntries<Row>() {
  const { userId, companyId } = useIds();
  const query = useQuery({
    queryKey: myTimeEntriesKey(companyId, userId),
    queryFn: () => fetchMyTimeEntries<Row>(userId as string),
    enabled: !!userId,
  });
  return {
    entries: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useMyProjects() {
  const { userId, companyId } = useIds();
  const query = useQuery({
    queryKey: myProjectsKey(companyId, userId),
    queryFn: () => fetchMyProjects(userId as string),
    enabled: !!userId,
  });
  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}

export function useCreateMyTimeEntry() {
  const { companyId } = useIds();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: insertMyTimeEntry,
    onSettled: () => queryClient.invalidateQueries({ queryKey: timeEntriesKey(companyId) }),
  });
}
