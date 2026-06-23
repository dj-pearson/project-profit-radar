/**
 * Material cost / procurement summary logic (US-105).
 *
 * Pure aggregation of purchase-order line items by cost code, classified by the
 * parent PO's status into "committed" (approved but not yet received) vs
 * "spent" (received), compared against per-cost-code material budgets.
 * No React / Supabase so it is unit testable.
 */

/** PO statuses that represent a financial commitment not yet received. */
const COMMITTED_STATUSES = new Set(['sent', 'submitted', 'approved', 'ordered']);
/** PO statuses that represent money actually spent (goods received). */
const RECEIVED_STATUSES = new Set(['received', 'completed', 'closed']);

export function isCommittedStatus(status: string | null | undefined): boolean {
  return COMMITTED_STATUSES.has((status ?? '').toLowerCase());
}
export function isReceivedStatus(status: string | null | undefined): boolean {
  return RECEIVED_STATUSES.has((status ?? '').toLowerCase());
}

export interface PoLineItemInput {
  cost_code_id: string | null;
  amount: number;
  /** Parent purchase order's status. */
  status: string | null;
}

export interface CostCodeMeta {
  id: string;
  code?: string | null;
  name?: string | null;
}

export interface BudgetMeta {
  cost_code_id: string;
  material_budget?: number | null;
  budgeted_amount?: number | null;
}

export interface MaterialCostRow {
  costCodeId: string | null;
  code: string;
  name: string;
  budgeted: number;
  committed: number;
  spent: number;
  /** budgeted - (committed + spent); negative means over budget. */
  variance: number;
}

export interface MaterialCostSummary {
  rows: MaterialCostRow[];
  totals: { budgeted: number; committed: number; spent: number; variance: number };
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

const UNCODED = '__uncoded__';

/**
 * Summarize PO line items into per-cost-code budgeted / committed / spent rows.
 * Includes a row for every budgeted cost code (even with no POs yet) and an
 * "Uncoded" row for line items with no cost code.
 */
export function summarizeMaterialCosts(input: {
  lineItems: PoLineItemInput[];
  budgets: BudgetMeta[];
  costCodes: CostCodeMeta[];
}): MaterialCostSummary {
  const { lineItems, budgets, costCodes } = input;
  const codeMeta = new Map(costCodes.map((c) => [c.id, c]));

  const budgetByCode = new Map<string, number>();
  for (const b of budgets) {
    const value = b.material_budget ?? b.budgeted_amount ?? 0;
    budgetByCode.set(b.cost_code_id, (budgetByCode.get(b.cost_code_id) ?? 0) + value);
  }

  // Seed rows from all budgeted cost codes so zero-PO codes still show.
  const rowMap = new Map<string, MaterialCostRow>();
  const ensureRow = (key: string): MaterialCostRow => {
    let row = rowMap.get(key);
    if (!row) {
      const meta = key === UNCODED ? undefined : codeMeta.get(key);
      row = {
        costCodeId: key === UNCODED ? null : key,
        code: key === UNCODED ? '—' : (meta?.code ?? '—'),
        name: key === UNCODED ? 'Uncoded' : (meta?.name ?? 'Unknown cost code'),
        budgeted: 0,
        committed: 0,
        spent: 0,
        variance: 0,
      };
      rowMap.set(key, row);
    }
    return row;
  };

  for (const [codeId, budgeted] of budgetByCode) {
    ensureRow(codeId).budgeted = budgeted;
  }

  for (const li of lineItems) {
    const key = li.cost_code_id ?? UNCODED;
    const row = ensureRow(key);
    if (isReceivedStatus(li.status)) row.spent += li.amount;
    else if (isCommittedStatus(li.status)) row.committed += li.amount;
  }

  const rows = Array.from(rowMap.values()).map((r) => ({
    ...r,
    budgeted: round2(r.budgeted),
    committed: round2(r.committed),
    spent: round2(r.spent),
    variance: round2(r.budgeted - (r.committed + r.spent)),
  }));

  rows.sort((a, b) => a.code.localeCompare(b.code));

  const totals = rows.reduce(
    (acc, r) => ({
      budgeted: round2(acc.budgeted + r.budgeted),
      committed: round2(acc.committed + r.committed),
      spent: round2(acc.spent + r.spent),
      variance: round2(acc.variance + r.variance),
    }),
    { budgeted: 0, committed: 0, spent: 0, variance: 0 }
  );

  return { rows, totals };
}
