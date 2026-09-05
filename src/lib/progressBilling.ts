/**
 * Progress billing, retainage and time-and-materials arithmetic (US-327).
 *
 * Two screens used to invent the contract value:
 *
 *   ProgressBillingManager.tsx:67   const totalBudget = 100000;
 *   RetentionManager.tsx:71         const totalInvoiceValue = 100000;
 *
 * and then found their own prior invoices with .ilike('notes', '%progress%'),
 * so an invoice noting "progress photos attached" counted as a billing. This
 * module holds the arithmetic instead, as pure functions over rows the caller
 * has already fetched, so the numbers can be tested without a database and so
 * the same answer is given wherever they are asked.
 *
 * MONEY IS ROUNDED TO CENTS AT EVERY BOUNDARY. Percent-complete billing
 * multiplies a percentage by a scheduled value; unrounded, a twelve-line SOV
 * accumulates a few cents of drift per period and the final billing never
 * closes the contract out exactly.
 */

/** Round to cents, away from zero, without the float artefacts of toFixed. */
export const cents = (n: number): number => {
  if (!Number.isFinite(n)) return 0;
  return Math.round((n + Number.EPSILON * Math.sign(n || 1)) * 100) / 100;
};

export interface SovLine {
  sov_line_id: string;
  description: string;
  scheduled_value: number;
  /** What earlier, non-cancelled invoices already billed against this line. */
  previously_billed: number;
  cost_code_id?: string | null;
  line_number?: number;
}

export interface SovLineBilling extends SovLine {
  /** Percent of this line complete as of this period, 0-100. */
  percentComplete: number;
  /** Value earned to date on this line at that percentage. */
  completedToDate: number;
  /** What this period bills: earned to date less what was already billed. */
  thisPeriod: number;
}

export interface ProgressInvoiceTotals {
  lines: SovLineBilling[];
  /** Sum of scheduled values: the contract as the schedule of values states it. */
  contractTotal: number;
  /** Earned to date across every line. */
  completedToDate: number;
  /** Billed on earlier invoices. */
  previouslyBilled: number;
  /** Gross value of this period's billing, before retainage. */
  thisPeriodGross: number;
  retainagePercentage: number;
  /** Retainage withheld from this period only. */
  retainageThisPeriod: number;
  /** What the customer owes now. */
  netDue: number;
  /** Contract less earned to date. */
  remainingToBill: number;
}

/**
 * Bill each schedule-of-values line to a percentage.
 *
 * A negative period is possible and is not clamped away: if the percentage
 * entered is lower than what has already been billed, the caller must see the
 * credit rather than a silent zero. Refusing to bill is a decision for the
 * screen, which can explain it.
 */
export function computeProgressInvoice(params: {
  lines: SovLine[];
  /** sov_line_id to percent complete, 0-100. Missing lines bill nothing new. */
  percentComplete: Record<string, number>;
  retainagePercentage?: number;
}): ProgressInvoiceTotals {
  const retainagePercentage = clampPercent(params.retainagePercentage ?? 0);

  const lines: SovLineBilling[] = params.lines.map((line) => {
    const scheduled = cents(line.scheduled_value || 0);
    const already = cents(line.previously_billed || 0);
    const pct = clampPercent(
      params.percentComplete[line.sov_line_id] ??
        (scheduled > 0 ? (already / scheduled) * 100 : 0)
    );
    const completedToDate = cents(scheduled * (pct / 100));
    return {
      ...line,
      scheduled_value: scheduled,
      previously_billed: already,
      percentComplete: pct,
      completedToDate,
      thisPeriod: cents(completedToDate - already),
    };
  });

  const contractTotal = cents(sum(lines.map((l) => l.scheduled_value)));
  const completedToDate = cents(sum(lines.map((l) => l.completedToDate)));
  const previouslyBilled = cents(sum(lines.map((l) => l.previously_billed)));
  const thisPeriodGross = cents(sum(lines.map((l) => l.thisPeriod)));
  const retainageThisPeriod = cents(thisPeriodGross * (retainagePercentage / 100));

  return {
    lines,
    contractTotal,
    completedToDate,
    previouslyBilled,
    thisPeriodGross,
    retainagePercentage,
    retainageThisPeriod,
    netDue: cents(thisPeriodGross - retainageThisPeriod),
    remainingToBill: cents(contractTotal - completedToDate),
  };
}

export interface RetainageBalance {
  withheldToDate: number;
  releasedToDate: number;
  /** Still held by the owner. What a release invoice can bill. */
  balance: number;
}

/**
 * What is left to release.
 *
 * Withheld and released both come from invoices - the progress invoices record
 * what they held back, the release invoices record what came out. That is the
 * one retainage model. retention_items and retention_tracking are deprecated
 * by the same migration; neither was ever written to.
 */
export function computeRetainageBalance(params: {
  withheldToDate: number;
  releasedToDate: number;
}): RetainageBalance {
  const withheldToDate = cents(params.withheldToDate || 0);
  const releasedToDate = cents(params.releasedToDate || 0);
  return {
    withheldToDate,
    releasedToDate,
    balance: Math.max(0, cents(withheldToDate - releasedToDate)),
  };
}

export interface UnbilledWorkRow {
  source_type: 'time' | 'expense';
  source_id: string;
  description: string;
  work_date: string;
  quantity: number;
  /** Null when no billing rate is set. Such a row cannot be billed. */
  unit_price: number | null;
  cost_code_id?: string | null;
}

export interface TimeAndMaterialsTotals {
  billable: Array<UnbilledWorkRow & { lineTotal: number }>;
  /** Rows with no billing rate. Shown, never billed at a guessed rate. */
  unpriced: UnbilledWorkRow[];
  laborTotal: number;
  expenseTotal: number;
  total: number;
}

/**
 * Price approved hours and billable expenses for a T&M invoice.
 *
 * A row with no billing rate is separated out rather than billed at zero or at
 * cost. Billing a customer at an invented rate is worse than telling the
 * estimator to set one, and a zero-dollar line on an invoice reads as free
 * work.
 */
export function computeTimeAndMaterials(rows: UnbilledWorkRow[]): TimeAndMaterialsTotals {
  const billable: Array<UnbilledWorkRow & { lineTotal: number }> = [];
  const unpriced: UnbilledWorkRow[] = [];

  for (const row of rows) {
    const qty = Number(row.quantity) || 0;
    if (row.unit_price == null || !Number.isFinite(row.unit_price) || row.unit_price <= 0) {
      unpriced.push(row);
      continue;
    }
    if (qty <= 0) {
      unpriced.push(row);
      continue;
    }
    billable.push({ ...row, lineTotal: cents(qty * row.unit_price) });
  }

  const laborTotal = cents(
    sum(billable.filter((r) => r.source_type === 'time').map((r) => r.lineTotal))
  );
  const expenseTotal = cents(
    sum(billable.filter((r) => r.source_type === 'expense').map((r) => r.lineTotal))
  );

  return { billable, unpriced, laborTotal, expenseTotal, total: cents(laborTotal + expenseTotal) };
}

/**
 * Does the schedule of values still add up to the contract?
 *
 * They drift the moment somebody edits one and not the other, and a schedule
 * of values that does not equal the contract is the document an owner rejects
 * a payment application over.
 */
export function reconcileSovToContract(params: {
  sovTotal: number;
  contractValue: number;
  /** Cents of difference to tolerate. One cent per SOV line is normal. */
  toleranceCents?: number;
}): { agrees: boolean; difference: number } {
  const difference = cents(params.sovTotal - params.contractValue);
  const tolerance = (params.toleranceCents ?? 1) / 100;
  return { agrees: Math.abs(difference) <= tolerance, difference };
}

function clampPercent(n: number): number {
  const v = Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.min(100, Math.max(0, v));
}

function sum(ns: number[]): number {
  return ns.reduce((a, b) => a + (Number(b) || 0), 0);
}
