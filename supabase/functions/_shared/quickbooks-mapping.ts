/**
 * Map what QuickBooks knows onto what Brikly knows (US-333).
 *
 * quickbooks-sync pulls Customers and Items into their real Brikly tables, but
 * pulls Purchases into quickbooks_expenses and Payments into
 * quickbooks_payments: two tables read by no file in src/, absent from
 * types.ts, and shown to nobody. The sync dashboard reports those runs as
 * successful, and US-252 made them paginate, so larger companies now import
 * more rows into tables nobody sees.
 *
 * These are pure functions over one QuickBooks row. No network, no database,
 * so the matching rules can be tested exhaustively - which matters, because
 * the failure mode of a bad rule is an expense posted to the wrong job, and
 * that is worse than not importing it at all.
 *
 * THE RULE THROUGHOUT: match confidently or do not match. An unmatched row
 * goes to a review queue where a person decides. Nothing is ever guessed onto
 * a project.
 */

export interface QuickBooksPurchase {
  Id: string;
  TxnDate?: string;
  TotalAmt?: number;
  PrivateNote?: string;
  PaymentType?: string;
  SyncToken?: string;
  EntityRef?: { name?: string; value?: string };
  AccountRef?: { name?: string; value?: string };
  Line?: Array<{
    Amount?: number;
    Description?: string;
    AccountBasedExpenseLineDetail?: {
      AccountRef?: { name?: string; value?: string };
      CustomerRef?: { name?: string; value?: string };
      ClassRef?: { name?: string; value?: string };
      BillableStatus?: string;
    };
    ItemBasedExpenseLineDetail?: {
      ItemRef?: { name?: string; value?: string };
      CustomerRef?: { name?: string; value?: string };
      BillableStatus?: string;
    };
  }>;
}

export interface QuickBooksPayment {
  Id: string;
  TxnDate?: string;
  TotalAmt?: number;
  PrivateNote?: string;
  PaymentRefNum?: string;
  SyncToken?: string;
  CustomerRef?: { name?: string; value?: string };
  PaymentMethodRef?: { name?: string };
  DepositToAccountRef?: { name?: string };
  Line?: Array<{
    Amount?: number;
    LinkedTxn?: Array<{ TxnId?: string; TxnType?: string }>;
  }>;
}

/** What the mapper needs to resolve references, fetched once per sync run. */
export interface MappingContext {
  companyId: string;
  /** Project id by lowercased QuickBooks customer/job name. */
  projectsByName: Map<string, string>;
  /** Project id by QuickBooks customer id, where a project records one. */
  projectsByQbCustomerId?: Map<string, string>;
  /** Cost code id by lowercased QuickBooks account or item name. */
  costCodesByName: Map<string, string>;
  /** Invoice id and balance by invoice number, and by QuickBooks invoice id. */
  invoicesByNumber: Map<string, { id: string; amountDue: number }>;
  invoicesByQbId: Map<string, { id: string; amountDue: number }>;
}

export type MatchConfidence = 'exact' | 'none';

export interface MappedExpense {
  kind: 'expense';
  row: {
    company_id: string;
    project_id: string | null;
    cost_code_id: string | null;
    vendor_name: string;
    amount: number;
    expense_date: string;
    description: string;
    payment_method: string;
    is_billable: boolean;
  };
  qbId: string;
  projectMatch: MatchConfidence;
  costCodeMatch: MatchConfidence;
}

export interface MappedPayment {
  kind: 'payment';
  row: {
    company_id: string;
    invoice_id: string;
    payment_amount: number;
    payment_date: string;
    payment_method: string;
    reference_number: string | null;
    notes: string | null;
  };
  qbId: string;
  invoiceMatch: MatchConfidence;
}

export interface Unmatched {
  kind: 'unmatched';
  qbId: string;
  entity: 'purchase' | 'payment';
  /** Said plainly, because a person reads this in the review queue. */
  reason: string;
  amount: number;
  occurredOn: string | null;
  counterparty: string | null;
  raw: unknown;
}

const norm = (s: string | undefined | null): string => (s ?? '').trim().toLowerCase();
const money = (n: number | undefined | null): number =>
  Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

/**
 * The customer/job a purchase line was booked against.
 *
 * QuickBooks puts it on the line, not the header, and on either of two line
 * detail shapes depending on whether the purchase was account-based or
 * item-based. Reading only the header - which is what the vendor is - is how
 * you end up with every imported expense on no project.
 */
export function customerRefOf(purchase: QuickBooksPurchase): { name?: string; value?: string } | null {
  for (const line of purchase.Line ?? []) {
    const ref =
      line.AccountBasedExpenseLineDetail?.CustomerRef ??
      line.ItemBasedExpenseLineDetail?.CustomerRef;
    if (ref?.name || ref?.value) return ref;
  }
  return null;
}

/**
 * QuickBooks writes a job as "Customer:Job". Only the job half names a
 * project, and matching the whole string would miss every one of them.
 */
export function jobNameOf(customerName: string | undefined): string | null {
  if (!customerName) return null;
  const parts = customerName.split(':').map((p) => p.trim()).filter(Boolean);
  if (parts.length === 0) return null;
  return parts[parts.length - 1];
}

function resolveProject(
  purchase: QuickBooksPurchase,
  ctx: MappingContext
): { id: string | null; match: MatchConfidence } {
  const ref = customerRefOf(purchase);
  if (!ref) return { id: null, match: 'none' };

  if (ref.value && ctx.projectsByQbCustomerId?.has(ref.value)) {
    return { id: ctx.projectsByQbCustomerId.get(ref.value)!, match: 'exact' };
  }

  // The full "Customer:Job" string first, then the job half. Never a fuzzy
  // match: two jobs for the same customer differ by a word.
  const full = norm(ref.name);
  if (full && ctx.projectsByName.has(full)) {
    return { id: ctx.projectsByName.get(full)!, match: 'exact' };
  }
  const job = norm(jobNameOf(ref.name) ?? undefined);
  if (job && ctx.projectsByName.has(job)) {
    return { id: ctx.projectsByName.get(job)!, match: 'exact' };
  }
  return { id: null, match: 'none' };
}

function resolveCostCode(
  purchase: QuickBooksPurchase,
  ctx: MappingContext
): { id: string | null; match: MatchConfidence } {
  for (const line of purchase.Line ?? []) {
    const name =
      line.ItemBasedExpenseLineDetail?.ItemRef?.name ??
      line.AccountBasedExpenseLineDetail?.AccountRef?.name;
    const key = norm(name);
    if (key && ctx.costCodesByName.has(key)) {
      return { id: ctx.costCodesByName.get(key)!, match: 'exact' };
    }
  }
  const account = norm(purchase.AccountRef?.name);
  if (account && ctx.costCodesByName.has(account)) {
    return { id: ctx.costCodesByName.get(account)!, match: 'exact' };
  }
  return { id: null, match: 'none' };
}

/**
 * A QuickBooks purchase as a Brikly expense.
 *
 * An expense with no project is still imported: it is a real cost the company
 * incurred, it belongs in the expense list, and forcing a project would be
 * guessing. It is flagged so the review queue can offer it for assignment. An
 * expense with no DATE or no amount is not imported, because neither can be
 * invented and a zero-dollar cost row is noise.
 */
export function mapPurchase(
  purchase: QuickBooksPurchase,
  ctx: MappingContext
): MappedExpense | Unmatched {
  const amount = money(purchase.TotalAmt);
  const date = purchase.TxnDate;

  if (!date) {
    return unmatched(purchase.Id, 'purchase', 'No transaction date', amount, null,
      purchase.EntityRef?.name ?? null, purchase);
  }
  if (amount === 0) {
    return unmatched(purchase.Id, 'purchase', 'Zero amount', amount, date,
      purchase.EntityRef?.name ?? null, purchase);
  }

  const project = resolveProject(purchase, ctx);
  const costCode = resolveCostCode(purchase, ctx);

  const billable = (purchase.Line ?? []).some((l) =>
    l.AccountBasedExpenseLineDetail?.BillableStatus === 'Billable' ||
    l.ItemBasedExpenseLineDetail?.BillableStatus === 'Billable');

  return {
    kind: 'expense',
    qbId: purchase.Id,
    projectMatch: project.match,
    costCodeMatch: costCode.match,
    row: {
      company_id: ctx.companyId,
      project_id: project.id,
      cost_code_id: costCode.id,
      vendor_name: purchase.EntityRef?.name || 'Unknown vendor',
      amount,
      expense_date: date,
      description: purchase.PrivateNote
        || purchase.Line?.[0]?.Description
        || `QuickBooks purchase ${purchase.Id}`,
      payment_method: purchase.PaymentType || 'other',
      is_billable: billable,
    },
  };
}

/**
 * A QuickBooks payment against a Brikly invoice.
 *
 * Unlike an expense, a payment with no invoice is NOT imported. A payment row
 * whose invoice_id is wrong marks the wrong invoice paid, and an accounts-
 * receivable list that says a customer has paid when they have not is worse
 * than one missing a row. Those go to the queue.
 *
 * The linked transaction is authoritative; the invoice number in the memo is a
 * fallback for payments recorded by hand in QuickBooks.
 */
export function mapPayment(
  payment: QuickBooksPayment,
  ctx: MappingContext
): MappedPayment | Unmatched {
  const amount = money(payment.TotalAmt);
  const date = payment.TxnDate;
  const who = payment.CustomerRef?.name ?? null;

  if (!date) {
    return unmatched(payment.Id, 'payment', 'No transaction date', amount, null, who, payment);
  }
  if (amount <= 0) {
    return unmatched(payment.Id, 'payment', 'Zero or negative amount', amount, date, who, payment);
  }

  // 1. The invoice QuickBooks says this pays.
  for (const line of payment.Line ?? []) {
    for (const txn of line.LinkedTxn ?? []) {
      if (txn.TxnType !== 'Invoice' || !txn.TxnId) continue;
      const invoice = ctx.invoicesByQbId.get(txn.TxnId);
      if (invoice) return paymentRow(payment, ctx, invoice.id, amount, date, 'exact');
    }
  }

  // 2. An invoice number written in the reference or the memo.
  const candidates = [payment.PaymentRefNum, payment.PrivateNote]
    .filter((v): v is string => Boolean(v));
  for (const text of candidates) {
    const invoice = ctx.invoicesByNumber.get(text.trim());
    if (invoice) return paymentRow(payment, ctx, invoice.id, amount, date, 'exact');
  }

  return unmatched(
    payment.Id, 'payment',
    'No linked invoice, and no invoice number in the reference or memo',
    amount, date, who, payment
  );
}

function paymentRow(
  payment: QuickBooksPayment,
  ctx: MappingContext,
  invoiceId: string,
  amount: number,
  date: string,
  match: MatchConfidence
): MappedPayment {
  return {
    kind: 'payment',
    qbId: payment.Id,
    invoiceMatch: match,
    row: {
      company_id: ctx.companyId,
      invoice_id: invoiceId,
      payment_amount: amount,
      payment_date: date,
      payment_method: payment.PaymentMethodRef?.name || 'quickbooks',
      reference_number: payment.PaymentRefNum ?? null,
      notes: payment.PrivateNote ?? null,
    },
  };
}

function unmatched(
  qbId: string,
  entity: 'purchase' | 'payment',
  reason: string,
  amount: number,
  occurredOn: string | null,
  counterparty: string | null,
  raw: unknown
): Unmatched {
  return { kind: 'unmatched', qbId, entity, reason, amount, occurredOn, counterparty, raw };
}

/** A run's outcome, for the sync dashboard. */
export interface MappingSummary {
  imported: number;
  needsReview: number;
  withoutProject: number;
  withoutCostCode: number;
}

export function summarise(
  results: Array<MappedExpense | MappedPayment | Unmatched>
): MappingSummary {
  return {
    imported: results.filter((r) => r.kind !== 'unmatched').length,
    needsReview: results.filter((r) => r.kind === 'unmatched').length,
    withoutProject: results.filter(
      (r) => r.kind === 'expense' && r.projectMatch === 'none').length,
    withoutCostCode: results.filter(
      (r) => r.kind === 'expense' && r.costCodeMatch === 'none').length,
  };
}
