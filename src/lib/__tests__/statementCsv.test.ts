import { describe, it, expect } from 'vitest';
import {
  balanceSheetCsv,
  cashFlowCsv,
  generalLedgerCsv,
  profitAndLossCsv,
  statementFilename,
  trialBalanceCsv,
} from '../statementCsv';
import { balanceSheet, profitAndLoss, type LedgerActivityRow } from '../ledgerReporting';

/** US-371: the Export button on each statement page used to alert('coming soon'). */

const row = (
  account_number: string,
  account_name: string,
  account_type: LedgerActivityRow['account_type'],
  net_change: number
): LedgerActivityRow => ({
  account_id: account_number,
  account_number,
  account_name,
  account_type,
  account_subtype: null,
  normal_balance: null,
  entry_date: '2026-03-15',
  net_change,
});

const activity: LedgerActivityRow[] = [
  row('1000', 'Operating Cash', 'asset', 15000),
  row('2000', 'Accounts Payable', 'liability', 4000),
  row('3000', "Owner's Equity", 'equity', 6000),
  row('4000', 'Contract Revenue, Residential', 'revenue', 12000),
  row('5000', 'Materials', 'cost_of_goods_sold', 5000),
  row('6000', 'Office Rent', 'expense', 2000),
];

const lines = (csv: string) => csv.split('\n');

describe('statementFilename', () => {
  it('joins the stem and dates', () => {
    expect(statementFilename('profit-and-loss', '2026-01-01', '2026-03-31')).toBe(
      'profit-and-loss_2026-01-01_2026-03-31.csv'
    );
    expect(statementFilename('balance-sheet', '2026-03-31')).toBe('balance-sheet_2026-03-31.csv');
  });
});

describe('profitAndLossCsv', () => {
  const csv = profitAndLossCsv(profitAndLoss(activity, '2026-01-01', '2026-12-31'));

  it('has a header and one line per account plus totals', () => {
    expect(lines(csv)[0]).toBe('Section,Account Number,Account,Amount');
    expect(csv).toContain('Revenue,4000,"Contract Revenue, Residential",12000.00');
    expect(csv).toContain('Cost of Goods Sold,5000,Materials,5000.00');
    expect(csv).toContain('Summary,,Gross Profit,7000.00');
    expect(csv).toContain('Summary,,Net Income,5000.00');
  });
});

describe('balanceSheetCsv', () => {
  const csv = balanceSheetCsv(balanceSheet(activity, '2026-12-31', '2026-01-01'));

  it('lists each section and the balancing totals', () => {
    expect(csv).toContain('Assets,1000,Operating Cash,15000.00');
    expect(csv).toContain('Assets,,Total Assets,15000.00');
    expect(csv).toContain('Equity,,Current Year Earnings,5000.00');
    expect(csv).toContain('Summary,,Total Liabilities and Equity,15000.00');
    expect(csv).toContain('Summary,,Difference,0.00');
  });

  it('leaves a name with an apostrophe unquoted', () => {
    expect(csv).toContain("Equity,3000,Owner's Equity,6000.00");
  });
});

describe('cashFlowCsv', () => {
  it('skips header rows, keeps item and total lines, appends the summary', () => {
    const csv = cashFlowCsv(
      [
        {
          title: 'Operating Activities',
          items: [
            { label: 'Net Income', amount: 100 },
            { label: 'Adjustments:', amount: null, isHeader: true },
            { label: 'Depreciation', amount: 20 },
          ],
          total: 120,
          totalLabel: 'Net Cash Provided by Operating Activities',
        },
      ],
      [{ label: 'Cash at End of Period', amount: 620 }]
    );
    expect(lines(csv)).toEqual([
      'Section,Account Number,Account,Amount',
      'Operating Activities,,Net Income,100.00',
      'Operating Activities,,Depreciation,20.00',
      'Operating Activities,,Net Cash Provided by Operating Activities,120.00',
      'Summary,,Cash at End of Period,620.00',
    ]);
  });
});

describe('generalLedgerCsv', () => {
  it('writes date, entry, description and the running balance', () => {
    const csv = generalLedgerCsv([
      { entry_date: '2026-02-01', entry_number: 'JE-1', description: 'Deposit', debit: 500, credit: 0, runningBalance: 500 },
      { entry_date: '2026-02-03', entry_number: 'JE-2', description: 'Pay "Acme"', debit: 0, credit: 200, runningBalance: 300 },
    ]);
    expect(lines(csv)).toEqual([
      'Date,Entry Number,Description,Debit,Credit,Balance',
      '2026-02-01,JE-1,Deposit,500.00,0.00,500.00',
      '2026-02-03,JE-2,"Pay ""Acme""",0.00,200.00,300.00',
    ]);
  });
});

describe('trialBalanceCsv', () => {
  it('puts each balance on one side and ends with a totals line', () => {
    const csv = trialBalanceCsv(
      [
        { account_number: '1000', account_name: 'Cash', account_type: 'asset', account_subtype: 'bank', debit: 900, credit: null },
        { account_number: '2000', account_name: 'AP', account_type: 'liability', account_subtype: 'accounts_payable', debit: null, credit: 900 },
      ],
      { debits: 900, credits: 900 }
    );
    expect(lines(csv)).toEqual([
      'Account Number,Account,Type,Subtype,Debit,Credit',
      '1000,Cash,Assets,bank,900.00,',
      '2000,AP,Liabilities,accounts payable,,900.00',
      ',Total,,,900.00,900.00',
    ]);
  });
});
