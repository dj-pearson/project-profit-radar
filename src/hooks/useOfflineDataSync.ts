/**
 * Downloads and uploads behind the mobile OfflineDataManager (US-266, US-300).
 *
 * The download read four tables with every error unread and then toasted
 * "Essential data has been cached for offline use". Two of the reads could
 * never succeed: time_entries has no date, hours, notes or status column
 * (it records start_time and total_hours), and expenses has no date, category,
 * receipt_url or status (expense_date, category_id, receipt_file_path,
 * payment_status). So a field worker going offline carried an empty cache of
 * their own hours and expenses while being told it was ready. The reads use
 * the real columns and any failure throws before the cache is replaced.
 *
 * The upload inserts a queued batch and reads it back; the caller clears a
 * queue only when every row came back.
 */
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface OfflineEssentials {
  projects: Record<string, unknown>[];
  tasks: Record<string, unknown>[];
  timeEntries: Record<string, unknown>[];
  expenses: Record<string, unknown>[];
}

export type OfflineQueueTable = 'time_entries' | 'expenses' | 'quality_inspections' | 'tasks';

const DAY = 24 * 60 * 60 * 1000;

export async function fetchOfflineEssentials(
  companyId: string,
  userId: string,
  now: Date = new Date(),
): Promise<OfflineEssentials> {
  const since = new Date(now.getTime() - 30 * DAY).toISOString();
  const sinceDate = since.split('T')[0];
  const [projects, tasks, timeEntries, expenses] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, status, client_name, budget, completion_percentage, start_date, end_date, site_address')
      .eq('company_id', companyId)
      .eq('status', 'active')
      .limit(50),
    supabase
      .from('tasks')
      .select('id, name, description, status, priority, due_date, project_id, assigned_to, completion_percentage, created_at')
      .eq('company_id', companyId)
      .gte('created_at', since)
      .limit(100),
    supabase
      .from('time_entries')
      .select('id, project_id, user_id, start_time, end_time, total_hours, description, approval_status, created_at')
      .eq('user_id', userId)
      .gte('start_time', since)
      .limit(50),
    supabase
      .from('expenses')
      .select('id, project_id, amount, category_id, expense_date, receipt_file_path, payment_status, description, created_at')
      .eq('company_id', companyId)
      .gte('expense_date', sinceDate)
      .limit(50),
  ]);
  const failed = [projects, tasks, timeEntries, expenses].find((r) => r.error)?.error;
  if (failed) throw failed;
  return {
    projects: (projects.data ?? []) as Record<string, unknown>[],
    tasks: (tasks.data ?? []) as Record<string, unknown>[],
    timeEntries: (timeEntries.data ?? []) as Record<string, unknown>[],
    expenses: (expenses.data ?? []) as Record<string, unknown>[],
  };
}

/** Insert a queued batch; throws unless every row came back. */
export async function uploadOfflineQueue(table: OfflineQueueTable, rows: Record<string, unknown>[]): Promise<number> {
  if (rows.length === 0) return 0;
  const { data, error } = await supabase.from(table).insert(rows as never).select('id');
  if (error) throw error;
  const landed = (data ?? []).length;
  if (landed !== rows.length) throw new Error(`only ${landed} of ${rows.length} were saved`);
  return landed;
}

export function useOfflineDataSync() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const userId = user?.id;

  const download = useMutation({
    mutationFn: () => {
      if (!companyId || !userId) throw new Error('Sign in to a company account to download offline data.');
      return fetchOfflineEssentials(companyId, userId);
    },
  });
  const upload = useMutation({
    mutationFn: (v: { table: OfflineQueueTable; rows: Record<string, unknown>[] }) => uploadOfflineQueue(v.table, v.rows),
  });
  return { companyId, download, upload };
}
