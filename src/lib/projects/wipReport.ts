/**
 * Work-in-Progress (WIP) / earned-value / cost-to-complete reporting logic (US-224).
 *
 * Pure, framework-free computations so they are unit testable and reconcile
 * with the existing job-costing budget-vs-actual data (US-099):
 *   - contract value  = project.budget + net approved change orders
 *   - estimated cost   = sum of project_budgets.budgeted_amount (BAC, cost terms)
 *   - actual cost      = sum of job_costs.total_cost
 *   - billed to date   = sum of invoices.total_amount
 *
 * Construction WIP schedule terms (revenue):
 *   percent complete (cost-based) = actual cost / estimated total cost
 *   earned revenue                = percent complete × contract amount
 *   over/under billing            = billed − earned revenue
 *
 * Earned-value metrics (PMI, cost terms with BAC = estimated cost):
 *   EV = percent complete × BAC,  PV = planned percent × BAC,  AC = actual cost
 *   CPI = EV / AC,  SPI = EV / PV,  EAC = AC / percent complete (= BAC / CPI)
 */

function round2(n: number): number {
  // Guard against -0 and NaN/Infinity leaking into reports.
  if (!Number.isFinite(n)) return 0;
  const r = Math.round(n * 100) / 100;
  return r === 0 ? 0 : r;
}

function clamp01(n: number): number {
  if (!Number.isFinite(n)) return 0;
  return Math.min(1, Math.max(0, n));
}

/** Change-order statuses that count toward the adjusted contract value. */
const APPROVED_CO_STATUSES = new Set(['approved', 'completed', 'client_approved']);

export interface ChangeOrderLike {
  amount?: number | null;
  status?: string | null;
  client_approved?: boolean | null;
}

/** Net dollar value of approved change orders (additions − deductions). */
export function netApprovedChangeOrders(orders: ChangeOrderLike[]): number {
  return round2(
    orders.reduce((sum, co) => {
      const approved =
        co.client_approved === true ||
        APPROVED_CO_STATUSES.has((co.status ?? '').toLowerCase());
      return approved ? sum + (co.amount ?? 0) : sum;
    }, 0)
  );
}

/**
 * Planned percent complete from the schedule, by straight-line time elapsed
 * between start and end. Returns null when dates are missing/invalid so SPI
 * can be reported as "n/a" rather than a misleading number.
 */
export function plannedPercentComplete(
  startDate: string | null | undefined,
  endDate: string | null | undefined,
  asOf: string | Date
): number | null {
  if (!startDate || !endDate) return null;
  const start = new Date(startDate).getTime();
  const end = new Date(endDate).getTime();
  const now = (asOf instanceof Date ? asOf : new Date(asOf)).getTime();
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) return null;
  return clamp01((now - start) / (end - start));
}

export interface WipProjectInput {
  projectId: string;
  name?: string | null;
  /** Base contract value (project.budget). */
  contractAmount: number;
  /** Net approved change orders to add to the contract. */
  approvedChangeOrders?: number;
  /** Estimated total cost / budget at completion (BAC, cost terms). */
  estimatedTotalCost: number;
  /** Actual cost incurred to date (AC). */
  actualCostToDate: number;
  /** Amount billed/invoiced to date. */
  billedToDate: number;
  /** Optional schedule, used for SPI/schedule variance. */
  startDate?: string | null;
  endDate?: string | null;
  /** Optional manual percent complete (0–100) overriding the cost-based value. */
  manualPercentComplete?: number | null;
  /** Reporting "as of" date for planned-value calculations. */
  asOf?: string | Date;
}

export interface WipProjectRow {
  projectId: string;
  name: string;
  /** Contract amount including approved change orders. */
  contractAmount: number;
  estimatedTotalCost: number;
  actualCostToDate: number;
  /** 0–1. */
  percentComplete: number;
  earnedRevenue: number;
  billedToDate: number;
  /** Billings in excess of earned revenue (liability), ≥ 0. */
  overbilling: number;
  /** Earned revenue in excess of billings (asset), ≥ 0. */
  underbilling: number;
  costToComplete: number;
  /** Estimate at completion (projected final cost). */
  estimatedFinalCost: number;
  /** contractAmount − estimatedFinalCost. */
  estimatedProfit: number;
  /** estimatedProfit / contractAmount, as a percentage. */
  marginPercent: number;
  /** Cost Performance Index (EV/AC); null when no actuals. */
  cpi: number | null;
  /** Schedule Performance Index (EV/PV); null without a usable schedule. */
  spi: number | null;
  /** Cost variance in cost terms: EV − AC. */
  costVariance: number;
  /** Schedule variance in cost terms: EV − PV; null without a schedule. */
  scheduleVariance: number | null;
}

/** Compute a single project's WIP / earned-value row. */
export function computeWipRow(input: WipProjectInput): WipProjectRow {
  const contractAmount = round2((input.contractAmount ?? 0) + (input.approvedChangeOrders ?? 0));
  const estimatedTotalCost = round2(input.estimatedTotalCost ?? 0);
  const actualCostToDate = round2(input.actualCostToDate ?? 0);
  const billedToDate = round2(input.billedToDate ?? 0);

  const percentComplete =
    input.manualPercentComplete != null
      ? clamp01(input.manualPercentComplete / 100)
      : estimatedTotalCost > 0
        ? clamp01(actualCostToDate / estimatedTotalCost)
        : 0;

  const earnedRevenue = round2(percentComplete * contractAmount);
  const overbilling = round2(Math.max(0, billedToDate - earnedRevenue));
  const underbilling = round2(Math.max(0, earnedRevenue - billedToDate));

  // EAC: cost-to-date / percent complete (equivalently BAC/CPI). Falls back to
  // the current estimate when there is nothing to extrapolate from yet.
  const estimatedFinalCost =
    percentComplete > 0 && actualCostToDate > 0
      ? round2(actualCostToDate / percentComplete)
      : estimatedTotalCost || actualCostToDate;
  const costToComplete = round2(Math.max(0, estimatedFinalCost - actualCostToDate));

  const estimatedProfit = round2(contractAmount - estimatedFinalCost);
  const marginPercent = contractAmount > 0 ? round2((estimatedProfit / contractAmount) * 100) : 0;

  // Earned value in cost terms uses BAC = estimated total cost.
  const evCost = percentComplete * estimatedTotalCost;
  const cpi = actualCostToDate > 0 ? round2(evCost / actualCostToDate) : null;
  const costVariance = round2(evCost - actualCostToDate);

  const plannedPct = plannedPercentComplete(
    input.startDate,
    input.endDate,
    input.asOf ?? new Date()
  );
  let spi: number | null = null;
  let scheduleVariance: number | null = null;
  if (plannedPct != null && plannedPct > 0) {
    const pvCost = plannedPct * estimatedTotalCost;
    spi = round2(evCost / pvCost);
    scheduleVariance = round2(evCost - pvCost);
  }

  return {
    projectId: input.projectId,
    name: input.name ?? 'Untitled project',
    contractAmount,
    estimatedTotalCost,
    actualCostToDate,
    percentComplete,
    earnedRevenue,
    billedToDate,
    overbilling,
    underbilling,
    costToComplete,
    estimatedFinalCost,
    estimatedProfit,
    marginPercent,
    cpi,
    spi,
    costVariance,
    scheduleVariance,
  };
}

export interface WipScheduleTotals {
  contractAmount: number;
  estimatedTotalCost: number;
  actualCostToDate: number;
  earnedRevenue: number;
  billedToDate: number;
  overbilling: number;
  underbilling: number;
  costToComplete: number;
  estimatedFinalCost: number;
  estimatedProfit: number;
  /** Blended margin across all projects. */
  marginPercent: number;
}

export interface WipSchedule {
  rows: WipProjectRow[];
  totals: WipScheduleTotals;
}

/** Build a full WIP schedule across projects with reconciled totals. */
export function buildWipSchedule(inputs: WipProjectInput[]): WipSchedule {
  const rows = inputs.map(computeWipRow).sort((a, b) => a.name.localeCompare(b.name));

  const totals = rows.reduce<WipScheduleTotals>(
    (acc, r) => ({
      contractAmount: acc.contractAmount + r.contractAmount,
      estimatedTotalCost: acc.estimatedTotalCost + r.estimatedTotalCost,
      actualCostToDate: acc.actualCostToDate + r.actualCostToDate,
      earnedRevenue: acc.earnedRevenue + r.earnedRevenue,
      billedToDate: acc.billedToDate + r.billedToDate,
      overbilling: acc.overbilling + r.overbilling,
      underbilling: acc.underbilling + r.underbilling,
      costToComplete: acc.costToComplete + r.costToComplete,
      estimatedFinalCost: acc.estimatedFinalCost + r.estimatedFinalCost,
      estimatedProfit: acc.estimatedProfit + r.estimatedProfit,
      marginPercent: 0,
    }),
    {
      contractAmount: 0,
      estimatedTotalCost: 0,
      actualCostToDate: 0,
      earnedRevenue: 0,
      billedToDate: 0,
      overbilling: 0,
      underbilling: 0,
      costToComplete: 0,
      estimatedFinalCost: 0,
      estimatedProfit: 0,
      marginPercent: 0,
    }
  );

  // Round totals and derive the blended margin from the rounded aggregates.
  (Object.keys(totals) as (keyof WipScheduleTotals)[]).forEach((k) => {
    totals[k] = round2(totals[k]);
  });
  totals.marginPercent =
    totals.contractAmount > 0
      ? round2((totals.estimatedProfit / totals.contractAmount) * 100)
      : 0;

  return { rows, totals };
}

export interface CostCodeForecastInput {
  costCodeId: string | null;
  code: string;
  name: string;
  budgetedCost: number;
  actualCost: number;
  /** Optional manual percent complete (0–100); defaults to cost-based. */
  manualPercentComplete?: number | null;
}

export interface CostCodeForecastRow {
  costCodeId: string | null;
  code: string;
  name: string;
  budgetedCost: number;
  actualCost: number;
  /** 0–1. */
  percentComplete: number;
  projectedFinalCost: number;
  costToComplete: number;
  /** budgetedCost − projectedFinalCost (positive = projected under budget). */
  variance: number;
  /** Contract revenue allocated to this code, pro-rata by budget. */
  allocatedRevenue: number;
  /** allocatedRevenue − projectedFinalCost. */
  projectedMargin: number;
}

export interface CostCodeForecast {
  rows: CostCodeForecastRow[];
  totals: {
    budgetedCost: number;
    actualCost: number;
    projectedFinalCost: number;
    costToComplete: number;
    variance: number;
    allocatedRevenue: number;
    projectedMargin: number;
  };
}

/**
 * Cost-to-complete forecast per cost code. Contract revenue is allocated to each
 * code pro-rata by its budgeted cost so a projected margin can be shown; pass
 * totalContract = 0 to skip revenue allocation.
 */
export function summarizeCostToComplete(
  inputs: CostCodeForecastInput[],
  totalContract = 0
): CostCodeForecast {
  const totalBudget = inputs.reduce((s, i) => s + (i.budgetedCost ?? 0), 0);

  const rows = inputs
    .map((i): CostCodeForecastRow => {
      const budgetedCost = round2(i.budgetedCost ?? 0);
      const actualCost = round2(i.actualCost ?? 0);
      const percentComplete =
        i.manualPercentComplete != null
          ? clamp01(i.manualPercentComplete / 100)
          : budgetedCost > 0
            ? clamp01(actualCost / budgetedCost)
            : actualCost > 0
              ? 1
              : 0;
      const projectedFinalCost =
        percentComplete > 0 && actualCost > 0
          ? round2(actualCost / percentComplete)
          : budgetedCost || actualCost;
      const costToComplete = round2(Math.max(0, projectedFinalCost - actualCost));
      const variance = round2(budgetedCost - projectedFinalCost);
      const allocatedRevenue =
        totalBudget > 0 ? round2((budgetedCost / totalBudget) * totalContract) : 0;
      const projectedMargin = round2(allocatedRevenue - projectedFinalCost);

      return {
        costCodeId: i.costCodeId,
        code: i.code,
        name: i.name,
        budgetedCost,
        actualCost,
        percentComplete,
        projectedFinalCost,
        costToComplete,
        variance,
        allocatedRevenue,
        projectedMargin,
      };
    })
    .sort((a, b) => a.code.localeCompare(b.code));

  const totals = rows.reduce(
    (acc, r) => ({
      budgetedCost: round2(acc.budgetedCost + r.budgetedCost),
      actualCost: round2(acc.actualCost + r.actualCost),
      projectedFinalCost: round2(acc.projectedFinalCost + r.projectedFinalCost),
      costToComplete: round2(acc.costToComplete + r.costToComplete),
      variance: round2(acc.variance + r.variance),
      allocatedRevenue: round2(acc.allocatedRevenue + r.allocatedRevenue),
      projectedMargin: round2(acc.projectedMargin + r.projectedMargin),
    }),
    {
      budgetedCost: 0,
      actualCost: 0,
      projectedFinalCost: 0,
      costToComplete: 0,
      variance: 0,
      allocatedRevenue: 0,
      projectedMargin: 0,
    }
  );

  return { rows, totals };
}
