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

export interface MapPaymentOptions {
  /**
   * Skip the "would this overpay the invoice" check. Only for a payment this
   * sync already imported: its own row is already in the invoice's balance, so
   * checking it again would always fail.
   */
  alreadyImported?: boolean;
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
    payment_status: 'paid';
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
 * QuickBooks' PaymentType as the value Brikly stores.
 *
 * Not cosmetic: the ledger posting trigger (US-334) credits the credit-card
 * account only for payment_method 'credit_card' or 'card', so QuickBooks'
 * 'CreditCard' passed through as-is posted every card purchase against the
 * bank. 'credit_card' is also the column's default.
 */
export function paymentMethodOf(paymentType: string | undefined): string {
  switch (norm(paymentType)) {
    case 'creditcard': return 'credit_card';
    case 'check': return 'check';
    case 'cash': return 'cash';
    default: return 'other';
  }
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
      payment_method: paymentMethodOf(purchase.PaymentType),
      // A QuickBooks Purchase is money already spent (cash, cheque or card);
      // an unpaid one is a Bill, which this does not import. 'pending' would
      // put every imported cost in the expense list's to-approve count.
      payment_status: 'paid',
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
 *
 * Three more ways to mark the wrong thing paid, each queued rather than
 * guessed:
 *   - One QuickBooks payment can settle several invoices, one Line each. It
 *     used to land in full on whichever invoice matched first, so a $3,000
 *     cheque covering two $1,500 invoices marked one of them paid twice over
 *     and left the other open. invoice_payments keys one row per QuickBooks
 *     payment, so a split payment is a person's call.
 *   - The amount applied to the invoice is the Line's, not TotalAmt. TotalAmt
 *     includes anything left unapplied as a credit on the customer's account.
 *   - A payment larger than what Brikly thinks is still owed. The usual cause
 *     is the same money recorded twice: the customer paid through Brikly, and
 *     the bookkeeper then received the payment in QuickBooks as well.
 */
export function mapPayment(
  payment: QuickBooksPayment,
  ctx: MappingContext,
  opts: MapPaymentOptions = {}
): MappedPayment | Unmatched {
  const total = money(payment.TotalAmt);
  const date = payment.TxnDate;
  const who = payment.CustomerRef?.name ?? null;

  if (!date) {
    return unmatched(payment.Id, 'payment', 'No transaction date', total, null, who, payment);
  }
  if (total <= 0) {
    return unmatched(payment.Id, 'payment', 'Zero or negative amount', total, date, who, payment);
  }

  // 1. The invoice(s) QuickBooks says this pays, with the amount applied to each.
  const applied = new Map<string, number>();
  for (const line of payment.Line ?? []) {
    for (const txn of line.LinkedTxn ?? []) {
      if (txn.TxnType !== 'Invoice' || !txn.TxnId) continue;
      applied.set(txn.TxnId, money((applied.get(txn.TxnId) ?? 0) + money(line.Amount)));
    }
  }

  if (applied.size > 1) {
    return unmatched(
      payment.Id, 'payment',
      `Pays ${applied.size} invoices in QuickBooks; record each part against its invoice by hand`,
      total, date, who, payment
    );
  }

  if (applied.size === 1) {
    const [[qbInvoiceId, lineAmount]] = [...applied];
    const invoice = ctx.invoicesByQbId.get(qbInvoiceId);
    if (invoice) {
      // A linked line with no Amount is malformed; fall back to the total
      // rather than importing a zero payment.
      const amount = lineAmount > 0 ? lineAmount : total;
      return checkedPaymentRow(payment, ctx, invoice, amount, date, who, opts);
    }
    // Linked to a QuickBooks invoice Brikly does not have. Fall through to the
    // memo, which is how a bookkeeper names an invoice raised outside the sync.
  }

  // 2. An invoice number written in the reference or the memo.
  const candidates = [payment.PaymentRefNum, payment.PrivateNote]
    .filter((v): v is string => Boolean(v));
  for (const text of candidates) {
    const invoice = ctx.invoicesByNumber.get(text.trim());
    if (invoice) return checkedPaymentRow(payment, ctx, invoice, total, date, who, opts);
  }

  return unmatched(
    payment.Id, 'payment',
    'No linked invoice, and no invoice number in the reference or memo',
    total, date, who, payment
  );
}

function checkedPaymentRow(
  payment: QuickBooksPayment,
  ctx: MappingContext,
  invoice: { id: string; amountDue: number },
  amount: number,
  date: string,
  who: string | null,
  opts: MapPaymentOptions
): MappedPayment | Unmatched {
  // Half a cent of slack for rounding between the two systems.
  if (!opts.alreadyImported && amount > money(invoice.amountDue) + 0.005) {
    return unmatched(
      payment.Id, 'payment',
      `Would take the invoice past its balance (${amount.toFixed(2)} paid, ` +
        `${money(invoice.amountDue).toFixed(2)} due); it may already be recorded in Brikly`,
      amount, date, who, payment
    );
  }
  return paymentRow(payment, ctx, invoice.id, amount, date, 'exact');
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

/** An expense this sync imported on an earlier run. */
export interface ImportedExpense {
  id: string
  project_id: string | null
  cost_code_id: string | null
  vendor_name: string | null
  amount: number
  expense_date: string
  description: string
  payment_method: string | null
  is_billable: boolean | null
}

/**
 * What to write to an expense imported on an earlier run.
 *
 * Only what changed, so an unchanged purchase writes nothing. Every UPDATE that
 * names amount, date, project or cost code re-fires the US-322 job-cost trigger,
 * which deletes and re-inserts the job_costs row, so writing the whole row back
 * on every run churned every imported cost.
 *
 * A project or cost code QuickBooks does not know is never written back as
 * NULL. Assigning the job in Brikly is what the review queue is for, and the
 * next sync used to undo it.
 */
export function expenseChanges(existing: ImportedExpense, mapped: MappedExpense['row']) {
  const changes: Record<string, unknown> = {}
  const same = (a: unknown, b: unknown) => String(a ?? '') === String(b ?? '')
  if (Number(existing.amount) !== mapped.amount) changes.amount = mapped.amount
  for (const k of ['vendor_name', 'expense_date', 'description', 'payment_method'] as const) {
    if (!same(existing[k], mapped[k])) changes[k] = mapped[k]
  }
  if (Boolean(existing.is_billable) !== mapped.is_billable) changes.is_billable = mapped.is_billable
  if (mapped.project_id && existing.project_id !== mapped.project_id) changes.project_id = mapped.project_id
  if (mapped.cost_code_id && existing.cost_code_id !== mapped.cost_code_id) changes.cost_code_id = mapped.cost_code_id
  return changes
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
