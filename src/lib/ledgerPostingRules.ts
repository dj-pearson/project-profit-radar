/**
 * The general-ledger posting rules, as pure functions (US-334).
 *
 * The rules that actually post live in the database
 * (supabase/migrations/20260924180000_ledger_posting_all_sources.sql), in
 * triggers, because an invoice is created from five code paths and a rule in
 * one of them is a rule the other four do not follow. This module is the same
 * rules written so they can be read and unit-tested without a database, and it
 * is what the UI uses to say what posts where. The SQL is the authority; the
 * real-Postgres test (supabase/tests/rls/ledger_posting.test.sql) checks the
 * same figures the tests of this module check, so a change to one that is not
 * made to the other fails one of the two suites.
 *
 * A line's amount is signed: a debit is positive, a credit negative. An entry
 * balances when its lines sum to zero.
 */

export type PostingRole =
  | 'receivable'
  | 'retainage_receivable'
  | 'bank'
  | 'credit_card'
  | 'payable'
  | 'sales_tax_payable'
  | 'accrued_wages'
  | 'revenue'
  | 'direct_labor'
  | 'direct_materials'
  | 'subcontractors'
  | 'equipment_costs'
  | 'other_cogs'
  | 'overhead_expense';

/** The account a company uses for a role, or null when its chart has none. */
export type ResolveAccount = (role: PostingRole) => string | null;

export interface PostingLine {
  account: string | null;
  amount: number;
  projectId?: string | null;
  costCodeId?: string | null;
}

export interface NormalizedLine {
  account: string | null;
  amount: number;
  projectId: string | null;
  costCodeId: string | null;
}

/**
 * - `post`: these lines belong in the ledger.
 * - `nothing`: the document should have no entry (a draft, a void, a rejected
 *   expense). Anything already posted for it is reversed.
 * - `skip`: it cannot be posted (an account is missing, a bill has no lines).
 *   Whatever is already posted is left alone.
 */
export type PostingResult =
  | { status: 'post'; lines: NormalizedLine[] }
  | { status: 'nothing' }
  | { status: 'skip'; reason: string };

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

/** Net lines sharing an account, project and cost code; drop zeros; sort. */
export function normalizeLines(lines: PostingLine[]): NormalizedLine[] {
  const byKey = new Map<string, NormalizedLine>();
  for (const line of lines) {
    const projectId = line.projectId ?? null;
    const costCodeId = line.costCodeId ?? null;
    const key = `${line.account}|${projectId}|${costCodeId}`;
    const existing = byKey.get(key);
    if (existing) existing.amount = round2(existing.amount + round2(line.amount));
    else byKey.set(key, { account: line.account, amount: round2(line.amount), projectId, costCodeId });
  }
  const key = (l: NormalizedLine) => `${l.account ?? ''}|${l.projectId ?? ''}|${l.costCodeId ?? ''}`;
  return [...byKey.values()]
    .filter((l) => l.amount !== 0)
    .sort((a, b) => key(a).localeCompare(key(b)));
}

export const totalOf = (lines: { amount: number }[]) => round2(lines.reduce((s, l) => s + l.amount, 0));

export const isBalanced = (lines: { amount: number }[]) => totalOf(lines) === 0;

export const debitsOf = (lines: { amount: number }[]) =>
  round2(lines.reduce((s, l) => s + Math.max(l.amount, 0), 0));

export const creditsOf = (lines: { amount: number }[]) =>
  round2(lines.reduce((s, l) => s + Math.max(-l.amount, 0), 0));

/** What ledger_sync does with raw lines before writing them. */
function finish(lines: PostingLine[]): PostingResult {
  const normalized = normalizeLines(lines);
  if (normalized.some((l) => l.account == null)) {
    return { status: 'skip', reason: 'The chart of accounts has no account for one of the lines.' };
  }
  if (!isBalanced(normalized)) {
    return { status: 'skip', reason: 'The lines do not balance.' };
  }
  return normalized.length === 0 ? { status: 'nothing' } : { status: 'post', lines: normalized };
}

const NOT_ISSUED = ['draft', 'cancelled', 'canceled', 'void', 'voided'];

export interface InvoiceSource {
  status: string | null;
  invoice_type?: string | null;
  total_amount: number | null;
  tax_amount?: number | null;
  retention_amount?: number | null;
  project_id?: string | null;
}

/**
 * Invoice: receivable against revenue. Tax collected is a liability, not
 * income. Retainage withheld is revenue already earned, sitting in its own
 * receivable, so revenue is the gross (total + retainage - tax). A retainage
 * release moves the withheld amount into receivable and books no revenue.
 */
export function invoiceLines(inv: InvoiceSource, resolve: ResolveAccount): PostingResult {
  if (NOT_ISSUED.includes((inv.status ?? 'draft').toLowerCase())) return { status: 'nothing' };

  const total = round2(inv.total_amount ?? 0);
  const tax = round2(inv.tax_amount ?? 0);
  const retention = round2(inv.retention_amount ?? 0);
  const projectId = inv.project_id ?? null;
  const ar = resolve('receivable');
  const retainage = resolve('retainage_receivable') ?? ar;

  if (inv.invoice_type === 'retention_release') {
    return finish([
      { account: ar, amount: total, projectId },
      { account: retainage, amount: -total, projectId },
    ]);
  }

  return finish([
    { account: ar, amount: total, projectId },
    { account: retainage, amount: retention, projectId },
    { account: resolve('sales_tax_payable'), amount: -tax, projectId },
    { account: resolve('revenue'), amount: -round2(total + retention - tax), projectId },
  ]);
}

export interface InvoicePaymentSource {
  payment_amount: number | null;
  project_id?: string | null;
}

/** Customer payment: cash in, receivable down. */
export function invoicePaymentLines(pay: InvoicePaymentSource, resolve: ResolveAccount): PostingResult {
  const amount = round2(pay.payment_amount ?? 0);
  const projectId = pay.project_id ?? null;
  return finish([
    { account: resolve('bank'), amount, projectId },
    { account: resolve('receivable'), amount: -amount, projectId },
  ]);
}

/** The job-cost account an expense or cost-code category points at. */
export function jobCostRole(category: string | null | undefined): PostingRole {
  const c = category ?? '';
  if (/subcontract/i.test(c)) return 'subcontractors';
  if (/labou?r/i.test(c)) return 'direct_labor';
  if (/(equip|rental|fuel)/i.test(c)) return 'equipment_costs';
  if (/(permit|fee|dump|disposal|utilit)/i.test(c)) return 'other_cogs';
  return 'direct_materials';
}

const REJECTED = ['rejected', 'void', 'voided', 'cancelled', 'canceled', 'declined'];

export interface ExpenseSource {
  amount: number | null;
  project_id?: string | null;
  cost_code_id?: string | null;
  payment_method?: string | null;
  payment_status?: string | null;
  /** The expense category's name, else the cost code's category. */
  category?: string | null;
}

/**
 * Expense: a job cost by category (materials when uncategorised, as US-322
 * costs it) or overhead, against the bank or, for a card, the card liability.
 */
export function expenseLines(ex: ExpenseSource, resolve: ResolveAccount): PostingResult {
  if (REJECTED.includes((ex.payment_status ?? '').toLowerCase())) return { status: 'nothing' };

  const amount = round2(ex.amount ?? 0);
  const projectId = ex.project_id ?? null;
  const costCodeId = ex.cost_code_id ?? null;
  const debit = projectId
    ? resolve(jobCostRole(ex.category)) ?? resolve('direct_materials') ?? resolve('other_cogs')
    : resolve('overhead_expense');
  const method = (ex.payment_method ?? '').toLowerCase();
  const credit = method === 'credit_card' || method === 'card' ? resolve('credit_card') : resolve('bank');

  return finish([
    { account: debit, amount, projectId, costCodeId },
    { account: credit, amount: -amount, projectId, costCodeId },
  ]);
}

export interface BillSource {
  status: string | null;
  project_id?: string | null;
  ap_account_id?: string | null;
  lines: Array<{
    expense_account_id: string | null;
    amount: number | null;
    tax_amount?: number | null;
    project_id?: string | null;
    cost_code_id?: string | null;
  }>;
}

/**
 * Bill: each line to the expense account it names, tax with its line, the
 * total to payables. A bill with no lines names no account, so it is skipped
 * rather than guessed at.
 */
export function billLines(bill: BillSource, resolve: ResolveAccount): PostingResult {
  if (['draft', 'void'].includes((bill.status ?? 'open').toLowerCase())) return { status: 'nothing' };
  if (bill.lines.length === 0) return { status: 'skip', reason: 'The bill has no lines.' };

  const debits: PostingLine[] = bill.lines.map((l) => ({
    account: l.expense_account_id,
    amount: round2((l.amount ?? 0) + (l.tax_amount ?? 0)),
    projectId: l.project_id ?? bill.project_id ?? null,
    costCodeId: l.cost_code_id ?? null,
  }));
  return finish([
    ...debits,
    { account: bill.ap_account_id ?? resolve('payable'), amount: -totalOf(debits), projectId: bill.project_id ?? null },
  ]);
}

export interface BillPaymentSource {
  total_amount: number | null;
  payment_method?: string | null;
  bank_account_id?: string | null;
  applications: Array<{ amount_applied: number | null; bill_ap_account_id?: string | null }>;
}

/**
 * Bill payment: each applied bill clears the payable it was booked to, any
 * unapplied remainder is a vendor credit in the default payables account, and
 * the whole amount leaves the bank (or goes on the card).
 */
export function billPaymentLines(pay: BillPaymentSource, resolve: ResolveAccount): PostingResult {
  const total = round2(pay.total_amount ?? 0);
  const ap = resolve('payable');
  const cash = pay.bank_account_id
    ?? ((pay.payment_method ?? '').toLowerCase() === 'credit_card' ? resolve('credit_card') : resolve('bank'));
  const applied: PostingLine[] = pay.applications.map((a) => ({
    account: a.bill_ap_account_id ?? ap,
    amount: round2(a.amount_applied ?? 0),
  }));
  return finish([
    ...applied,
    { account: ap, amount: round2(total - totalOf(applied)) },
    { account: cash, amount: -total },
  ]);
}

export interface TimeEntrySource {
  approval_status: string | null;
  labor_cost: number | null;
  project_id?: string | null;
  cost_code_id?: string | null;
}

/**
 * Approved labour: direct labour on the job against accrued wages, at the
 * burdened cost frozen at approval (US-321). The payroll run clears accrued
 * wages; Brikly does not run payroll, so that side is recorded by hand.
 */
export function timeEntryLines(te: TimeEntrySource, resolve: ResolveAccount): PostingResult {
  if (te.approval_status !== 'approved' || !(Number(te.labor_cost) > 0)) return { status: 'nothing' };
  const cost = round2(te.labor_cost ?? 0);
  const projectId = te.project_id ?? null;
  return finish([
    { account: resolve('direct_labor'), amount: cost, projectId, costCodeId: te.cost_code_id ?? null },
    { account: resolve('accrued_wages'), amount: -cost, projectId },
  ]);
}

export interface Reconciliation {
  /** Lines of the reversing entry to post, or null. */
  reversal: NormalizedLine[] | null;
  /** Lines of the new entry to post, or null. */
  posting: NormalizedLine[] | null;
}

/**
 * What ledger_sync writes, given what is posted for a document and what the
 * rule says it should be: nothing when they agree (which is what makes a
 * re-save or a second backfill harmless), else a reversal of what is there
 * and a new entry for what should be. It never edits or deletes an entry.
 */
export function reconcile(current: PostingLine[], desired: PostingResult): Reconciliation {
  if (desired.status === 'skip') return { reversal: null, posting: null };
  const now = normalizeLines(current);
  const want = desired.status === 'post' ? desired.lines : [];
  if (JSON.stringify(now) === JSON.stringify(want)) return { reversal: null, posting: null };
  return {
    reversal: now.length > 0 ? now.map((l) => ({ ...l, amount: -l.amount })) : null,
    posting: want.length > 0 ? want : null,
  };
}

/** The reference_type each rule posts under, as the ledger pages label it. */
export const SOURCE_LABELS: Record<string, string> = {
  invoice: 'Invoice',
  invoice_payment: 'Customer payment',
  expense: 'Expense',
  bill: 'Bill',
  bill_payment: 'Bill payment',
  time_entry: 'Approved labor',
};

export function sourceLabel(referenceType: string | null | undefined): string {
  if (!referenceType) return 'Journal entry';
  return SOURCE_LABELS[referenceType] ?? referenceType.replace(/_/g, ' ');
}

/** What posts where, in words, for the settings panel. */
export const POSTING_RULES: Array<{ source: string; debit: string; credit: string }> = [
  { source: 'Invoice (sent)', debit: 'Accounts receivable, retainage receivable', credit: 'Revenue, sales tax payable' },
  { source: 'Retainage release', debit: 'Accounts receivable', credit: 'Retainage receivable' },
  { source: 'Customer payment', debit: 'Operating account', credit: 'Accounts receivable' },
  { source: 'Expense', debit: 'Job cost by category, or overhead', credit: 'Operating account, or credit card' },
  { source: 'Bill', debit: 'Each line\'s expense account', credit: 'Accounts payable' },
  { source: 'Bill payment', debit: 'Accounts payable', credit: 'Operating account, or credit card' },
  { source: 'Approved time', debit: 'Direct labor', credit: 'Accrued wages' },
];
