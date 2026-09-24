/**
 * Reads behind /security-monitoring (US-266).
 *
 * The page fetched every security_logs id for 30 days to count them, checked
 * none of its six reads, and caught a failed suspicious-activity read into
 * "0". A failed load showed zero failed logins and zero suspicious IPs, which
 * on a security screen reads as "all quiet". A realtime insert bumped the
 * counters by hand, so they drifted from the table.
 *
 * Counts are head requests now and every read throws. A realtime insert
 * invalidates the query so the counters and the list are re-read together.
 * security_logs is read with its RLS scope as before; the key carries the
 * company and user so one account's cache is never served to another.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface SecurityStats {
  totalEvents: number;
  failedLogins: number;
  /** IPs with three or more failed logins in the last 24 hours. */
  suspiciousActivity: number;
  /** Distinct users with a successful login in the last 24 hours. */
  activeUsers: number;
  todayEvents: number;
}

export interface SecurityEvent {
  id: string;
  event_type: string;
  user_id: string | null;
  ip_address: unknown;
  user_agent: string | null;
  details: unknown;
  created_at: string;
}

export const securityLogsKey = (companyId: string | undefined, userId: string | undefined) =>
  ['security-logs', companyId, userId] as const;

const DAY = 24 * 60 * 60 * 1000;

export function countSuspiciousIps(rows: { ip_address: unknown }[], threshold = 3): number {
  const counts = new Map<string, number>();
  for (const r of rows) {
    const ip = r.ip_address == null ? '' : String(r.ip_address);
    if (ip) counts.set(ip, (counts.get(ip) ?? 0) + 1);
  }
  return [...counts.values()].filter((n) => n >= threshold).length;
}

export async function fetchSecurityMonitoring(
  now: Date = new Date()
): Promise<{ stats: SecurityStats; recentEvents: SecurityEvent[] }> {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const today = now.toISOString().split('T')[0];
  const head = { count: 'exact', head: true } as const;

  const [total, failedLogins, todayRes, recent, failedIps, logins] = await Promise.all([
    supabase.from('security_logs').select('id', head).gte('created_at', ago(30 * DAY)),
    supabase.from('security_logs').select('id', head).eq('event_type', 'login_failed').gte('created_at', ago(7 * DAY)),
    supabase
      .from('security_logs')
      .select('id', head)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`),
    supabase.from('security_logs').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('security_logs').select('ip_address').eq('event_type', 'login_failed').gte('created_at', ago(DAY)),
    supabase.from('security_logs').select('user_id').eq('event_type', 'login_success').gte('created_at', ago(DAY)),
  ]);
  const failed = [total, failedLogins, todayRes, recent, failedIps, logins].find((r) => r.error)?.error;
  if (failed) throw failed;

  const activeUsers = new Set(
    ((logins.data ?? []) as { user_id: string | null }[]).map((r) => r.user_id).filter(Boolean)
  ).size;

  return {
    stats: {
      totalEvents: total.count ?? 0,
      failedLogins: failedLogins.count ?? 0,
      suspiciousActivity: countSuspiciousIps((failedIps.data ?? []) as { ip_address: unknown }[]),
      activeUsers,
      todayEvents: todayRes.count ?? 0,
    },
    recentEvents: (recent.data ?? []) as unknown as SecurityEvent[],
  };
}

export function useSecurityMonitoring() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: securityLogsKey(companyId, userId),
    queryFn: () => fetchSecurityMonitoring(),
    enabled: !!userId,
  });

  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('security-monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'security_logs' }, () => {
        void queryClient.invalidateQueries({ queryKey: securityLogsKey(companyId, userId) });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(channel);
    };
  }, [queryClient, companyId, userId]);

  return {
    data: query.data,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
