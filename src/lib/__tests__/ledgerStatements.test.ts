/**
 * US-334, second pass: the trial balance, cash flow statement and general
 * ledger read the posted ledger, and contra accounts are signed by type.
 *
 * Rows are built from balanced journal entries so every scenario is one the
 * database could actually hold.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  accountRegister,
  balanceSheet,
  cashFlowStatement,
  dayBefore,
  openingBalance,
  signedAmount,
  trialBalanceAsAt,
  type AccountType,
  type LedgerActivityRow,
} from '../ledgerReporting';

interface Account {
  id: string;
  number: string;
  type: AccountType;
  subtype: string;
  normal: 'debit' | 'credit';
}

const A: Record<string, Account> = {
  bank: { id: 'bank', number: '1010', type: 'asset', subtype: 'bank', normal: 'debit' },
  ar: { id: 'ar', number: '1100', type: 'asset', subtype: 'accounts_receivable', normal: 'debit' },
  truck: { id: 'truck', number: '1600', type: 'asset', subtype: 'fixed_asset', normal: 'debit' },
  accDep: { id: 'accDep', number: '1610', type: 'asset', subtype: 'accumulated_depreciation', normal: 'credit' },
  ap: { id: 'ap', number: '2000', type: 'liability', subtype: 'accounts_payable', normal: 'credit' },
  loan: { id: 'loan', number: '2800', type: 'liability', subtype: 'long_term_liability', normal: 'credit' },
  capital: { id: 'capital', number: '3000', type: 'equity', subtype: 'equity', normal: 'credit' },
  draw: { id: 'draw', number: '3100', type: 'equity', subtype: 'owners_draw', normal: 'debit' },
  revenue: { id: 'revenue', number: '4000', type: 'revenue', subtype: 'service_revenue', normal: 'credit' },
  materials: { id: 'materials', number: '5100', type: 'cost_of_goods_sold', subtype: 'direct_materials', normal: 'debit' },
  depExp: { id: 'depExp', number: '6900', type: 'expense', subtype: 'operating_expense', normal: 'debit' },
};

/** One balanced entry as the view's rows: debit `dr`, credit `cr`. */
function entry(date: string, dr: Account, cr: Account, amount: number): LedgerActivityRow[] {
  const row = (a: Account, debits: number, credits: number): LedgerActivityRow => ({
    account_id: a.id,
    account_number: a.number,
    account_name: a.id,
    account_type: a.type,
    account_subtype: a.subtype,
    normal_balance: a.normal,
    entry_date: date,
    debits,
    credits,
    net_change: a.normal === 'debit' ? debits - credits : credits - debits,
  });
  return [row(dr, amount, 0), row(cr, 0, amount)];
}

// A year and a quarter of trading.
const ledger: LedgerActivityRow[] = [
  ...entry('2025-01-02', A.bank, A.capital, 50000),       // owner puts in 50k
  ...entry('2025-06-01', A.ar, A.revenue, 30000),         // 2025 revenue
  ...entry('2025-07-01', A.materials, A.ap, 10000),       // 2025 costs, 20k profit
  ...entry('2025-08-01', A.bank, A.ar, 30000),
  ...entry('2026-01-10', A.truck, A.loan, 40000),         // truck on a loan
  ...entry('2026-02-01', A.ar, A.revenue, 25000),
  ...entry('2026-02-15', A.materials, A.ap, 8000),
  ...entry('2026-03-01', A.bank, A.ar, 15000),            // 10k still owed by customers
  ...entry('2026-03-05', A.ap, A.bank, 12000),            // pays 12k of 18k payables
  ...entry('2026-03-20', A.draw, A.bank, 3000),           // owner draws 3k
  ...entry('2026-03-31', A.depExp, A.accDep, 2000),       // depreciation
];

describe('contra accounts are signed by type', () => {
  it('reduces assets by accumulated depreciation instead of adding it', () => {
    const [, credit] = entry('2026-03-31', A.depExp, A.accDep, 2000);
    expect(signedAmount(credit)).toBe(-2000);
  });

  it('works from net_change and normal_balance when debits and credits are absent', () => {
    expect(signedAmount({
      account_id: 'x', account_number: '1610', account_name: 'x', account_type: 'asset',
      account_subtype: 'accumulated_depreciation', normal_balance: 'credit',
      entry_date: '2026-03-31', net_change: 2000,
    })).toBe(-2000);
  });

  it('keeps the balance sheet balanced with depreciation and a draw on it', () => {
    const bs = balanceSheet(ledger, '2026-03-31', '2026-01-01');
    // Bank 50k+30k+15k-12k-3k = 80k, AR 10k, truck 40k less 2k depreciation.
    expect(bs.assets).toBe(128000);
    expect(bs.isBalanced).toBe(true);
  });

  it('counts profit from before the fiscal year, which no closing entry moved', () => {
    const bs = balanceSheet(ledger, '2026-03-31', '2026-01-01');
    expect(bs.priorYearsEarnings).toBe(20000);
    expect(bs.currentYearEarnings).toBe(15000);
    expect(bs.difference).toBe(0);
  });
});

describe('the trial balance as at a date', () => {
  const tb = trialBalanceAsAt(ledger, '2026-03-31', '2026-01-01');

  it('balances', () => {
    expect(tb.isBalanced).toBe(true);
    expect(tb.totalDebits).toBe(tb.totalCredits);
  });

  it('shows income accounts for the fiscal year only, and earlier profit as retained earnings', () => {
    expect(tb.rows.find((r) => r.account_id === 'revenue')?.credit).toBe(25000);
    expect(tb.rows.find((r) => r.account_id === 'prior-years-earnings')?.credit).toBe(20000);
  });

  it('puts the contra accounts on their own side', () => {
    expect(tb.rows.find((r) => r.account_id === 'accDep')?.credit).toBe(2000);
    expect(tb.rows.find((r) => r.account_id === 'draw')?.debit).toBe(3000);
  });

  it('ignores what was posted after the as-at date', () => {
    const later = [...ledger, ...entry('2026-04-02', A.bank, A.revenue, 999)];
    expect(trialBalanceAsAt(later, '2026-03-31', '2026-01-01')).toEqual(tb);
  });
});

describe('the cash flow statement', () => {
  const cf = cashFlowStatement(ledger, '2026-01-01', '2026-03-31');

  it('starts from net income and adds back non-cash items', () => {
    expect(cf.netIncome).toBe(15000);
    expect(cf.operating.find((l) => l.account_id === 'accDep')).toMatchObject({ amount: 2000 });
    expect(cf.operating.find((l) => l.account_id === 'accDep')?.label).toMatch(/^Depreciation/);
  });

  it('turns working-capital changes into cash', () => {
    // AR rose 10k (cash tied up), AP fell 4k (cash spent).
    expect(cf.operating.find((l) => l.account_id === 'ar')?.amount).toBe(-10000);
    expect(cf.operating.find((l) => l.account_id === 'ap')?.amount).toBe(-4000);
    expect(cf.operatingTotal).toBe(3000);
  });

  it('classifies the truck as investing and the loan and draw as financing', () => {
    expect(cf.investing).toEqual([{ label: 'truck', amount: -40000, account_id: 'truck' }]);
    expect(cf.financingTotal).toBe(37000);
  });

  it('reconciles to the change in the bank account', () => {
    expect(cf.beginningCash).toBe(80000);
    expect(cf.endingCash).toBe(80000);
    expect(cf.netChange).toBe(0);
    expect(cf.reconciles).toBe(true);
  });

  it('flags a one-sided entry instead of hiding it', () => {
    const broken = [...ledger, entry('2026-02-02', A.bank, A.revenue, 500)[0]];
    const out = cashFlowStatement(broken, '2026-01-01', '2026-03-31');
    expect(out.reconciles).toBe(false);
    expect(out.difference).toBe(-500);
  });
});

describe('the general ledger register', () => {
  it('brings the balance forward from before the period', () => {
    expect(openingBalance(ledger, 'bank', '2026-01-01')).toBe(80000);
    expect(openingBalance(ledger, 'bank', '2025-01-01')).toBe(0);
  });

  it('runs the balance from the brought-forward figure, in date order', () => {
    const reg = accountRegister([
      { id: '2', entry_date: '2026-03-05', entry_number: 'B', description: null, line_description: null, reference_type: 'bill_payment', debit: 0, credit: 12000 },
      { id: '1', entry_date: '2026-03-01', entry_number: 'A', description: null, line_description: null, reference_type: 'invoice_payment', debit: 15000, credit: 0 },
    ], 'asset', 80000);
    expect(reg.lines.map((l) => l.runningBalance)).toEqual([95000, 83000]);
    expect(reg.closingBalance).toBe(83000);
    expect(reg.totalDebits).toBe(15000);
    expect(reg.totalCredits).toBe(12000);
  });

  it('runs a credit-side account the right way up', () => {
    const reg = accountRegister([
      { id: '1', entry_date: '2026-02-01', entry_number: 'A', description: null, line_description: null, reference_type: 'invoice', debit: 0, credit: 25000 },
    ], 'revenue', 0);
    expect(reg.closingBalance).toBe(25000);
  });
});

describe('dates', () => {
  it('steps back across month and year ends', () => {
    expect(dayBefore('2026-03-01')).toBe('2026-02-28');
    expect(dayBefore('2026-01-01')).toBe('2025-12-31');
  });
});

describe('the pages read the ledger, not current_balance (US-334)', () => {
  const strip = (path: string) =>
    readFileSync(path, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .split('\n')
      .filter((l) => !l.trim().startsWith('//'))
      .join('\n');

  for (const page of ['src/pages/TrialBalance.tsx', 'src/pages/CashFlowStatement.tsx', 'src/pages/GeneralLedger.tsx']) {
    it(`${page} no longer reads current_balance and uses the ledger hooks`, () => {
      const src = strip(page);
      expect(src).not.toMatch(/current_balance/);
      expect(src).toMatch(/useLedger(Activity|Lines)/);
    });
  }

  it('the cash flow statement has no hardcoded zero placeholders left', () => {
    const src = strip('src/pages/CashFlowStatement.tsx');
    expect(src).not.toMatch(/= 0; \/\/ /);
    expect(src).toMatch(/cashFlowStatement\(/);
  });

  it('the general ledger no longer filters an embed without !inner', () => {
    expect(strip('src/pages/GeneralLedger.tsx')).not.toMatch(/journal_entry\.entry_date/);
    expect(readFileSync('src/hooks/useAccounting.ts', 'utf8')).toMatch(/journal_entries!inner\(/);
  });

  it('reads every page of ledger activity rather than the first 1000 rows', () => {
    const hooks = readFileSync('src/hooks/useAccounting.ts', 'utf8');
    const fn = hooks.slice(hooks.indexOf('export function useLedgerActivity'));
    expect(fn.slice(0, 1200)).toMatch(/readAllPages/);
    expect(fn.slice(0, 1200)).toMatch(/\.range\(from, to\)/);
  });
});
