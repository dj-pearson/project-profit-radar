/**
 * Reads behind the root-admin SOC 2 audit page, /compliance-audit (US-266).
 *
 * The page fetched every audit_logs id in the last 30 days to count them,
 * ignored the error on all seven reads, and on a failure showed zeros across
 * the stat cards with an empty log: on an audit screen, "nothing happened".
 * A realtime insert bumped both "Total Events" and "Today's Events" by hand,
 * whatever the event's risk, so the cards drifted from the tables.
 *
 * Counts are head requests now and every read throws. A realtime insert
 * invalidates the query so the cards and the list are re-read together.
 * These are platform tables read without a company filter (root admin only);
 * the key carries the company and user so one account's cache is never
 * served to another.
 */
import { useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AuditStats {
  totalEvents: number;
  highRiskEvents: number;
  dataAccessEvents: number;
  configChanges: number;
  todayEvents: number;
}

interface PersonRef {
  first_name: string;
  last_name: string;
  email: string;
}

export interface AuditEvent {
  id: string;
  action_type: string;
  resource_type: string;
  resource_name: string | null;
  risk_level: string;
  compliance_category: string;
  user_id: string;
  description: string | null;
  created_at: string;
  user_profiles?: PersonRef | null;
}

export interface DataAccessLog {
  id: string;
  data_type: string;
  data_classification: string;
  resource_name: string | null;
  access_method: string;
  user_id: string;
  created_at: string;
  user_profiles?: PersonRef | null;
}

export interface ComplianceAuditData {
  stats: AuditStats;
  auditEvents: AuditEvent[];
  dataAccessLogs: DataAccessLog[];
}

export const complianceAuditKey = (companyId: string | undefined, userId: string | undefined) =>
  ['compliance-audit', companyId, userId] as const;

const DAY = 24 * 60 * 60 * 1000;

export async function fetchComplianceAudit(now: Date = new Date()): Promise<ComplianceAuditData> {
  const ago = (ms: number) => new Date(now.getTime() - ms).toISOString();
  const today = now.toISOString().split('T')[0];
  const head = { count: 'exact', head: true } as const;
  const people = 'user_profiles:user_id ( first_name, last_name, email )';

  const [total, highRisk, dataAccess, config, todayRes, events, access] = await Promise.all([
    supabase.from('audit_logs').select('id', head).gte('created_at', ago(30 * DAY)),
    supabase
      .from('audit_logs')
      .select('id', head)
      .in('risk_level', ['high', 'critical'])
      .gte('created_at', ago(7 * DAY)),
    supabase.from('data_access_logs').select('id', head).gte('created_at', ago(DAY)),
    supabase.from('system_config_changes').select('id', head).gte('created_at', ago(7 * DAY)),
    supabase
      .from('audit_logs')
      .select('id', head)
      .gte('created_at', `${today}T00:00:00.000Z`)
      .lt('created_at', `${today}T23:59:59.999Z`),
    supabase.from('audit_logs').select(`*, ${people}`).order('created_at', { ascending: false }).limit(50),
    supabase.from('data_access_logs').select(`*, ${people}`).order('created_at', { ascending: false }).limit(50),
  ]);
  const failed = [total, highRisk, dataAccess, config, todayRes, events, access].find((r) => r.error)?.error;
  if (failed) throw failed;

  return {
    stats: {
      totalEvents: total.count ?? 0,
      highRiskEvents: highRisk.count ?? 0,
      dataAccessEvents: dataAccess.count ?? 0,
      configChanges: config.count ?? 0,
      todayEvents: todayRes.count ?? 0,
    },
    auditEvents: (events.data ?? []) as unknown as AuditEvent[],
    dataAccessLogs: (access.data ?? []) as unknown as DataAccessLog[],
  };
}

export function useComplianceAudit() {
  const { user, userProfile } = useAuth();
  const userId = user?.id;
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: complianceAuditKey(companyId, userId),
    queryFn: () => fetchComplianceAudit(),
    enabled: !!userId,
  });

  // A new audit row re-reads the cards and the list together.
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel('audit-monitoring')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'audit_logs' }, () => {
        void queryClient.invalidateQueries({ queryKey: complianceAuditKey(companyId, userId) });
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
