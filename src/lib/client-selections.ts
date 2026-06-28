/**
 * US-226: Client selections — pure, I/O-free helpers.
 *
 * The financial rules (over-allowance delta, board summary) live here so they
 * are unit-testable independent of Supabase and the UI. Persistence and
 * change-order generation live in services/clientSelectionsService.ts.
 */

export type SelectionStatus = 'pending' | 'approved' | 'rejected';

export interface SelectionCategory {
  id: string;
  company_id: string;
  project_id: string;
  name: string;
  description: string | null;
  allowance: number;
  created_at: string;
  updated_at: string;
}

export interface SelectionOption {
  id: string;
  company_id: string;
  category_id: string;
  name: string;
  description: string | null;
  price: number;
  supplier: string | null;
  image_url: string | null;
  created_at: string;
  updated_at: string;
}

export interface ClientSelection {
  id: string;
  company_id: string;
  project_id: string;
  category_id: string;
  option_id: string;
  status: SelectionStatus;
  delta_amount: number;
  change_order_id: string | null;
  notes: string | null;
  selected_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
  updated_at: string;
}

/** A category joined with its options and the client's current selection. */
export interface SelectionBoardRow {
  category: SelectionCategory;
  options: SelectionOption[];
  selection: ClientSelection | null;
}

/**
 * The amount by which a chosen option exceeds the category allowance. Never
 * negative — picking an under-allowance option doesn't reduce the contract
 * (the allowance is already budgeted), so the delta floors at 0.
 */
export function computeOverAllowanceDelta(allowance: number, optionPrice: number): number {
  return Math.max(0, (optionPrice ?? 0) - (allowance ?? 0));
}

/** Whether a chosen option costs more than its category allowance. */
export function isOverAllowance(allowance: number, optionPrice: number): boolean {
  return (optionPrice ?? 0) > (allowance ?? 0);
}

export const SELECTION_STATUS_LABELS: Record<SelectionStatus, string> = {
  pending: 'Pending approval',
  approved: 'Approved',
  rejected: 'Rejected',
};

export interface SelectionSummary {
  /** Sum of all category allowances. */
  totalAllowance: number;
  /** Sum of the prices of currently-selected options. */
  totalSelectedPrice: number;
  /** Sum of positive over-allowance deltas across selected options. */
  totalOverage: number;
  categories: number;
  selected: number;
  pending: number;
  approved: number;
}

/**
 * Summarize a selection board for a header/totals strip. `totalOverage` is the
 * extra cost the client has incurred above allowances (the basis for change
 * orders); only counts categories that currently have a selected option.
 */
export function summarizeSelections(rows: SelectionBoardRow[]): SelectionSummary {
  const summary: SelectionSummary = {
    totalAllowance: 0,
    totalSelectedPrice: 0,
    totalOverage: 0,
    categories: rows.length,
    selected: 0,
    pending: 0,
    approved: 0,
  };

  for (const row of rows) {
    summary.totalAllowance += row.category.allowance ?? 0;
    if (!row.selection) continue;
    const option = row.options.find((o) => o.id === row.selection?.option_id);
    if (option) {
      summary.totalSelectedPrice += option.price ?? 0;
      summary.totalOverage += computeOverAllowanceDelta(row.category.allowance, option.price);
    }
    summary.selected += 1;
    if (row.selection.status === 'pending') summary.pending += 1;
    if (row.selection.status === 'approved') summary.approved += 1;
  }

  return summary;
}
