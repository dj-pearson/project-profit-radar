/**
 * Estimate-to-invoice conversion logic (US-101).
 *
 * Pure transforms — no React / Supabase — so line-item selection, progress-bill
 * percentage, and per-line amount overrides are unit testable.
 */

export interface EstimateLineItemInput {
  id: string;
  item_name?: string | null;
  description?: string | null;
  quantity?: number | null;
  unit_cost?: number | null;
  total_cost?: number | null;
  cost_code_id?: string | null;
}

export interface InvoiceLineItemDraft {
  estimate_line_item_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  line_total: number;
  cost_code_id: string | null;
}

export interface ConversionOptions {
  /** Estimate line-item ids to include. Omit to include all. */
  selectedIds?: Set<string> | string[];
  /** Progress-billing percentage (e.g. 30 = bill 30%). Defaults to 100. */
  percentage?: number;
  /** Per-line overrides of the final billed line total (post-percentage), keyed by line id. */
  amountOverrides?: Record<string, number>;
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

/** The estimate's base total for a line (explicit total_cost, else qty × unit_cost). */
export function lineBaseTotal(line: EstimateLineItemInput): number {
  if (typeof line.total_cost === 'number') return line.total_cost;
  return (line.quantity ?? 0) * (line.unit_cost ?? 0);
}

function toSet(ids?: Set<string> | string[]): Set<string> | null {
  if (!ids) return null;
  return ids instanceof Set ? ids : new Set(ids);
}

/**
 * Build invoice line-item drafts from estimate line items, applying selection,
 * progress-billing percentage, and per-line amount overrides.
 *
 * Quantity is preserved from the estimate; the billed amount is reflected in
 * unit_price so `quantity × unit_price === line_total`.
 */
export function buildInvoiceLineItems(
  lineItems: EstimateLineItemInput[],
  options: ConversionOptions = {}
): InvoiceLineItemDraft[] {
  const { percentage = 100, amountOverrides = {} } = options;
  const selected = toSet(options.selectedIds);
  const pct = percentage / 100;

  return lineItems
    .filter((li) => (selected ? selected.has(li.id) : true))
    .map((li) => {
      const billedTotal = li.id in amountOverrides
        ? amountOverrides[li.id]
        : round2(lineBaseTotal(li) * pct);
      const qty = li.quantity && li.quantity > 0 ? li.quantity : 1;
      const unitPrice = round2(billedTotal / qty);
      return {
        estimate_line_item_id: li.id,
        description: li.item_name || li.description || 'Line item',
        quantity: qty,
        unit_price: unitPrice,
        line_total: round2(unitPrice * qty),
        cost_code_id: li.cost_code_id ?? null,
      };
    });
}

/** Subtotal of a set of invoice line-item drafts. */
export function conversionSubtotal(drafts: InvoiceLineItemDraft[]): number {
  return round2(drafts.reduce((sum, d) => sum + d.line_total, 0));
}

export interface BilledSummary {
  estimateTotal: number;
  alreadyBilled: number;
  remaining: number;
  percentBilled: number;
}

/**
 * Summarize how much of an estimate has already been billed across linked
 * invoices, to guide progress billing.
 */
export function summarizeBilled(
  estimateTotal: number,
  linkedInvoiceTotals: number[]
): BilledSummary {
  const alreadyBilled = round2(linkedInvoiceTotals.reduce((s, n) => s + n, 0));
  const remaining = round2(Math.max(estimateTotal - alreadyBilled, 0));
  const percentBilled = estimateTotal > 0 ? round2((alreadyBilled / estimateTotal) * 100) : 0;
  return { estimateTotal, alreadyBilled, remaining, percentBilled };
}
