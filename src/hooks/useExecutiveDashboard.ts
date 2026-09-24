/**
 * Figures behind the executive dashboard on /reports (US-266).
 *
 * The component read five queries without checking one error; a failed read
 * left every card on 0. Most of what it showed was not read at all: team
 * utilisation was the constant 85, every KPI carried an invented change
 * ("+3", "+2.1%", "+$42K"), the financial highlights ($3.2M YTD, $68K deal
 * size, 94.2% collection, 124% ROI), the operational KPIs (127 days, $142 per
 * square foot...) and the risk panel ("2 projects over budget") were typed in.
 *
 * Everything here is computed from the company's projects, job costs,
 * invoices and expenses for the chosen period. What those tables cannot
 * answer is null, and the dashboard shows '--' for it. Reads throw.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { formatDate } from '@/lib/format';

export type ExecutivePeriod = 'last_30_days' | 'last_3_months' | 'last_6_months' | 'last_12_months' | 'ytd';

export interface ExecutiveMetrics {
  /** Paid invoices issued in the period. */
  totalRevenue: number;
  /** Everything invoiced in the period, paid or not. */
  totalInvoiced: number;
  invoiceCount: number;
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  avgProfitMargin: number;
  onTimeDelivery: number;
  onBudgetProjects: number;
  pendingInvoices: number;
  cashFlow: number;
  /** Paid over invoiced; null when nothing was invoiced. */
  collectionRate: number | null;
  /** Invoiced over invoice count; null when nothing was invoiced. */
  avgInvoice: number | null;
  /** Mean start-to-end days of completed projects with both dates; null when none. */
  avgProjectDurationDays: number | null;
}

export interface TrendPoint {
  period: string;
  revenue: number;
  projects: number;
  costs: number;
  profit: number;
  efficiency: number;
}

export interface ProjectHealth {
  id: string;
  name: string;
  status: 'healthy' | 'warning' | 'critical';
  completion: number;
  budgetVariance: number;
  scheduleVariance: number;
  riskScore: number;
}

export interface ExecutiveDashboardData {
  metrics: ExecutiveMetrics;
  trend: TrendPoint[];
  /** The first ten active projects, for the list. */
  projectHealth: ProjectHealth[];
  /** Every active project by health, for the risk panel. */
  riskCounts: Record<ProjectHealth['status'], number>;
}

export const executiveDashboardKey = (companyId: string | undefined, period: ExecutivePeriod) =>
  ['executive-dashboard', companyId, period] as const;

const DAY = 24 * 60 * 60 * 1000;

export function periodRange(period: ExecutivePeriod, now: Date = new Date()) {
  let start: Date;
  switch (period) {
    case 'last_30_days':
      start = new Date(now.getTime() - 30 * DAY);
      break;
    case 'last_3_months':
      start = new Date(now.getFullYear(), now.getMonth() - 3, 1);
      break;
    case 'last_6_months':
      start = new Date(now.getFullYear(), now.getMonth() - 6, 1);
      break;
    case 'ytd':
      start = new Date(now.getFullYear(), 0, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth() - 12, 1);
  }
  return { start: start.toISOString().split('T')[0], end: now.toISOString().split('T')[0] };
}

interface ProjectRow {
  id: string;
  name: string;
  budget: number | null;
  status: string | null;
  completion_percentage: number | null;
  start_date: string | null;
  end_date: string | null;
  created_at: string;
  job_costs: { total_cost: number | null }[] | null;
}

export function projectHealthOf(project: ProjectRow, now: Date = new Date()): ProjectHealth {
  const budget = project.budget ?? 0;
  const totalCosts = (project.job_costs ?? []).reduce((sum, c) => sum + (c.total_cost || 0), 0);
  const budgetVariance = budget > 0 ? ((totalCosts - budget) / budget) * 100 : 0;
  const scheduleVariance = project.end_date
    ? Math.ceil((new Date(project.end_date).getTime() - now.getTime()) / DAY)
    : 0;

  let status: ProjectHealth['status'] = 'healthy';
  let riskScore = 1;
  if (budgetVariance > 10 || scheduleVariance < -10) {
    status = 'critical';
    riskScore = 8;
  } else if (budgetVariance > 5 || scheduleVariance < -5) {
    status = 'warning';
    riskScore = 5;
  }
  return {
    id: project.id,
    name: project.name,
    status,
    completion: project.completion_percentage || 0,
    budgetVariance,
    scheduleVariance,
    riskScore,
  };
}

const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (key: string) => formatDate(`${key}-01T00:00:00`, { month: 'short', year: '2-digit' });

export async function fetchExecutiveDashboard(
  companyId: string,
  period: ExecutivePeriod,
  now: Date = new Date()
): Promise<ExecutiveDashboardData> {
  const range = periodRange(period, now);

  const [projectsRes, invoicesRes, expensesRes] = await Promise.all([
    supabase
      .from('projects')
      .select('id, name, budget, status, completion_percentage, start_date, end_date, created_at, job_costs(total_cost)')
      .eq('company_id', companyId),
    supabase
      .from('invoices')
      .select('total_amount, status, issue_date')
      .eq('company_id', companyId)
      .gte('issue_date', range.start)
      .lte('issue_date', range.end),
    supabase
      .from('expenses')
      .select('amount, expense_date')
      .eq('company_id', companyId)
      .gte('expense_date', range.start)
      .lte('expense_date', range.end),
  ]);
  const failed = [projectsRes, invoicesRes, expensesRes].find((r) => r.error)?.error;
  if (failed) throw failed;

  const projects = (projectsRes.data ?? []) as unknown as ProjectRow[];
  const invoices = (invoicesRes.data ?? []) as { total_amount: number | null; status: string | null; issue_date: string }[];
  const expenses = (expensesRes.data ?? []) as { amount: number | null; expense_date: string }[];

  // --- Metrics
  const totalRevenue = invoices.filter((i) => i.status === 'paid').reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalInvoiced = invoices.reduce((s, i) => s + (i.total_amount || 0), 0);
  const pendingInvoices = invoices.filter((i) => i.status === 'pending').reduce((s, i) => s + (i.total_amount || 0), 0);
  const totalProjects = projects.length;
  const margins = projects.map((p) => {
    const budget = p.budget ?? 0;
    const costs = (p.job_costs ?? []).reduce((s, c) => s + (c.total_cost || 0), 0);
    return budget > 0 ? ((budget - costs) / budget) * 100 : 0;
  });
  const completed = projects.filter((p) => p.status === 'completed');
  const onTime = completed.filter((p) => p.end_date && new Date(p.end_date) <= now).length;
  const durations = completed
    .filter((p) => p.start_date && p.end_date)
    .map((p) => (new Date(p.end_date as string).getTime() - new Date(p.start_date as string).getTime()) / DAY);

  const metrics: ExecutiveMetrics = {
    totalRevenue,
    totalInvoiced,
    invoiceCount: invoices.length,
    totalProjects,
    activeProjects: projects.filter((p) => p.status === 'active').length,
    completedProjects: completed.length,
    avgProfitMargin: margins.length ? margins.reduce((s, m) => s + m, 0) / margins.length : 0,
    onTimeDelivery: totalProjects > 0 ? (onTime / totalProjects) * 100 : 0,
    onBudgetProjects: totalProjects > 0 ? (margins.filter((m) => m >= 0).length / totalProjects) * 100 : 0,
    pendingInvoices,
    cashFlow: totalRevenue - pendingInvoices,
    collectionRate: totalInvoiced > 0 ? (totalRevenue / totalInvoiced) * 100 : null,
    avgInvoice: invoices.length > 0 ? totalInvoiced / invoices.length : null,
    avgProjectDurationDays: durations.length ? Math.round(durations.reduce((s, d) => s + d, 0) / durations.length) : null,
  };

  // --- Monthly trend, keyed by year and month so two Januaries do not merge.
  const months = new Map<string, { revenue: number; costs: number; projects: number }>();
  const bucket = (key: string) => {
    const cur = months.get(key) ?? { revenue: 0, costs: 0, projects: 0 };
    months.set(key, cur);
    return cur;
  };
  for (const i of invoices) if (i.status === 'paid') bucket(monthKey(i.issue_date)).revenue += i.total_amount || 0;
  for (const e of expenses) bucket(monthKey(e.expense_date)).costs += e.amount || 0;
  for (const p of projects) {
    const day = p.created_at.slice(0, 10);
    if (day >= range.start && day <= range.end) bucket(monthKey(day)).projects += 1;
  }
  const trend = [...months.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, m]) => ({
      period: monthLabel(key),
      revenue: m.revenue,
      projects: m.projects,
      costs: m.costs,
      profit: m.revenue - m.costs,
      efficiency: m.revenue > 0 ? Math.min(100, ((m.revenue - m.costs) / m.revenue) * 100) : 0,
    }));

  // --- Health
  const health = projects.filter((p) => p.status === 'active').map((p) => projectHealthOf(p, now));
  const riskCounts = { healthy: 0, warning: 0, critical: 0 };
  for (const h of health) riskCounts[h.status] += 1;

  return { metrics, trend, projectHealth: health.slice(0, 10), riskCounts };
}

export function useExecutiveDashboard(period: ExecutivePeriod) {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const query = useQuery({
    queryKey: executiveDashboardKey(companyId, period),
    queryFn: () => fetchExecutiveDashboard(companyId as string, period),
    enabled: !!companyId,
  });
  return {
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
}
