/**
 * Monthly series for /admin/analytics, built only from rows the page queried.
 *
 * US-370: this replaced Math.random() series that were charted as if they were
 * the company's revenue, labor hours and project counts. Every number here is a
 * sum or count over real rows; a month with no rows is 0, never invented.
 * Metrics with no source table (equipment usage, "efficiency") are not built.
 */

export interface AnalyticsProjectRow {
  id: string;
  status: string | null;
  budget: number | null;
  start_date: string | null;
  completed_at: string | null;
}

export interface AnalyticsJobCostRow {
  project_id: string;
  date: string;
  total_cost: number | null;
  material_cost: number | null;
}

export interface AnalyticsTimeEntryRow {
  start_time: string;
  total_hours: number | null;
}

export interface AnalyticsInvoiceRow {
  issue_date: string;
  total_amount: number | null;
  status: string;
}

export interface MonthBucket {
  key: string; // YYYY-MM
  period: string; // "Jan 2026"
  month: string; // "Jan"
}

/** Invoice statuses that are not revenue: never sent, or withdrawn. */
export const NON_REVENUE_INVOICE_STATUSES = ['draft', 'cancelled', 'void'];

const toKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;

/** The last `count` calendar months, oldest first, ending with the month of `now`. */
export function lastMonths(count: number, now: Date = new Date()): MonthBucket[] {
  const out: MonthBucket[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    out.push({
      key: toKey(d),
      period: d.toLocaleDateString('en-US', { month: 'short', year: 'numeric' }),
      month: d.toLocaleDateString('en-US', { month: 'short' }),
    });
  }
  return out;
}

/** YYYY-MM for a date-only or timestamp string, or null if unparseable. */
export function monthKeyOf(value: string | null | undefined): string | null {
  if (!value) return null;
  // Date-only strings ("2026-03-01") are UTC midnight to Date(); take the
  // calendar month from the string itself so it can't slip to the prior month.
  const m = /^(\d{4})-(\d{2})/.exec(value);
  if (m) return `${m[1]}-${m[2]}`;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : toKey(d);
}

function sumBy<T>(rows: T[], keyOf: (r: T) => string | null, valueOf: (r: T) => number) {
  const totals = new Map<string, number>();
  for (const r of rows) {
    const k = keyOf(r);
    if (!k) continue;
    totals.set(k, (totals.get(k) ?? 0) + valueOf(r));
  }
  return totals;
}

export function buildRevenueByPeriod(
  months: MonthBucket[],
  invoices: AnalyticsInvoiceRow[],
  jobCosts: AnalyticsJobCostRow[],
) {
  const revenue = sumBy(
    invoices.filter((i) => !NON_REVENUE_INVOICE_STATUSES.includes(i.status)),
    (i) => monthKeyOf(i.issue_date),
    (i) => i.total_amount ?? 0,
  );
  const costs = sumBy(jobCosts, (c) => monthKeyOf(c.date), (c) => c.total_cost ?? 0);
  return months.map((m) => {
    const r = revenue.get(m.key) ?? 0;
    const c = costs.get(m.key) ?? 0;
    return { period: m.period, revenue: r, costs: c, profit: r - c };
  });
}

export function buildResourceUtilization(
  months: MonthBucket[],
  timeEntries: AnalyticsTimeEntryRow[],
  jobCosts: AnalyticsJobCostRow[],
) {
  const hours = sumBy(timeEntries, (t) => monthKeyOf(t.start_time), (t) => t.total_hours ?? 0);
  const material = sumBy(jobCosts, (c) => monthKeyOf(c.date), (c) => c.material_cost ?? 0);
  return months.map((m) => ({
    period: m.period,
    laborHours: Math.round((hours.get(m.key) ?? 0) * 10) / 10,
    materialCost: material.get(m.key) ?? 0,
  }));
}

export function buildTrendData(months: MonthBucket[], projects: AnalyticsProjectRow[]) {
  return months.map((m) => {
    const started = projects.filter((p) => monthKeyOf(p.start_date) === m.key);
    const completed = projects.filter((p) => monthKeyOf(p.completed_at) === m.key);
    const budgets = started.map((p) => p.budget).filter((b): b is number => typeof b === 'number');
    return {
      month: m.month,
      projectsStarted: started.length,
      projectsCompleted: completed.length,
      // null, not 0, when nothing started: "no projects" is not "$0 projects".
      avgProjectValue: budgets.length ? Math.round(budgets.reduce((a, b) => a + b, 0) / budgets.length) : null,
    };
  });
}

const STATUS_LABELS: Record<string, string> = {
  completed: 'Completed',
  active: 'In Progress',
  in_progress: 'In Progress',
  planning: 'Planning',
  on_hold: 'On Hold',
};

/** Project counts by status, for the portfolio pie. Empty input gives []. */
export function buildStatusDistribution(projects: AnalyticsProjectRow[]) {
  const counts = new Map<string, number>();
  for (const p of projects) {
    const label = STATUS_LABELS[p.status ?? ''] ?? (p.status ? p.status.replace(/_/g, ' ') : 'No status');
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  return Array.from(counts, ([name, value], i) => ({
    name,
    value,
    fill: `hsl(var(--chart-${(i % 5) + 1}))`,
  }));
}

/** True when every value of every listed field is 0 or null: nothing to chart. */
export function isSeriesEmpty<T extends Record<string, unknown>>(rows: T[], fields: (keyof T)[]) {
  return rows.every((r) => fields.every((f) => r[f] === 0 || r[f] === null || r[f] === undefined));
}
