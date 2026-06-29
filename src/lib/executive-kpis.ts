/**
 * US-233: Executive KPI + forecasting — pure, I/O-free helpers.
 *
 * The metric math (profit-margin trend, cash runway/flow forecast via linear
 * regression, win rate, average project size, backlog) lives here so it's
 * unit-testable independent of Supabase and charts. Data fetching lives in the
 * ExecutiveDashboard page/service.
 */

/** A point in a monthly time series (period = 'YYYY-MM'). */
export interface SeriesPoint {
  period: string;
  value: number;
}

/** A dated amount used to build monthly series (date = ISO string). */
export interface DatedAmount {
  date: string;
  amount: number;
}

/** The YYYY-MM bucket for an ISO date/timestamp. */
export function monthKey(isoDate: string): string {
  return isoDate.slice(0, 7);
}

/**
 * Bucket dated amounts into a monthly series, summing amounts per month and
 * sorting chronologically. Months with no data are omitted.
 */
export function aggregateMonthly(rows: DatedAmount[]): SeriesPoint[] {
  const sums = new Map<string, number>();
  for (const row of rows) {
    if (!row.date) continue;
    const key = monthKey(row.date);
    sums.set(key, (sums.get(key) ?? 0) + (row.amount ?? 0));
  }
  return Array.from(sums.entries())
    .map(([period, value]) => ({ period, value }))
    .sort((a, b) => a.period.localeCompare(b.period));
}

export interface LinearFit {
  slope: number;
  intercept: number;
}

/**
 * Ordinary least-squares fit of y over x = 0..n-1 (series index). Returns a
 * flat line at the single value for n < 2.
 */
export function linearRegression(values: number[]): LinearFit {
  const n = values.length;
  if (n === 0) return { slope: 0, intercept: 0 };
  if (n === 1) return { slope: 0, intercept: values[0] };
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;
  for (let i = 0; i < n; i++) {
    sumX += i;
    sumY += values[i];
    sumXY += i * values[i];
    sumXX += i * i;
  }
  const denom = n * sumXX - sumX * sumX;
  if (denom === 0) return { slope: 0, intercept: sumY / n };
  const slope = (n * sumXY - sumX * sumY) / denom;
  const intercept = (sumY - slope * sumX) / n;
  return { slope, intercept };
}

/**
 * Forecast `periodsAhead` future points from a monthly series via linear
 * regression over the history. Forecast values are floored at 0 (a negative
 * projected revenue/cash isn't meaningful here). Returns synthesized periods.
 */
export function forecastSeries(history: SeriesPoint[], periodsAhead: number): SeriesPoint[] {
  if (history.length === 0 || periodsAhead <= 0) return [];
  const fit = linearRegression(history.map((p) => p.value));
  const lastPeriod = history[history.length - 1].period;
  const out: SeriesPoint[] = [];
  for (let i = 1; i <= periodsAhead; i++) {
    const idx = history.length - 1 + i;
    const value = Math.max(0, fit.intercept + fit.slope * idx);
    out.push({ period: addMonths(lastPeriod, i), value: Math.round(value) });
  }
  return out;
}

/** Add `n` months to a 'YYYY-MM' period string. */
export function addMonths(period: string, n: number): string {
  const [y, m] = period.split('-').map(Number);
  const total = y * 12 + (m - 1) + n;
  const year = Math.floor(total / 12);
  const month = (total % 12) + 1;
  return `${year}-${String(month).padStart(2, '0')}`;
}

/** Profit margin as a ratio (0..1); 0 when revenue is 0. */
export function profitMargin(revenue: number, cost: number): number {
  if (!revenue) return 0;
  return (revenue - cost) / revenue;
}

/**
 * Monthly profit-margin trend (%), over the sorted union of revenue and cost
 * periods so a month with expenses but no invoices still appears (and shows a
 * negative margin) rather than vanishing from the chart.
 */
export function profitMarginTrend(revenue: SeriesPoint[], cost: SeriesPoint[]): SeriesPoint[] {
  const revenueByMonth = new Map(revenue.map((p) => [p.period, p.value]));
  const costByMonth = new Map(cost.map((p) => [p.period, p.value]));
  const periods = Array.from(new Set([...revenueByMonth.keys(), ...costByMonth.keys()])).sort((a, b) =>
    a.localeCompare(b)
  );
  return periods.map((period) => ({
    period,
    value: Math.round(profitMargin(revenueByMonth.get(period) ?? 0, costByMonth.get(period) ?? 0) * 100),
  }));
}

/**
 * Fill a monthly series so every month in [fromPeriod, toPeriod] is present
 * (missing months get value 0). Needed before regression/forecast/burn so that
 * adjacent points are genuinely one calendar month apart.
 */
export function densifyMonthly(series: SeriesPoint[], fromPeriod: string, toPeriod: string): SeriesPoint[] {
  if (fromPeriod > toPeriod) return [];
  const byPeriod = new Map(series.map((p) => [p.period, p.value]));
  const out: SeriesPoint[] = [];
  let cur = fromPeriod;
  // Bounded to avoid any chance of an infinite loop on malformed input.
  for (let i = 0; i < 600 && cur <= toPeriod; i++) {
    out.push({ period: cur, value: byPeriod.get(cur) ?? 0 });
    cur = addMonths(cur, 1);
  }
  return out;
}

/**
 * Cash runway in months = current cash / average monthly net burn. Returns
 * Infinity when not burning (net positive), 0 when out of cash and burning.
 */
export function cashRunwayMonths(cashOnHand: number, avgMonthlyBurn: number): number {
  if (avgMonthlyBurn <= 0) return Infinity;
  if (cashOnHand <= 0) return 0;
  return cashOnHand / avgMonthlyBurn;
}

/** Average monthly net burn (cost − revenue) over the trailing series; >0 = burning. */
export function averageMonthlyBurn(revenue: SeriesPoint[], cost: SeriesPoint[]): number {
  const revByMonth = new Map(revenue.map((p) => [p.period, p.value]));
  const months = new Set([...revenue.map((p) => p.period), ...cost.map((p) => p.period)]);
  if (months.size === 0) return 0;
  let net = 0;
  for (const c of cost) net += c.value - (revByMonth.get(c.period) ?? 0);
  // include revenue-only months (negative burn)
  for (const r of revenue) if (!cost.some((c) => c.period === r.period)) net -= r.value;
  return net / months.size;
}

/** Win rate as a ratio (0..1): won / (won + lost). */
export function winRate(won: number, lost: number): number {
  const total = won + lost;
  if (!total) return 0;
  return won / total;
}

/** Mean of values; 0 for an empty list. */
export function average(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

/** Sum of values. */
export function sum(values: number[]): number {
  return values.reduce((s, v) => s + v, 0);
}

// ---- KPI derivations from raw rows ----

interface ProjectLike {
  budget?: number | null;
  total_budget?: number | null;
  status?: string | null;
}

const WON_ESTIMATE = new Set(['accepted']);
const DECIDED_ESTIMATE = new Set(['sent', 'viewed', 'accepted', 'rejected', 'expired']);
const BACKLOG_STATUS = new Set(['active', 'planning', 'on_hold']);
const SIZED_PROJECT_STATUS = new Set(['active', 'completed']);

/** A project's contract value (prefers total_budget, falls back to budget). */
export function projectValue(p: ProjectLike): number {
  return p.total_budget ?? p.budget ?? 0;
}

/** Win rate over decided estimates: accepted / (sent + viewed + accepted + rejected + expired). */
export function computeWinRate(statuses: (string | null)[]): number {
  let won = 0;
  let decided = 0;
  for (const s of statuses) {
    if (!s) continue;
    if (DECIDED_ESTIMATE.has(s)) decided += 1;
    if (WON_ESTIMATE.has(s)) won += 1;
  }
  return decided ? won / decided : 0;
}

/** Average contract value of active/completed projects. */
export function computeAvgProjectSize(projects: ProjectLike[]): number {
  return average(projects.filter((p) => p.status && SIZED_PROJECT_STATUS.has(p.status)).map(projectValue));
}

/** Backlog = total contract value of in-flight projects (active/planning/on_hold). */
export function computeBacklog(projects: ProjectLike[]): number {
  return sum(projects.filter((p) => p.status && BACKLOG_STATUS.has(p.status)).map(projectValue));
}
