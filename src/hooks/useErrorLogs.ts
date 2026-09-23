/**
 * Reads and writes behind the admin Error Logs page (US-266).
 *
 * The stats panel ran four queries and read the error of none of them, so a
 * failed read showed "0 errors in 24h" on the page whose job is to say the app
 * is failing. A failed list read toasted and then rendered "No errors found".
 * Marking an error resolved checked the error but not the row count.
 *
 * The filter-to-query mapping is shared by the page read and the CSV export,
 * so the export always matches what the table shows.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ErrorLog {
  id: string;
  error_type: string;
  error_message: string;
  error_code: string | null;
  stack_trace: string | null;
  component: string | null;
  component_stack: string | null;
  severity: string | null;
  url: string | null;
  page_route: string | null;
  user_id: string | null;
  user_email: string | null;
  user_role: string | null;
  user_action: string | null;
  company_id: string | null;
  browser: string | null;
  os: string | null;
  device_type: string | null;
  screen_resolution: string | null;
  viewport_size: string | null;
  user_agent: string | null;
  browser_info: Record<string, unknown> | null;
  session_id: string | null;
  metadata: Record<string, unknown> | null;
  environment: string | null;
  resolved: boolean | null;
  resolved_at: string | null;
  resolved_by: string | null;
  timestamp: string | null;
  created_at: string | null;
}

export interface ErrorLogStats {
  total24h: number;
  critical24h: number;
  unique24h: number;
  mostAffectedPage: string | null;
}

export interface ErrorLogFilters {
  dateRange: string;
  searchTerm: string;
  errorType: string;
  severity: string;
  userEmail: string;
  resolved: string;
}

export const ERROR_LOG_PAGE_SIZE = 25;
const EXPORT_LIMIT = 1000;
const HOUR = 60 * 60 * 1000;

export const errorLogsKey = (companyId: string | undefined) => ['error-logs', companyId] as const;

export function dateThreshold(range: string, now = new Date()): string | null {
  const hours = ({ '24h': 24, '7d': 24 * 7, '30d': 24 * 30 } as Record<string, number>)[range];
  return hours ? new Date(now.getTime() - hours * HOUR).toISOString() : null;
}

// The builder's generic type is not worth spelling out; every filter below is
// a method PostgrestFilterBuilder has.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function applyFilters<Q extends Record<string, any>>(query: Q, f: ErrorLogFilters, now: Date): Q {
  let q = query;
  const since = dateThreshold(f.dateRange, now);
  if (since) q = q.gte('created_at', since);
  if (f.searchTerm.trim()) q = q.ilike('error_message', `%${f.searchTerm.trim()}%`);
  if (f.errorType !== 'all') q = q.eq('error_type', f.errorType);
  if (f.severity !== 'all') q = q.eq('severity', f.severity);
  if (f.userEmail.trim()) q = q.ilike('user_email', `%${f.userEmail.trim()}%`);
  if (f.resolved === 'resolved') q = q.eq('resolved', true);
  else if (f.resolved === 'unresolved') q = q.eq('resolved', false);
  return q;
}

export async function fetchErrorLogStats(now = new Date()): Promise<ErrorLogStats> {
  const since = new Date(now.getTime() - 24 * HOUR).toISOString();

  const { count: total, error: totalError } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since);
  if (totalError) throw totalError;

  const { count: critical, error: criticalError } = await supabase
    .from('error_logs')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', since)
    .eq('severity', 'critical');
  if (criticalError) throw criticalError;

  const { data: recent, error: recentError } = await supabase
    .from('error_logs')
    .select('error_message, page_route')
    .gte('created_at', since);
  if (recentError) throw recentError;

  const routeCounts: Record<string, number> = {};
  for (const row of recent ?? []) {
    if (row.page_route) routeCounts[row.page_route] = (routeCounts[row.page_route] || 0) + 1;
  }
  const top = Object.entries(routeCounts).sort((a, b) => b[1] - a[1])[0];

  return {
    total24h: total ?? 0,
    critical24h: critical ?? 0,
    unique24h: new Set((recent ?? []).map((r) => r.error_message)).size,
    mostAffectedPage: top?.[0] ?? null,
  };
}

export async function fetchErrorLogPage(filters: ErrorLogFilters, page: number, now = new Date()) {
  const from = page * ERROR_LOG_PAGE_SIZE;
  const query = applyFilters(
    supabase.from('error_logs').select('*', { count: 'exact' }).order('created_at', { ascending: false }),
    filters,
    now,
  ).range(from, from + ERROR_LOG_PAGE_SIZE - 1);
  const { data, count, error } = await query;
  if (error) throw error;
  return { rows: (data ?? []) as unknown as ErrorLog[], total: count ?? 0 };
}

export async function fetchErrorLogExport(filters: ErrorLogFilters, now = new Date()): Promise<ErrorLog[]> {
  const query = applyFilters(
    supabase.from('error_logs').select('*').order('created_at', { ascending: false }),
    filters,
    now,
  ).limit(EXPORT_LIMIT);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as unknown as ErrorLog[];
}

export async function setErrorLogResolved(id: string, resolved: boolean, userId: string | null, now = new Date()) {
  const { data, error } = await supabase
    .from('error_logs')
    .update({
      resolved,
      resolved_at: resolved ? now.toISOString() : null,
      resolved_by: resolved ? userId : null,
    } as never)
    .eq('id', id)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) {
    throw new Error('The error log was not updated. You may not have permission to change it.');
  }
}

export function useErrorLogs(filters: ErrorLogFilters, page: number) {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = errorLogsKey(companyId);

  const stats = useQuery({ queryKey: [...key, 'stats'] as const, queryFn: () => fetchErrorLogStats(), enabled: !!user });
  const list = useQuery({
    queryKey: [...key, 'page', filters, page] as const,
    queryFn: () => fetchErrorLogPage(filters, page),
    enabled: !!user,
    placeholderData: keepPreviousData,
  });
  const resolve = useMutation({
    mutationFn: ({ id, resolved }: { id: string; resolved: boolean }) => setErrorLogResolved(id, resolved, user?.id ?? null),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    stats: stats.data,
    statsError: stats.error as Error | null,
    rows: list.data?.rows ?? [],
    total: list.data?.total ?? 0,
    isLoading: list.isLoading || !user,
    isFetching: list.isFetching,
    error: list.error as Error | null,
    refetch: () => Promise.all([stats.refetch(), list.refetch()]),
    setResolved: (id: string, resolved: boolean) => resolve.mutateAsync({ id, resolved }),
    exportRows: () => fetchErrorLogExport(filters),
  };
}
