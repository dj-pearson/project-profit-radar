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
      existing.amount = round2(existing.amount + Number(row.net_change || 0));
    } else {
      byAccount.set(row.account_id, {
        account_id: row.account_id,
        account_number: row.account_number,
        account_name: row.account_name,
        account_type: row.account_type,
        account_subtype: row.account_subtype ?? null,
        amount: round2(Number(row.net_change || 0)),
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

  const liabilitiesAndEquity = round2(liabilities + equity + currentYearEarnings);
  const difference = round2(assets - liabilitiesAndEquity);

  return {
    assets,
    liabilities,
    equity,
    currentYearEarnings,
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
export function trialBalance(
  rows: LedgerActivityRow[],
  from: string,
  to: string
): { rows: TrialBalanceRow[]; totalDebits: number; totalCredits: number; isBalanced: boolean } {
  const DEBIT_TYPES: AccountType[] = ['asset', 'cost_of_goods_sold', 'expense', 'other_expense'];

  const out = totalsByAccount(rows, from, to)
    .filter((a) => a.amount !== 0)
    .map((a) => {
      const naturallyDebit = DEBIT_TYPES.includes(a.account_type);
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

/** The first day of the fiscal year containing a date. */
export function fiscalYearStartFor(asAt: string, fiscalYearStartMonth = 1): string {
  const [y, m] = asAt.split('-').map(Number);
  const year = m >= fiscalYearStartMonth ? y : y - 1;
  return `${year}-${String(fiscalYearStartMonth).padStart(2, '0')}-01`;
}
