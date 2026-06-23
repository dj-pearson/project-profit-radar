/**
 * Change-order impact-on-contract logic (US-097).
 *
 * Pure aggregation of a project's change orders against its original contract
 * amount — no React / Supabase — so the financial math + timeline are unit
 * testable.
 */

export interface ChangeOrderInput {
  id: string;
  change_order_number?: string | null;
  title?: string | null;
  amount: number;
  status?: string | null;
  client_approved?: boolean | null;
  client_approved_date?: string | null;
  internal_approved_date?: string | null;
  created_at?: string | null;
}

/** An approved change order is one accepted by the client or marked approved. */
export function isApproved(co: ChangeOrderInput): boolean {
  const status = (co.status ?? '').toLowerCase();
  return co.client_approved === true || status === 'approved' || status === 'completed';
}

/** Pending = not yet approved and not rejected/cancelled/void. */
export function isPending(co: ChangeOrderInput): boolean {
  if (isApproved(co)) return false;
  const status = (co.status ?? '').toLowerCase();
  return status !== 'rejected' && status !== 'cancelled' && status !== 'void' && status !== 'declined';
}

/** Best-known approval date for a CO, for ordering the contract timeline. */
export function approvalDate(co: ChangeOrderInput): string | null {
  return co.client_approved_date ?? co.internal_approved_date ?? co.created_at ?? null;
}

export interface ChangeOrderSummary {
  originalContract: number;
  approvedAdditions: number;
  approvedDeductions: number;
  approvedTotal: number; // net = additions + deductions (deductions are negative)
  approvedCount: number;
  currentContract: number;
  pendingTotal: number;
  pendingCount: number;
  potentialContract: number; // current + pending
}

/** Summarize change orders relative to the original contract amount. */
export function summarizeChangeOrders(
  orders: ChangeOrderInput[],
  originalContract: number
): ChangeOrderSummary {
  let approvedAdditions = 0;
  let approvedDeductions = 0;
  let approvedCount = 0;
  let pendingTotal = 0;
  let pendingCount = 0;

  for (const co of orders) {
    if (isApproved(co)) {
      approvedCount += 1;
      if (co.amount >= 0) approvedAdditions += co.amount;
      else approvedDeductions += co.amount;
    } else if (isPending(co)) {
      pendingCount += 1;
      pendingTotal += co.amount;
    }
  }

  const approvedTotal = approvedAdditions + approvedDeductions;
  const currentContract = originalContract + approvedTotal;
  return {
    originalContract,
    approvedAdditions,
    approvedDeductions,
    approvedTotal,
    approvedCount,
    currentContract,
    pendingTotal,
    pendingCount,
    potentialContract: currentContract + pendingTotal,
  };
}

export interface ContractTimelinePoint {
  label: string;
  date: string | null;
  amount: number;
}

/**
 * Cumulative contract-amount timeline: starts at the original contract, then
 * one point per approved change order (in approval-date order) showing the
 * running contract total after that CO.
 */
export function buildContractTimeline(
  orders: ChangeOrderInput[],
  originalContract: number
): ContractTimelinePoint[] {
  const approved = orders
    .filter(isApproved)
    .sort((a, b) => {
      const da = approvalDate(a) ?? '';
      const db = approvalDate(b) ?? '';
      return da.localeCompare(db);
    });

  const points: ContractTimelinePoint[] = [
    { label: 'Original', date: null, amount: originalContract },
  ];
  let running = originalContract;
  for (const co of approved) {
    running += co.amount;
    points.push({
      label: co.change_order_number || co.title || 'CO',
      date: approvalDate(co),
      amount: running,
    });
  }
  return points;
}
