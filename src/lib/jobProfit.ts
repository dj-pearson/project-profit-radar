/**
 * What a job made (US-322).
 *
 * Two screens answered this differently, which is worse than either answer:
 *
 *   ProjectProfitLoss     revenue = projects.budget plus change orders,
 *                         cost = job_costs plus contractor_payments,
 *                         expenses excluded.
 *   JobProfitabilityOverview  revenue = amount_paid on invoices,
 *                             cost = job_costs plus expenses.
 *
 * So the same job showed two profits, and neither was labelled. This module is
 * the one definition. It is deliberately explicit about which revenue basis it
 * used, because "profit" against a contract you have not yet invoiced is a
 * forecast and profit against cash collected is a fact, and a contractor
 * deciding whether to take another job needs to know which they are reading.
 *
 * Cost is whatever is in job_costs. Since US-321 and US-322 that is labor from
 * approved time, materials from approved expenses and received purchase orders,
 * vendor bills and subcontractor payments - one ledger, one posting path, so
 * callers must NOT add expenses on top or they will double-count what the
 * expense trigger already posted.
 */

export type RevenueBasis = 'invoiced' | 'collected' | 'contract';

export interface JobCostRow {
  labor_cost?: number | null;
  material_cost?: number | null;
  equipment_cost?: number | null;
  subcontractor_cost?: number | null;
  other_cost?: number | null;
  total_cost?: number | null;
}

export interface JobProfitInput {
  /** Rows from job_costs for this project. The whole cost picture. */
  jobCosts: JobCostRow[];
  /** Sum of invoices raised. */
  invoicedToDate?: number | null;
  /** Sum of payments received. */
  collectedToDate?: number | null;
  /** Original contract value plus approved change orders. */
  currentContractValue?: number | null;
  /** Open purchase order value: committed, never counted as incurred. */
  committedCost?: number | null;
}

export interface JobProfit {
  revenue: number;
  /** Which basis `revenue` came from, so the UI can say so. */
  revenueBasis: RevenueBasis;
  /** Human-readable label for that basis. */
  revenueLabel: string;
  cost: number;
  costBreakdown: {
    labor: number;
    material: number;
    equipment: number;
    subcontractor: number;
    other: number;
  };
  /** revenue - cost. */
  profit: number;
  /** profit as a percentage of revenue, 0 when there is no revenue. */
  marginPercent: number;
  /** Open purchase orders, reported beside cost and never inside it. */
  committedCost: number;
  /** cost + committedCost: what the job is on track to have spent. */
  projectedCost: number;
}

const n = (v: number | null | undefined): number => (typeof v === 'number' ? v : 0);

const LABELS: Record<RevenueBasis, string> = {
  invoiced: 'invoiced to date',
  collected: 'collected to date',
  contract: 'current contract value',
};

/**
 * Sums a job's costs and profit on one basis, chosen in this order: invoiced,
 * then collected, then contract value.
 *
 * Invoiced first because it is what the job has actually earned. Contract value
 * is the fallback rather than the default: it is what the job is expected to
 * earn, so profit against it is a forecast, and the returned `revenueBasis`
 * says so rather than leaving the reader to assume.
 */
export function computeJobProfit(input: JobProfitInput): JobProfit {
  const costBreakdown = input.jobCosts.reduce(
    (acc, row) => ({
      labor: acc.labor + n(row.labor_cost),
      material: acc.material + n(row.material_cost),
      equipment: acc.equipment + n(row.equipment_cost),
      subcontractor: acc.subcontractor + n(row.subcontractor_cost),
      other: acc.other + n(row.other_cost),
    }),
    { labor: 0, material: 0, equipment: 0, subcontractor: 0, other: 0 }
  );

  // Prefer the components, and fall back to total_cost only where a row has a
  // total but no split - a hand-entered cost, or one from before US-322.
  const componentSum =
    costBreakdown.labor + costBreakdown.material + costBreakdown.equipment +
    costBreakdown.subcontractor + costBreakdown.other;

  const unsplitTotals = input.jobCosts.reduce((sum, row) => {
    const split =
      n(row.labor_cost) + n(row.material_cost) + n(row.equipment_cost) +
      n(row.subcontractor_cost) + n(row.other_cost);
    return split === 0 ? sum + n(row.total_cost) : sum;
  }, 0);

  const cost = round2(componentSum + unsplitTotals);
  if (unsplitTotals > 0) costBreakdown.other = round2(costBreakdown.other + unsplitTotals);

  let revenue: number;
  let revenueBasis: RevenueBasis;

  if (n(input.invoicedToDate) > 0) {
    revenue = n(input.invoicedToDate);
    revenueBasis = 'invoiced';
  } else if (n(input.collectedToDate) > 0) {
    revenue = n(input.collectedToDate);
    revenueBasis = 'collected';
  } else {
    revenue = n(input.currentContractValue);
    revenueBasis = 'contract';
  }

  revenue = round2(revenue);
  const profit = round2(revenue - cost);
  const committedCost = round2(n(input.committedCost));

  return {
    revenue,
    revenueBasis,
    revenueLabel: LABELS[revenueBasis],
    cost,
    costBreakdown,
    profit,
    marginPercent: revenue > 0 ? round2((profit / revenue) * 100) : 0,
    committedCost,
    projectedCost: round2(cost + committedCost),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
