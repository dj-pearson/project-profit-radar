/**
 * Per-project risk for generate-risk-assessment, scored from project rows.
 *
 * budgetRisk was `Math.random() * 40 + 40` and scheduleRisk
 * `Math.random() * 30 + 30` for every active project, turned into text like
 * "Project tracking 23% over initial estimates", and the 12-month riskTrends
 * were random too. RiskAssessment.tsx showed it as the assessment.
 *
 * Now each score is 50 plus how far the project is running ahead of its
 * progress, clamped to 0..100:
 *  - budget: percent of budget spent minus percent complete;
 *  - schedule: percent of planned duration elapsed minus percent complete.
 * A risk whose inputs are missing is left out of topRisks; a project with
 * neither gets riskScore null. No risk history is stored, so riskTrends is
 * empty rather than invented.
 *
 * Pure on purpose, so vitest can load it.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

export interface RiskProject {
  id?: string;
  name?: string;
  budget?: number | null;
  start_date?: string | null;
  end_date?: string | null;
  completion_percentage?: number | null;
}

function clamp(n: number): number {
  return Math.max(0, Math.min(100, Math.round(n)));
}

function time(d: string | null | undefined): number | null {
  if (!d) return null;
  const t = new Date(d).getTime();
  return Number.isFinite(t) ? t : null;
}

function pctComplete(p: RiskProject): number {
  const n = Number(p.completion_percentage);
  return Number.isFinite(n) ? Math.max(0, Math.min(100, n)) : 0;
}

/** Percent of budget spent minus percent complete, as a 0..100 score. null without a budget. */
export function budgetRisk(p: RiskProject, spent: number): { score: number; overrunPoints: number } | null {
  const budget = Number(p.budget);
  if (!Number.isFinite(budget) || budget <= 0) return null;
  const spentPct = (spent / budget) * 100;
  const overrunPoints = Math.round(spentPct - pctComplete(p));
  return { score: clamp(50 + overrunPoints), overrunPoints };
}

/** Percent of planned time elapsed minus percent complete. null without both dates. */
export function scheduleRisk(p: RiskProject, now: Date): { score: number; projectedDelayDays: number | null } | null {
  const start = time(p.start_date);
  const end = time(p.end_date);
  if (start === null || end === null || end <= start) return null;
  const elapsed = Math.max(0, now.getTime() - start);
  const elapsedPct = Math.min(100, (elapsed / (end - start)) * 100);
  const done = pctComplete(p);
  const lag = elapsedPct - done;
  const projectedDelayDays = done > 0
    ? Math.max(0, Math.ceil((start + elapsed / (done / 100) - end) / DAY_MS))
    : null;
  return { score: clamp(50 + lag), projectedDelayDays };
}

function severity(score: number, high: number, medium: number): 'high' | 'medium' | 'low' {
  return score > high ? 'high' : score > medium ? 'medium' : 'low';
}

export function scoreProjectRisk(p: RiskProject, spent: number, now: Date) {
  const budget = budgetRisk(p, spent);
  const schedule = scheduleRisk(p, now);
  const topRisks = [];
  if (budget) {
    topRisks.push({
      type: 'Budget Overrun',
      severity: severity(budget.score, 70, 50),
      probability: budget.score / 100,
      impact: Math.round(budget.score / 10),
      description: budget.overrunPoints > 0
        ? `Spending is ${budget.overrunPoints} points ahead of percent complete`
        : `Spending is within percent complete (${budget.overrunPoints} points)`,
      mitigation: 'Implement weekly budget tracking and approval gates',
    });
  }
  if (schedule) {
    topRisks.push({
      type: 'Schedule Delay',
      severity: severity(schedule.score, 60, 40),
      probability: schedule.score / 100,
      impact: Math.round(schedule.score / 10),
      description: schedule.projectedDelayDays === null
        ? 'No progress recorded, so no delay can be projected'
        : `Projected ${schedule.projectedDelayDays} day delay at the current pace`,
      mitigation: 'Add buffer time and optimize resource allocation',
    });
  }
  const scores = [budget?.score, schedule?.score].filter((s): s is number => typeof s === 'number');
  return {
    projectId: p.id,
    projectName: p.name,
    riskScore: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
    topRisks,
  };
}
