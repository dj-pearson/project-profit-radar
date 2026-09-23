/**
 * Forecasts for generate-predictive-analytics, computed from project rows.
 *
 * Every number here used to be random: predicted end dates were the planned
 * date plus or minus up to 15 random days, cost variance was a random -10% to
 * +30%, and the 12-month labor, material, revenue and "market trend" series
 * were random around fixed constants. PredictiveAnalytics.tsx showed all of it
 * as a forecast for the company's own projects.
 *
 * Now:
 *  - completion: a linear schedule projection from start_date and
 *    completion_percentage. A project without both is left out, not guessed.
 *  - budget: estimate at completion = cost to date / percent complete, with
 *    cost to date from job_costs (or actual_cost). Left out without them.
 *  - trend: per month, the contract value of active projects scheduled to
 *    finish that month and the number of projects scheduled to start. That is
 *    what is on the books, not a market prediction, so marketTrend and
 *    confidence are null.
 *  - resource demand: nothing records planned labor hours or material spend
 *    by month, so the series is empty.
 *
 * Pure on purpose, so vitest can load it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface ForecastProject {
  id?: string;
  name?: string;
  status?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  budget?: number | null;
  actual_cost?: number | null;
  completion_percentage?: number | null;
  job_costs?: Array<{ total_cost?: number | null }> | null;
}

function time(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function isoDay(t: number): string {
  return new Date(t).toISOString().split('T')[0];
}

function percentComplete(p: ForecastProject): number | null {
  const pct = typeof p.completion_percentage === 'number' ? p.completion_percentage : Number(p.completion_percentage);
  return Number.isFinite(pct) && pct > 0 && pct <= 100 ? pct : null;
}

export function costToDate(p: ForecastProject): number | null {
  if (Array.isArray(p.job_costs) && p.job_costs.length > 0) {
    return p.job_costs.reduce((sum, c) => sum + (Number(c?.total_cost) || 0), 0);
  }
  const actual = Number(p.actual_cost);
  return Number.isFinite(actual) && actual > 0 ? actual : null;
}

export function forecastCompletion(projects: ForecastProject[], now: Date) {
  const out = [];
  for (const p of projects) {
    const start = time(p.start_date);
    const pct = percentComplete(p);
    if (start === null || pct === null || start > now.getTime()) continue;
    const elapsed = now.getTime() - start;
    const predictedEnd = start + elapsed / (pct / 100);
    const planned = time(p.end_date);
    const delayDays = planned === null ? null : Math.ceil((predictedEnd - planned) / DAY_MS);
    out.push({
      projectId: p.id,
      projectName: p.name,
      predictedEndDate: isoDay(predictedEnd),
      originalEndDate: planned === null ? null : isoDay(planned),
      // No model behind the projection, so no confidence figure.
      confidenceScore: null,
      delayRisk: delayDays === null ? null : delayDays > 14 ? 'high' : delayDays > 7 ? 'medium' : 'low',
      delayDays: delayDays === null ? null : Math.max(0, delayDays),
      method: 'linear_schedule_projection',
    });
  }
  return out;
}

export function forecastBudgets(projects: ForecastProject[]) {
  const out = [];
  for (const p of projects) {
    const budget = Number(p.budget);
    const pct = percentComplete(p);
    const spent = costToDate(p);
    if (!Number.isFinite(budget) || budget <= 0 || pct === null || spent === null) continue;
    const predictedCost = spent / (pct / 100);
    const variance = Math.round(((predictedCost - budget) / budget) * 1000) / 10;
    out.push({
      projectId: p.id,
      projectName: p.name,
      predictedFinalCost: Math.round(predictedCost),
      originalBudget: budget,
      variancePercentage: variance,
      overrunRisk: variance > 20 ? 'high' : variance > 10 ? 'medium' : 'low',
      method: 'cost_to_date_over_percent_complete',
    });
  }
  return out;
}

export function scheduledTrend(
  activeProjects: ForecastProject[],
  allProjects: ForecastProject[],
  now: Date,
) {
  return Array.from({ length: 12 }, (_, i) => {
    const y = now.getUTCFullYear();
    const m = now.getUTCMonth() + i;
    const from = Date.UTC(y, m, 1);
    const to = Date.UTC(y, m + 1, 1);
    const inMonth = (d: string | null | undefined) => {
      const t = time(d);
      return t !== null && t >= from && t < to;
    };
    return {
      month: new Date(from).toISOString().slice(0, 7),
      predictedRevenue: activeProjects
        .filter((p) => inMonth(p.end_date))
        .reduce((sum, p) => sum + (Number(p.budget) || 0), 0),
      predictedProjects: allProjects.filter((p) => inMonth(p.start_date)).length,
      marketTrend: null,
      confidence: null,
      method: 'scheduled_contract_value',
    };
  });
}
