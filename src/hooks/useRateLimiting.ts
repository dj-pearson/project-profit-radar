/**
 * Reads and writes behind /rate-limiting (US-266).
 *
 * The dashboard ran eight queries and read the error of none of them, so a
 * failed read showed "0 active blocks" and an empty violations list, and the
 * Refresh button announced "Rate limiting data has been updated" either way.
 * Counts fetched every id to take .length (capped at 1000 by PostgREST); they
 * are head counts now. Reads throw; writes select the id back.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface RateLimitStats {
  totalRules: number;
  activeBlocks: number;
  violationsToday: number;
  ddosAttacks: number;
  topBlockedIps: number;
}

export interface RateLimitRule {
  id: string;
  rule_name: string;
  endpoint_pattern: string;
  method: string;
  max_requests: number;
  time_window_seconds: number;
  block_duration_seconds: number;
  rule_type: string;
  is_active: boolean;
  priority: number;
  created_at: string;
}

export interface RateLimitViolation {
  id: string;
  identifier: string;
  identifier_type: string;
  ip_address: string | null;
  endpoint: string;
  method: string;
  requests_made: number;
  limit_exceeded_by: number;
  action_taken: string;
  created_at: string;
}

export interface IPAccessControl {
  id: string;
  ip_address: string;
  access_type: string;
  reason: string | null;
  auto_generated: boolean;
  expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export interface NewRateLimitRule {
  rule_name: string;
  endpoint_pattern: string;
  method: string;
  max_requests: number;
  time_window_seconds: number;
  block_duration_seconds: number;
  rule_type: string;
  priority: number;
}

export interface NewIPControl {
  ip_address: string;
  access_type: string;
  reason: string;
}

export const rateLimitingKey = (companyId: string | undefined) => ['rate-limiting', companyId] as const;

async function headCount(query: PromiseLike<{ count: number | null; error: unknown }>): Promise<number> {
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchRateLimiting(now = new Date()) {
  const today = now.toISOString().split('T')[0];
  const [totalRules, activeBlocks, violationsToday, ddosAttacks, topBlockedIps] = await Promise.all([
    headCount(supabase.from('rate_limit_rules').select('id', { count: 'exact', head: true }).eq('is_active', true)),
    headCount(
      supabase
        .from('rate_limit_state')
        .select('id', { count: 'exact', head: true })
        .eq('is_blocked', true)
        .gt('blocked_until', now.toISOString()),
    ),
    headCount(
      supabase
        .from('rate_limit_violations')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', `${today}T00:00:00.000Z`)
        .lt('created_at', `${today}T23:59:59.999Z`),
    ),
    headCount(
      supabase
        .from('ddos_detection_logs')
        .select('id', { count: 'exact', head: true })
        .gte('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString()),
    ),
    headCount(supabase.from('ip_access_control').select('id', { count: 'exact', head: true }).eq('is_active', true)),
  ]);

  const { data: rules, error: rulesError } = await supabase
    .from('rate_limit_rules')
    .select('*')
    .order('priority', { ascending: false })
    .order('created_at', { ascending: false });
  if (rulesError) throw rulesError;

  const { data: violations, error: violationsError } = await supabase
    .from('rate_limit_violations')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);
  if (violationsError) throw violationsError;

  const { data: ips, error: ipsError } = await supabase
    .from('ip_access_control')
    .select('*')
    .eq('is_active', true)
    .order('created_at', { ascending: false });
  if (ipsError) throw ipsError;

  const stats: RateLimitStats = { totalRules, activeBlocks, violationsToday, ddosAttacks, topBlockedIps };
  return {
    stats,
    rules: (rules ?? []) as RateLimitRule[],
    violations: (violations ?? []).map((v) => ({
      ...v,
      ip_address: v.ip_address ? String(v.ip_address) : null,
    })) as RateLimitViolation[],
    ipControls: (ips ?? []).map((ip) => ({ ...ip, ip_address: String(ip.ip_address) })) as IPAccessControl[],
  };
}

function requireRow(data: unknown[] | null, what: string) {
  if (!data || data.length === 0) throw new Error(`The ${what} was not saved. You may not have permission to change it.`);
}

export async function createRateLimitRule(rule: NewRateLimitRule): Promise<void> {
  const { data, error } = await supabase.from('rate_limit_rules').insert([rule]).select('id');
  if (error) throw error;
  requireRow(data, 'rule');
}

export async function createIPControl(ip: NewIPControl, userId: string | undefined): Promise<void> {
  const { data, error } = await supabase
    .from('ip_access_control')
    .insert([{ ip_address: ip.ip_address, access_type: ip.access_type, reason: ip.reason || null, created_by: userId }])
    .select('id');
  if (error) throw error;
  requireRow(data, 'IP control');
}

export async function setRateLimitRuleActive(ruleId: string, isActive: boolean): Promise<void> {
  const { data, error } = await supabase.from('rate_limit_rules').update({ is_active: isActive }).eq('id', ruleId).select('id');
  if (error) throw error;
  requireRow(data, 'rule');
}

export function useRateLimiting() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();
  const key = rateLimitingKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: () => fetchRateLimiting(), enabled: !!user });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: key });
  const createRule = useMutation({ mutationFn: createRateLimitRule, onSettled: invalidate });
  const createIP = useMutation({
    mutationFn: (ip: NewIPControl) => createIPControl(ip, user?.id),
    onSettled: invalidate,
  });
  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) => setRateLimitRuleActive(id, isActive),
    onSettled: invalidate,
  });

  return {
    data: query.data,
    isLoading: query.isLoading || !user,
    error: query.error as Error | null,
    refetch: query.refetch,
    createRule: (rule: NewRateLimitRule) => createRule.mutateAsync(rule),
    createIPControl: (ip: NewIPControl) => createIP.mutateAsync(ip),
    setRuleActive: (id: string, isActive: boolean) => toggle.mutateAsync({ id, isActive }),
  };
}
