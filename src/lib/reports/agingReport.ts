/**
 * Accounts Receivable aging report logic (US-069).
 *
 * Pure functions — no React, no Supabase — so the bucketing/aging math is unit
 * testable. Groups unpaid invoices into Current (0-30), 31-60, 61-90, and 90+
 * day buckets based on days past the due date.
 */

export type AgingBucketKey = 'current' | '31-60' | '61-90' | '90+';

export interface AgingInvoiceInput {
  id: string;
  invoice_number: string;
  client_name: string | null;
  due_date: string | null;
  status: string | null;
  /** Total invoiced amount (fallback when no explicit balance is present). */
  total_amount?: number | null;
  /** Remaining balance owed, if tracked separately. */
  amount_due?: number | null;
  amount_paid?: number | null;
}

export interface AgingInvoiceRow extends AgingInvoiceInput {
  bucket: AgingBucketKey;
  daysOutstanding: number;
  outstanding: number;
}

export interface AgingBucketSummary {
  key: AgingBucketKey;
  label: string;
  total: number;
  count: number;
}

export const AGING_BUCKETS: { key: AgingBucketKey; label: string }[] = [
  { key: 'current', label: 'Current (0-30)' },
  { key: '31-60', label: '31-60 days' },
  { key: '61-90', label: '61-90 days' },
  { key: '90+', label: '90+ days' },
];

/** Statuses that mean the invoice still owes money and belongs in the aging report. */
const UNPAID_STATUSES = new Set(['sent', 'partial', 'overdue', 'viewed', 'unpaid']);

/** Whole days between two dates (a - b), floored, can be negative when a is before b. */
export function daysBetween(a: Date, b: Date): number {
  const MS_PER_DAY = 1000 * 60 * 60 * 24;
  return Math.floor((a.getTime() - b.getTime()) / MS_PER_DAY);
}

/** Outstanding balance for an invoice: prefer amount_due, else total - paid, else total. */
export function outstandingBalance(inv: AgingInvoiceInput): number {
  if (typeof inv.amount_due === 'number' && inv.amount_due > 0) return inv.amount_due;
  const total = inv.total_amount ?? 0;
  const paid = inv.amount_paid ?? 0;
  return Math.max(total - paid, 0);
}

/** Map a count of days-past-due to its aging bucket. */
export function bucketForDays(daysPastDue: number): AgingBucketKey {
  if (daysPastDue <= 30) return 'current';
  if (daysPastDue <= 60) return '31-60';
  if (daysPastDue <= 90) return '61-90';
  return '90+';
}

/** True when an invoice is unpaid and carries a positive balance. */
export function isOutstanding(inv: AgingInvoiceInput): boolean {
  const status = (inv.status ?? '').toLowerCase();
  if (status === 'paid' || status === 'void' || status === 'cancelled' || status === 'draft') {
    return false;
  }
  // Treat anything not explicitly settled as outstanding when it has a balance,
  // but require a recognized unpaid status when status is set.
  if (status && !UNPAID_STATUSES.has(status)) {
    // Unknown non-terminal status: include only if there is a balance.
    return outstandingBalance(inv) > 0;
  }
  return outstandingBalance(inv) > 0;
}

/** Build per-invoice aging rows from raw invoices, relative to `asOf` (default now). */
export function buildAgingRows(
  invoices: AgingInvoiceInput[],
  asOf: Date = new Date()
): AgingInvoiceRow[] {
  return invoices
    .filter(isOutstanding)
    .map((inv) => {
      const due = inv.due_date ? new Date(inv.due_date) : asOf;
      const daysOutstanding = Math.max(daysBetween(asOf, due), 0);
      return {
        ...inv,
        bucket: bucketForDays(daysOutstanding),
        daysOutstanding,
        outstanding: outstandingBalance(inv),
      };
    })
    .sort((a, b) => b.daysOutstanding - a.daysOutstanding);
}

/** Summarize aging rows into the four bucket totals (always returns all 4 buckets). */
export function summarizeBuckets(rows: AgingInvoiceRow[]): AgingBucketSummary[] {
  return AGING_BUCKETS.map(({ key, label }) => {
    const inBucket = rows.filter((r) => r.bucket === key);
    return {
      key,
      label,
      total: inBucket.reduce((sum, r) => sum + r.outstanding, 0),
      count: inBucket.length,
    };
  });
}

/** Grand total of all outstanding balances. */
export function totalOutstanding(rows: AgingInvoiceRow[]): number {
  return rows.reduce((sum, r) => sum + r.outstanding, 0);
}
