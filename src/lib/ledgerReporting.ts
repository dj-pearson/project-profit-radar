/**
 * Financial statements from the ledger, for a period (US-334).
 *
 * ProfitAndLoss.tsx and BalanceSheet.tsx summed
 * chart_of_accounts.current_balance - a running total with no date on it - and
 * their date-range inputs were never used in any query. So "P&L for March" and
 * "P&L for last year" returned the same numbers, and BalanceSheet set
 * currentYearEarnings = 0 with the comment "Placeholder", which is why the
 * sheet never balanced.
 *
 * Posting rules live in the database (20260903250000), because an invoice is
 * created from five different code paths and a rule in one of them is a rule
 * the other four do not follow. What lives here is the reading: how posted
 * lines become a statement. Pure, so it can be tested without a database.
 */

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'cost_of_goods_sold'
  | 'expense'
  | 'other_income'
  | 'other_expense';

/** One row of public.ledger_account_activity. */
export interface LedgerActivityRow {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: AccountType;
  /** The finer classification the statements group their subsections by. */
  account_subtype: string | null;
  normal_balance: string | null;
  entry_date: string;
  net_change: number;
  /**
   * Raw debits and credits for the day. When present they decide the sign,
   * because net_change is signed by the account's own normal_balance and a
   * contra account (accumulated depreciation, owner's draw, an allowance) has
   * the opposite normal balance from its type.
   */
  debits?: number | null;
  credits?: number | null;
}

export interface AccountTotal {
  account_id: string;
  account_number: string;
  account_name: string;
  account_type: AccountType;
  account_subtype: string | null;
  amount: number;
}

const round2 = (n: number) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const DEBIT_TYPES: AccountType[] = ['asset', 'cost_of_goods_sold', 'expense', 'other_expense'];

/** True for account types whose balance is naturally a debit. */
export const isDebitType = (type: AccountType): boolean => DEBIT_TYPES.includes(type);

/**
 * A day's movement signed the way the account's TYPE reads: positive grows an
 * asset or an expense, positive grows a liability, equity or revenue.
 *
 * Summing net_change as-is added accumulated depreciation to assets and owner's
 * draws to equity, because both are contra accounts whose normal_balance is the
 * opposite of their type. A balance sheet built that way overstated assets by
 * the depreciation twice over.
 */
export function signedAmount(row: LedgerActivityRow): number {
  const debitSide = isDebitType(row.account_type);
  if (row.debits != null || row.credits != null) {
    const d = Number(row.debits || 0);
    const c = Number(row.credits || 0);
    return round2(debitSide ? d - c : c - d);
  }
  const net = Number(row.net_change || 0);
  if (!row.normal_balance) return round2(net);
  const normalIsDebit = row.normal_balance === 'debit';
  return round2(normalIsDebit === debitSide ? net : -net);
}

/** The day before an ISO date, as an ISO date. */
export function dayBefore(date: string): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/** Inclusive of both ends: a statement "to 31 March" includes 31 March. */
export function withinPeriod(date: string, from: string, to: string): boolean {
  return date >= from && date <= to;
}

/**
 * Roll daily movement up to one figure per account.
 *
 * Signed, not absolute. The old code took Math.abs of every balance, so a
 * contra account or a credit note made the total go UP, and a refunded month
 * looked like its best.
 */
export function totalsByAccount(
  rows: LedgerActivityRow[],
  from: string,
  to: string
): AccountTotal[] {
  const byAccount = new Map<string, AccountTotal>();

  for (const row of rows) {
    if (!withinPeriod(row.entry_date, from, to)) continue;
    const existing = byAccount.get(row.account_id);
    if (existing) {
      existing.amount = round2(existing.amount + signedAmount(row));
    } else {
      byAccount.set(row.account_id, {
        account_id: row.account_id,
        account_number: row.account_number,
        account_name: row.account_name,
        account_type: row.account_type,
        account_subtype: row.account_subtype ?? null,
        amount: signedAmount(row),
      });
    }
  }

  return [...byAccount.values()].sort((a, b) =>
    a.account_number.localeCompare(b.account_number));
}

/**
 * Is this account one of the named subtypes?
 *
 * account_subtype is nullable - an account created without one is real, it
 * just belongs to no subsection - so the statements need a guard rather than
 * passing a possible null to Array.includes.
 */
export const hasSubtype = (
  account: { account_subtype: string | null },
  ...subtypes: string[]
): boolean => account.account_subtype != null && subtypes.includes(account.account_subtype);

const sumOf = (totals: AccountTotal[], ...types: AccountType[]) =>
  round2(totals
    .filter((t) => types.includes(t.account_type))
    .reduce((sum, t) => sum + t.amount, 0));

export interface ProfitAndLoss {
  revenue: number;
  costOfGoodsSold: number;
  grossProfit: number;
  grossMargin: number;
  operatingExpenses: number;
  operatingIncome: number;
  otherIncome: number;
  otherExpense: number;
  netIncome: number;
  netMargin: number;
  accounts: AccountTotal[];
}

/**
 * A profit and loss for the period.
 *
 * Margins are zero when there is no revenue, rather than NaN or Infinity. A
 * month with costs and no revenue is a real month, and it should render.
 */
export function profitAndLoss(
  rows: LedgerActivityRow[],
  from: string,
  to: string
): ProfitAndLoss {
  const accounts = totalsByAccount(rows, from, to);

  const revenue = sumOf(accounts, 'revenue');
  const costOfGoodsSold = sumOf(accounts, 'cost_of_goods_sold');
  const grossProfit = round2(revenue - costOfGoodsSold);
  const operatingExpenses = sumOf(accounts, 'expense');
  const operatingIncome = round2(grossProfit - operatingExpenses);
  const otherIncome = sumOf(accounts, 'other_income');
  const otherExpense = sumOf(accounts, 'other_expense');
  const netIncome = round2(operatingIncome + otherIncome - otherExpense);

  return {
    revenue,
    costOfGoodsSold,
    grossProfit,
    grossMargin: revenue === 0 ? 0 : round2((grossProfit / revenue) * 100),
    operatingExpenses,
    operatingIncome,
    otherIncome,
    otherExpense,
    netIncome,
    netMargin: revenue === 0 ? 0 : round2((netIncome / revenue) * 100),
    accounts,
  };
}

export interface BalanceSheet {
  assets: number;
  liabilities: number;
  equity: number;
  /** Profit for the year to the as-at date. The old page hardcoded 0. */
  currentYearEarnings: number;
  /**
   * Profit of every year before the fiscal year. Brikly posts no year-end
   * closing entry, so it sits in the income accounts rather than in retained
   * earnings, and without it a ledger older than a year never balances.
   */
  priorYearsEarnings: number;
  liabilitiesAndEquity: number;
  isBalanced: boolean;
  /** Assets less liabilities and equity. Zero when the books balance. */
  difference: number;
  accounts: AccountTotal[];
}

/**
 * A balance sheet as at a date.
 *
 * Balance-sheet accounts are cumulative from the beginning of the ledger, not
 * for a period - that is what makes them balance-sheet accounts - so this takes
 * everything up to the as-at date. Retained earnings for the year come from the
 * P&L over the fiscal year, which is the piece the page was missing: without
 * it, assets never equal liabilities plus equity and the sheet was wrong by
 * exactly the year's profit.
 */
export function balanceSheet(
  rows: LedgerActivityRow[],
  asAt: string,
  fiscalYearStart: string
): BalanceSheet {
  const BEGINNING = '0001-01-01';
  const accounts = totalsByAccount(rows, BEGINNING, asAt);

  const assets = sumOf(accounts, 'asset');
  const liabilities = sumOf(accounts, 'liability');
  const equity = sumOf(accounts, 'equity');
  const currentYearEarnings = profitAndLoss(rows, fiscalYearStart, asAt).netIncome;
  const priorYearsEarnings = profitAndLoss(rows, BEGINNING, dayBefore(fiscalYearStart)).netIncome;

  const liabilitiesAndEquity = round2(liabilities + equity + priorYearsEarnings + currentYearEarnings);
  const difference = round2(assets - liabilitiesAndEquity);

  return {
    assets,
    liabilities,
    equity,
    currentYearEarnings,
    priorYearsEarnings,
    liabilitiesAndEquity,
    // A cent of tolerance, because rounding each account separately can leave
    // one; anything larger is a real imbalance and should be shown as one.
    isBalanced: Math.abs(difference) < 0.01,
    difference,
    accounts,
  };
}

export interface TrialBalanceRow extends AccountTotal {
  debit: number;
  credit: number;
}

/**
 * A trial balance: every account with a balance, debits against credits.
 *
 * Which column an account lands in follows its type, not the sign of a
 * per-account normal_balance lookup, so a contra account with a negative
 * balance shows on the side that makes the totals agree.
 */
export interface TrialBalanceResult {
  rows: TrialBalanceRow[];
  totalDebits: number;
  totalCredits: number;
  isBalanced: boolean;
}

function toTrialBalance(totals: AccountTotal[]): TrialBalanceResult {
  const out = totals
    .filter((a) => a.amount !== 0)
    .map((a) => {
      const naturallyDebit = isDebitType(a.account_type);
      const onNaturalSide = a.amount >= 0;
      const magnitude = Math.abs(a.amount);
      const isDebit = naturallyDebit === onNaturalSide;
      return { ...a, debit: isDebit ? magnitude : 0, credit: isDebit ? 0 : magnitude };
    });

  const totalDebits = round2(out.reduce((s, r) => s + r.debit, 0));
  const totalCredits = round2(out.reduce((s, r) => s + r.credit, 0));

  return {
    rows: out,
    totalDebits,
    totalCredits,
    isBalanced: Math.abs(round2(totalDebits - totalCredits)) < 0.01,
  };
}

export function trialBalance(rows: LedgerActivityRow[], from: string, to: string): TrialBalanceResult {
  return toTrialBalance(totalsByAccount(rows, from, to));
}

const BALANCE_SHEET_TYPES: AccountType[] = ['asset', 'liability', 'equity'];

/** Synthetic account id for profit from years before the fiscal year. */
export const PRIOR_YEARS_EARNINGS_ID = 'prior-years-earnings';

/**
 * A trial balance as at a date, the way an accountant reads one: balance-sheet
 * accounts from the start of the ledger, income and expense accounts for the
 * fiscal year to date, and the profit of earlier years in one retained-earnings
 * line (Brikly posts no year-end closing entry, so without that line the
 * income accounts would carry every year since the ledger began).
 */
export function trialBalanceAsAt(
  rows: LedgerActivityRow[],
  asAt: string,
  fiscalYearStart: string
): TrialBalanceResult {
  const BEGINNING = '0001-01-01';
  const balanceSheetAccounts = totalsByAccount(rows, BEGINNING, asAt)
    .filter((a) => BALANCE_SHEET_TYPES.includes(a.account_type));
  const incomeAccounts = totalsByAccount(rows, fiscalYearStart, asAt)
    .filter((a) => !BALANCE_SHEET_TYPES.includes(a.account_type));
  const priorEarnings = fiscalYearStart > BEGINNING
    ? profitAndLoss(rows, BEGINNING, dayBefore(fiscalYearStart)).netIncome
    : 0;

  const totals = [...balanceSheetAccounts, ...incomeAccounts];
  if (priorEarnings !== 0) {
    totals.push({
      account_id: PRIOR_YEARS_EARNINGS_ID,
      account_number: '',
      account_name: "Retained earnings - prior years' profit",
      account_type: 'equity',
      account_subtype: 'retained_earnings',
      amount: priorEarnings,
    });
  }
  return toTrialBalance(totals);
}

export interface CashFlowLine {
  label: string;
  amount: number;
  account_id?: string;
}

export interface CashFlowStatement {
  netIncome: number;
  operating: CashFlowLine[];
  operatingTotal: number;
  investing: CashFlowLine[];
  investingTotal: number;
  financing: CashFlowLine[];
  financingTotal: number;
  netChange: number;
  beginningCash: number;
  endingCash: number;
  /** Beginning cash plus the net change equals ending cash. */
  reconciles: boolean;
  difference: number;
}

const CASH_SUBTYPES = ['cash', 'bank'];
const INVESTING_SUBTYPES = ['fixed_asset', 'other_asset'];

/**
 * A statement of cash flows for the period, by the indirect method, from the
 * posted ledger.
 *
 * Net income, then the period's change in every non-cash balance-sheet
 * account: an asset that grew used cash, a liability or equity that grew
 * provided it. Because every entry balances, those lines add up to the change
 * in the cash and bank accounts exactly; `reconciles` checks that rather than
 * assuming it, so an unbalanced hand-keyed entry shows up here too.
 */
export function cashFlowStatement(rows: LedgerActivityRow[], from: string, to: string): CashFlowStatement {
  const BEGINNING = '0001-01-01';
  const netIncome = profitAndLoss(rows, from, to).netIncome;
  const changes = totalsByAccount(rows, from, to);

  const operating: CashFlowLine[] = [];
  const investing: CashFlowLine[] = [];
  const financing: CashFlowLine[] = [];

  for (const a of changes) {
    if (!BALANCE_SHEET_TYPES.includes(a.account_type) || a.amount === 0) continue;
    if (a.account_type === 'asset' && hasSubtype(a, ...CASH_SUBTYPES)) continue;

    const effect = round2(a.account_type === 'asset' ? -a.amount : a.amount);
    if (a.account_type === 'asset' && hasSubtype(a, ...INVESTING_SUBTYPES)) {
      investing.push({ label: a.account_name, amount: effect, account_id: a.account_id });
    } else if (a.account_type === 'equity' || hasSubtype(a, 'long_term_liability')) {
      financing.push({ label: a.account_name, amount: effect, account_id: a.account_id });
    } else if (hasSubtype(a, 'accumulated_depreciation')) {
      operating.push({ label: `Depreciation - ${a.account_name}`, amount: effect, account_id: a.account_id });
    } else {
      operating.push({ label: `Change in ${a.account_name}`, amount: effect, account_id: a.account_id });
    }
  }

  const sum = (lines: CashFlowLine[]) => round2(lines.reduce((s, l) => s + l.amount, 0));
  const operatingTotal = round2(netIncome + sum(operating));
  const investingTotal = sum(investing);
  const financingTotal = sum(financing);
  const netChange = round2(operatingTotal + investingTotal + financingTotal);

  const cashThrough = (date: string) => round2(
    totalsByAccount(rows, BEGINNING, date)
      .filter((a) => a.account_type === 'asset' && hasSubtype(a, ...CASH_SUBTYPES))
      .reduce((s, a) => s + a.amount, 0));
  const beginningCash = cashThrough(dayBefore(from));
  const endingCash = cashThrough(to);
  const difference = round2(beginningCash + netChange - endingCash);

  return {
    netIncome,
    operating,
    operatingTotal,
    investing,
    investingTotal,
    financing,
    financingTotal,
    netChange,
    beginningCash,
    endingCash,
    reconciles: Math.abs(difference) < 0.01,
    difference,
  };
}

/** One posted line on one account, as the general ledger lists it. */
export interface LedgerLine {
  id: string;
  entry_date: string;
  entry_number: string;
  description: string | null;
  line_description: string | null;
  reference_type: string | null;
  debit: number;
  credit: number;
}

export interface RegisterLine extends LedgerLine {
  runningBalance: number;
}

/**
 * An account's register for a period: the balance brought forward from before
 * the period, then each line with the balance after it. The old page started
 * every register at zero, so a bank account's "ending balance" for March was
 * only March's movement.
 */
export function accountRegister(
  lines: LedgerLine[],
  accountType: AccountType,
  openingBalance: number
): { lines: RegisterLine[]; totalDebits: number; totalCredits: number; closingBalance: number } {
  const debitSide = isDebitType(accountType);
  const sorted = [...lines].sort((a, b) =>
    a.entry_date === b.entry_date
      ? a.entry_number.localeCompare(b.entry_number)
      : a.entry_date.localeCompare(b.entry_date));

  let balance = round2(openingBalance);
  const out = sorted.map((l) => {
    balance = round2(balance + (debitSide ? l.debit - l.credit : l.credit - l.debit));
    return { ...l, runningBalance: balance };
  });

  return {
    lines: out,
    totalDebits: round2(sorted.reduce((s, l) => s + l.debit, 0)),
    totalCredits: round2(sorted.reduce((s, l) => s + l.credit, 0)),
    closingBalance: balance,
  };
}

/** An account's balance at the close of the day before `from`. */
export function openingBalance(rows: LedgerActivityRow[], accountId: string, from: string): number {
  return round2(rows
    .filter((r) => r.account_id === accountId && r.entry_date < from)
    .reduce((s, r) => s + signedAmount(r), 0));
}

/** The first day of the fiscal year containing a date. */
export function fiscalYearStartFor(asAt: string, fiscalYearStartMonth = 1): string {
  const [y, m] = asAt.split('-').map(Number);
  const year = m >= fiscalYearStartMonth ? y : y - 1;
  return `${year}-${String(fiscalYearStartMonth).padStart(2, '0')}-01`;
}
