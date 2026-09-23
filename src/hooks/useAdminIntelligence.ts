/**
 * Reads and writes behind the root-admin intelligence dashboard (US-266).
 *
 * The page loaded three panels in a useEffect. The at-risk panel dropped the
 * error on every per-account query and showed "Last login: 999 days ago" when
 * the lookup failed or found no admin. Revenue fell back to a calculation on
 * ANY error from revenue_metrics, including a failed read, and the calculation
 * read companies without checking its error, so a failure rendered as $0 MRR.
 * The trial panel did the same and showed "0 trials".
 *
 * Reads now throw. The revenue calculation runs only when revenue_metrics has
 * no row. A company with no admin login shows as never logged in (null), not
 * 999 days.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AccountHealth {
  company_id: string;
  company_name: string;
  score: number;
  trend: 'up' | 'down' | 'stable';
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  /** null when no admin of the company has ever logged in. */
  last_login_days: number | null;
  active_projects: number;
  total_projects: number;
  trial_expires_in_days?: number;
  subscription_status: string;
}

export interface RevenueMetrics {
  mrr: number;
  arr: number;
  new_revenue: number;
  expansion_revenue: number;
  contraction_revenue: number;
  churned_revenue: number;
  net_revenue_retention: number;
  total_customers: number;
  new_customers: number;
  churned_customers: number;
}

export interface TrialStats {
  total_trials: number;
  expires_this_week: number;
  high_engagement: number;
  medium_engagement: number;
  low_engagement: number;
}

export interface AdminIntelligenceData {
  atRiskAccounts: AccountHealth[];
  revenueMetrics: RevenueMetrics;
  trialStats: TrialStats;
}

export const adminIntelligenceKey = (companyId: string | undefined) => ['admin-intelligence', companyId] as const;

const DAY = 1000 * 60 * 60 * 24;

/** List prices per plan, used only when revenue_metrics has no row yet. */
const PLAN_PRICE: Record<string, number> = { starter: 149, professional: 299, enterprise: 599 };

async function countProjects(companyId: string, statuses?: string[]): Promise<number> {
  let query = supabase.from('projects').select('*', { count: 'exact', head: true }).eq('company_id', companyId);
  if (statuses) query = query.in('status', statuses);
  const { count, error } = await query;
  if (error) throw error;
  return count ?? 0;
}

export async function fetchAtRiskAccounts(now = new Date()): Promise<AccountHealth[]> {
  const { data: scores, error } = await supabase
    .from('account_health_scores')
    .select(`
      *,
      companies!inner (
        id,
        name,
        subscription_status,
        trial_end_date
      )
    `)
    .or('risk_level.eq.high,risk_level.eq.critical')
    .order('score', { ascending: true })
    .limit(10);
  if (error) throw error;

  return Promise.all(
    (scores ?? []).map(async (score) => {
      const company = score.companies as unknown as {
        id: string;
        name: string;
        subscription_status: string;
        trial_end_date: string | null;
      };

      const { data: admin, error: adminError } = await supabase
        .from('user_profiles')
        .select('last_login')
        .eq('company_id', company.id)
        .eq('role', 'admin')
        .order('last_login', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (adminError) throw adminError;

      const [total, active] = await Promise.all([
        countProjects(company.id),
        countProjects(company.id, ['active', 'in_progress']),
      ]);

      return {
        company_id: company.id,
        company_name: company.name,
        score: score.score,
        trend: score.trend,
        risk_level: score.risk_level,
        last_login_days: admin?.last_login
          ? Math.floor((now.getTime() - new Date(admin.last_login).getTime()) / DAY)
          : null,
        active_projects: active,
        total_projects: total,
        trial_expires_in_days: company.trial_end_date
          ? Math.floor((new Date(company.trial_end_date).getTime() - now.getTime()) / DAY)
          : undefined,
        subscription_status: company.subscription_status,
      } as AccountHealth;
    }),
  );
}

export async function fetchRevenueMetrics(): Promise<RevenueMetrics> {
  const { data, error } = await supabase
    .from('revenue_metrics')
    .select('*')
    .order('period_start', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (data) return data as unknown as RevenueMetrics;

  // No metrics row has been written yet: estimate from active subscriptions.
  const { data: companies, error: companiesError } = await supabase
    .from('companies')
    .select('subscription_status, subscription_tier');
  if (companiesError) throw companiesError;

  let mrr = 0;
  let customers = 0;
  for (const company of companies ?? []) {
    if (company.subscription_status !== 'active') continue;
    mrr += PLAN_PRICE[company.subscription_tier as string] || 0;
    customers += 1;
  }
  return {
    mrr,
    arr: mrr * 12,
    new_revenue: 0,
    expansion_revenue: 0,
    contraction_revenue: 0,
    churned_revenue: 0,
    net_revenue_retention: 100,
    total_customers: customers,
    new_customers: 0,
    churned_customers: 0,
  };
}

export async function fetchTrialStats(now = new Date()): Promise<TrialStats> {
  const { data: companies, error } = await supabase
    .from('companies')
    .select('id, trial_end_date')
    .eq('subscription_status', 'trial');
  if (error) throw error;

  const weekOut = new Date(now.getTime() + 7 * DAY);
  const stats: TrialStats = {
    total_trials: companies?.length ?? 0,
    expires_this_week: 0,
    high_engagement: 0,
    medium_engagement: 0,
    low_engagement: 0,
  };

  for (const company of companies ?? []) {
    if (company.trial_end_date) {
      const end = new Date(company.trial_end_date);
      if (end <= weekOut && end >= now) stats.expires_this_week += 1;
    }
    const { data: health, error: healthError } = await supabase
      .from('account_health_scores')
      .select('score')
      .eq('company_id', company.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();
    if (healthError) throw healthError;
    if (!health) continue;
    if (health.score >= 70) stats.high_engagement += 1;
    else if (health.score >= 40) stats.medium_engagement += 1;
    else stats.low_engagement += 1;
  }
  return stats;
}

export async function fetchAdminIntelligence(): Promise<AdminIntelligenceData> {
  const [atRiskAccounts, revenueMetrics, trialStats] = await Promise.all([
    fetchAtRiskAccounts(),
    fetchRevenueMetrics(),
    fetchTrialStats(),
  ]);
  return { atRiskAccounts, revenueMetrics, trialStats };
}

export async function scheduleIntervention(account: AccountHealth, now = new Date()): Promise<void> {
  const { data, error } = await supabase
    .from('admin_interventions')
    .insert({
      company_id: account.company_id,
      intervention_type: account.score < 40 ? 'low_engagement_email' : 'onboarding_help',
      trigger_reason: `Low health score: ${account.score}`,
      status: 'scheduled',
      scheduled_for: now.toISOString(),
    })
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The intervention was not scheduled.');
}

export function useAdminIntelligence() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const isRootAdmin = userProfile?.role === 'root_admin';
  const queryClient = useQueryClient();
  const key = adminIntelligenceKey(companyId);

  const query = useQuery({ queryKey: key, queryFn: fetchAdminIntelligence, enabled: isRootAdmin });
  const intervene = useMutation({
    mutationFn: (account: AccountHealth) => scheduleIntervention(account),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    scheduleIntervention: (account: AccountHealth) => intervene.mutateAsync(account),
  };
}
