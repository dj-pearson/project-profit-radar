/**
 * US-334: statements from the ledger, for a period.
 *
 * The pages summed chart_of_accounts.current_balance - a running total with no
 * date on it - and their date-range inputs were never used in a query, so a P&L
 * for March and one for last year returned the same numbers. BalanceSheet set
 * currentYearEarnings = 0 with the comment "Placeholder", so it was wrong by
 * exactly the year's profit and never balanced. And both took Math.abs of every
 * balance, so a credit note made a total go up.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  totalsByAccount, withinPeriod, profitAndLoss, balanceSheet, trialBalance,
  fiscalYearStartFor, type LedgerActivityRow, type AccountType,
} from '../ledgerReporting';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((l) => !l.trim().startsWith('//') && !l.trim().startsWith('--'))
    .join('\n');

let n = 0;
const row = (
  type: AccountType,
  net: number,
  date: string,
  account = `acct-${type}`
): LedgerActivityRow => ({
  account_id: account,
  account_number: `${1000 + (n++ % 9)}`,
  account_name: account,
  account_type: type,
  normal_balance: ['asset', 'cost_of_goods_sold', 'expense', 'other_expense'].includes(type)
    ? 'debit' : 'credit',
  entry_date: date,
  net_change: net,
});

describe('a period actually filters (US-334)', () => {
  it('includes both ends of the range', () => {
    expect(withinPeriod('2026-03-01', '2026-03-01', '2026-03-31')).toBe(true);
    expect(withinPeriod('2026-03-31', '2026-03-01', '2026-03-31')).toBe(true);
    expect(withinPeriod('2026-02-28', '2026-03-01', '2026-03-31')).toBe(false);
    expect(withinPeriod('2026-04-01', '2026-03-01', '2026-03-31')).toBe(false);
  });

  it('leaves out what happened before and after', () => {
    const rows = [
      row('revenue', 1000, '2026-02-15'),
      row('revenue', 5000, '2026-03-10'),
      row('revenue', 900, '2026-04-02'),
    ];
    expect(profitAndLoss(rows, '2026-03-01', '2026-03-31').revenue).toBe(5000);
  });

  it('sums several days on one account', () => {
    const rows = [
      row('revenue', 1000, '2026-03-01', 'a'),
      row('revenue', 2500, '2026-03-09', 'a'),
    ];
    const totals = totalsByAccount(rows, '2026-03-01', '2026-03-31');
    expect(totals).toHaveLength(1);
    expect(totals[0].amount).toBe(3500);
  });

  it('does not take the absolute value of a balance', () => {
    // A credit note is negative revenue. Math.abs made a refunded month look
    // like its best. Two SEPARATE accounts, because netting within one account
    // hides the bug: abs(10000 - 2000) is the right answer by accident.
    const rows = [
      row('revenue', 10000, '2026-03-05', 'sales'),
      row('revenue', -2000, '2026-03-20', 'refunds'),
    ];
    const pl = profitAndLoss(rows, '2026-03-01', '2026-03-31');
    expect(pl.revenue).toBe(8000);
    expect(pl.accounts.find((a) => a.account_id === 'refunds')?.amount).toBe(-2000);
  });
});

describe('the profit and loss (US-334)', () => {
  const rows = [
    row('revenue', 100000, '2026-03-05'),
    row('cost_of_goods_sold', 62000, '2026-03-06'),
    row('expense', 18000, '2026-03-07'),
    row('other_income', 500, '2026-03-08'),
    row('other_expense', 1500, '2026-03-09'),
  ];

  it('works down to net income', () => {
    const pl = profitAndLoss(rows, '2026-03-01', '2026-03-31');
    expect(pl.revenue).toBe(100000);
    expect(pl.grossProfit).toBe(38000);
    expect(pl.operatingIncome).toBe(20000);
    expect(pl.netIncome).toBe(19000);
  });

  it('computes margins against revenue', () => {
    const pl = profitAndLoss(rows, '2026-03-01', '2026-03-31');
    expect(pl.grossMargin).toBe(38);
    expect(pl.netMargin).toBe(19);
  });

  it('reports zero margins rather than NaN when there is no revenue', () => {
    // A month with costs and no revenue is a real month and must render.
    const pl = profitAndLoss([row('expense', 4000, '2026-03-07')], '2026-03-01', '2026-03-31');
    expect(pl.revenue).toBe(0);
    expect(pl.netIncome).toBe(-4000);
    expect(pl.grossMargin).toBe(0);
    expect(Number.isFinite(pl.netMargin)).toBe(true);
  });

  it('subtracts other expense rather than adding it', () => {
    const pl = profitAndLoss([
      row('revenue', 1000, '2026-03-01'),
      row('other_expense', 100, '2026-03-02'),
    ], '2026-03-01', '2026-03-31');
    expect(pl.netIncome).toBe(900);
  });
});

describe('the balance sheet (US-334)', () => {
  // A year of trading: 100k revenue, 60k costs, so 40k of profit sitting in
  // assets that no equity account holds yet.
  const rows = [
    row('asset', 140000, '2026-03-31', 'cash'),
    row('liability', 30000, '2026-03-31', 'ap'),
    row('equity', 70000, '2026-01-15', 'capital'),
    row('revenue', 100000, '2026-02-10'),
    row('cost_of_goods_sold', 60000, '2026-02-20'),
  ];

  it('balances once the year earnings are counted', () => {
    // This is the whole defect: currentYearEarnings was hardcoded 0, so the
    // sheet was out by exactly the year's profit, every time.
    const bs = balanceSheet(rows, '2026-03-31', '2026-01-01');
    expect(bs.currentYearEarnings).toBe(40000);
    expect(bs.assets).toBe(140000);
    expect(bs.liabilitiesAndEquity).toBe(140000);
    expect(bs.isBalanced).toBe(true);
    expect(bs.difference).toBe(0);
  });

  it('does not balance, and says so, when it genuinely does not', () => {
    const bs = balanceSheet([
      row('asset', 100, '2026-03-31', 'cash'),
      row('liability', 10, '2026-03-31', 'ap'),
    ], '2026-03-31', '2026-01-01');
    expect(bs.isBalanced).toBe(false);
    expect(bs.difference).toBe(90);
  });

  it('is cumulative to the as-at date, not for a period', () => {
    // Balance-sheet accounts carry forward. Taking only the period would show
    // a company with no opening cash every January.
    const bs = balanceSheet([
      row('asset', 50000, '2024-06-01', 'cash'),
      row('asset', 10000, '2026-03-01', 'cash'),
      row('equity', 60000, '2024-06-01', 'capital'),
    ], '2026-03-31', '2026-01-01');
    expect(bs.assets).toBe(60000);
  });

  it('excludes activity after the as-at date', () => {
    const bs = balanceSheet([
      row('asset', 100, '2026-03-31', 'cash'),
      row('asset', 999, '2026-04-01', 'cash'),
    ], '2026-03-31', '2026-01-01');
    expect(bs.assets).toBe(100);
  });
});

describe('the trial balance (US-334)', () => {
  it('agrees, debits to credits', () => {
    const tb = trialBalance([
      row('asset', 140000, '2026-03-31', 'cash'),
      row('expense', 20000, '2026-03-31', 'opex'),
      row('liability', 30000, '2026-03-31', 'ap'),
      row('revenue', 130000, '2026-03-31', 'sales'),
    ], '2026-01-01', '2026-03-31');
    expect(tb.totalDebits).toBe(160000);
    expect(tb.totalCredits).toBe(160000);
    expect(tb.isBalanced).toBe(true);
  });

  it('puts a contra account on the side that keeps the totals agreeing', () => {
    // An asset with a negative balance (accumulated depreciation) belongs in
    // the credit column, not the debit column with a minus sign.
    const tb = trialBalance([
      row('asset', 1000, '2026-03-31', 'cash'),
      row('asset', -300, '2026-03-31', 'accum-dep'),
      row('equity', 700, '2026-03-31', 'capital'),
    ], '2026-01-01', '2026-03-31');
    expect(tb.rows.find((r) => r.account_id === 'accum-dep')?.credit).toBe(300);
    expect(tb.totalDebits).toBe(1000);
    expect(tb.totalCredits).toBe(1000);
  });

  it('leaves out accounts with no movement', () => {
    const tb = trialBalance([row('asset', 0, '2026-03-31', 'dormant')], '2026-01-01', '2026-03-31');
    expect(tb.rows).toHaveLength(0);
  });
});

describe('fiscal year (US-334)', () => {
  it('defaults to the calendar year', () => {
    expect(fiscalYearStartFor('2026-03-31')).toBe('2026-01-01');
  });

  it('handles a year that starts mid-calendar', () => {
    // A July fiscal year: March 2026 falls in the year that began July 2025.
    expect(fiscalYearStartFor('2026-03-31', 7)).toBe('2025-07-01');
    expect(fiscalYearStartFor('2026-08-15', 7)).toBe('2026-07-01');
  });
});

describe('the migration (US-334)', () => {
  const raw = readFileSync('supabase/migrations/20260903250000_ledger_posting.sql', 'utf8');
  const sql = strip('supabase/migrations/20260903250000_ledger_posting.sql');

  it('is additive: no drops, no tightening', () => {
    expect(sql).not.toMatch(/DROP TABLE/);
    expect(sql).not.toMatch(/DROP COLUMN/);
    expect(sql).not.toMatch(/ALTER COLUMN[^;]*SET NOT NULL/);
  });

  it('is off by default, because most contractors keep books in QuickBooks', () => {
    // Silently posting into a ledger somebody reconciles elsewhere corrupts it.
    expect(sql).toMatch(/auto_post_to_ledger BOOLEAN NOT NULL DEFAULT false/);
    expect(sql).toMatch(/ledger_posting_enabled/);
  });

  it('cannot double-post', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.post_ledger_entry'));
    expect(fn).toMatch(/reference_type = p_reference_type[\s\S]{0,80}reference_id = p_reference_id/);
    expect(fn).toMatch(/IF v_entry_id IS NOT NULL THEN\s*\n\s*RETURN v_entry_id;/);
  });

  it('skips rather than guesses when an account is missing', () => {
    // A misposted transaction is harder to find than a missing one.
    const fn = sql.slice(sql.indexOf('FUNCTION public.post_ledger_entry'));
    expect(fn).toMatch(/IF p_debit_account IS NULL OR p_credit_account IS NULL THEN/);
    expect(fn).toMatch(/RAISE NOTICE/);
  });

  it('writes both sides of every entry', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.post_ledger_entry'));
    // Two VALUES rows: one debit, one credit, same amount.
    expect(fn).toMatch(/p_debit_account, 1, v_amount, 0/);
    expect(fn).toMatch(/p_credit_account, 2, 0, v_amount/);
  });

  it('does not post a draft invoice', () => {
    const fn = sql.slice(sql.indexOf('FUNCTION public.post_invoice_to_ledger'));
    expect(fn).toMatch(/IF COALESCE\(NEW\.status, 'draft'\) = 'draft' THEN RETURN NEW/);
  });

  it('names only real account subtypes', () => {
    // 'income' and 'cost_of_goods_sold' are not subtypes - the first draft used
    // both, and an invalid enum literal fails the whole migration at apply time.
    const enumBlock = readFileSync(
      'supabase/migrations/20250707000000_enterprise_finance_module.sql', 'utf8'
    ).slice(1700, 3400);
    const declared = new Set([...enumBlock.matchAll(/'([a-z_]+)'/g)].map((m) => m[1]));
    const used = [...raw.matchAll(/ledger_account\([^,]+, '([a-z_]+)'\)/g)].map((m) => m[1]);
    expect(used.length).toBeGreaterThan(0);
    expect(used.filter((u) => !declared.has(u)), 'invalid account_subtype literals').toEqual([]);
  });

  it('has a backfill that can be re-run', () => {
    expect(sql).toMatch(/FUNCTION public\.backfill_ledger/);
    // It goes through post_ledger_entry, which is what makes it idempotent.
    const fn = sql.slice(sql.indexOf('FUNCTION public.backfill_ledger'));
    expect(fn).toMatch(/public\.post_ledger_entry\(/);
    expect(fn).toMatch(/RAISE EXCEPTION 'Not your company'/);
  });

  it('exposes period-scoped activity for the statements to read', () => {
    expect(sql).toMatch(/CREATE OR REPLACE VIEW public\.ledger_account_activity/);
    expect(sql).toMatch(/WHERE e\.transaction_status = 'posted'/);
  });
});

describe('the statement pages read the ledger (US-334)', () => {
  for (const [page, name] of [
    ['src/pages/ProfitAndLoss.tsx', 'profit and loss'],
    ['src/pages/BalanceSheet.tsx', 'balance sheet'],
  ] as const) {
    it(`the ${name} no longer sums an undated running total`, () => {
      const src = strip(page);
      expect(src).not.toMatch(/account\.current_balance/);
      expect(src).toMatch(/useLedgerActivity/);
    });

    it(`the ${name} says so when Brikly is not keeping the books`, () => {
      // Otherwise a company whose books are in QuickBooks sees an empty
      // statement and reads it as "we earned nothing".
      const src = strip(page);
      expect(src).toMatch(/postingEnabled === false/);
      expect(src).toMatch(/your books are in\s*\n?\s*QuickBooks/);
    });
  }

  it('the balance sheet no longer hardcodes the year earnings', () => {
    const src = strip('src/pages/BalanceSheet.tsx');
    expect(src).not.toMatch(/currentYearEarnings = 0/);
    expect(src).toMatch(/currentYearEarnings = sheet\.currentYearEarnings/);
  });

  it('the profit and loss passes its own date inputs to the calculation', () => {
    // They existed and were never used in a query, which is the defect.
    const src = strip('src/pages/ProfitAndLoss.tsx');
    expect(src).toMatch(/profitAndLoss\(\s*\n?\s*\(activity[\s\S]{0,80}startDate,\s*\n?\s*endDate/);
  });
});
