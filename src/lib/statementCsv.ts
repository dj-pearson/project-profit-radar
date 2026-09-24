/**
 * US-371: CSV builders for the five financial statement pages.
 *
 * Each builder takes the figures the page already has in memory and returns a
 * CSV string, so the page's Export button is a pure transform plus
 * `downloadCsv`. Amounts are written as plain numbers (two decimals, no
 * currency symbol) so the file opens as numbers in a spreadsheet.
 */
import { toCsv, type CsvColumn } from '@/lib/exportCsv';
import type { AccountTotal, BalanceSheet, ProfitAndLoss } from '@/lib/ledgerReporting';

const money = (n: number | null | undefined): string =>
  n === null || n === undefined || Number.isNaN(Number(n)) ? '' : Number(n).toFixed(2);

const TYPE_LABELS: Record<string, string> = {
  asset: 'Assets',
  liability: 'Liabilities',
  equity: 'Equity',
  revenue: 'Revenue',
  cost_of_goods_sold: 'Cost of Goods Sold',
  expense: 'Operating Expenses',
  other_income: 'Other Income',
  other_expense: 'Other Expenses',
};

/** One line of a statement: an account, or a total/label row with no account. */
export interface StatementLine {
  section: string;
  account_number: string;
  account_name: string;
  amount: number | null;
}

const STATEMENT_COLUMNS: CsvColumn<StatementLine>[] = [
  { header: 'Section', value: (r) => r.section },
  { header: 'Account Number', value: (r) => r.account_number },
  { header: 'Account', value: (r) => r.account_name },
  { header: 'Amount', value: (r) => money(r.amount) },
];

function accountLines(accounts: AccountTotal[], type: string): StatementLine[] {
  return accounts
    .filter((a) => a.account_type === type)
    .map((a) => ({
      section: TYPE_LABELS[type] ?? type,
      account_number: a.account_number,
      account_name: a.account_name,
      amount: a.amount,
    }));
}

const total = (section: string, label: string, amount: number): StatementLine => ({
  section,
  account_number: '',
  account_name: label,
  amount,
});

/** `balance-sheet_2026-09-23.csv` style names. */
export function statementFilename(stem: string, ...dates: string[]): string {
  return `${[stem, ...dates.filter(Boolean)].join('_')}.csv`;
}

export function balanceSheetCsv(sheet: BalanceSheet): string {
  const lines: StatementLine[] = [
    ...accountLines(sheet.accounts, 'asset'),
    total('Assets', 'Total Assets', sheet.assets),
    ...accountLines(sheet.accounts, 'liability'),
    total('Liabilities', 'Total Liabilities', sheet.liabilities),
    ...accountLines(sheet.accounts, 'equity'),
    total('Equity', "Retained Earnings - Prior Years' Profit", sheet.priorYearsEarnings),
    total('Equity', 'Current Year Earnings', sheet.currentYearEarnings),
    total('Equity', 'Total Equity', sheet.equity + sheet.priorYearsEarnings + sheet.currentYearEarnings),
    total('Summary', 'Total Liabilities and Equity', sheet.liabilitiesAndEquity),
    total('Summary', 'Difference', sheet.difference),
  ];
  return toCsv(lines, STATEMENT_COLUMNS);
}

export function profitAndLossCsv(statement: ProfitAndLoss): string {
  const lines: StatementLine[] = [
    ...accountLines(statement.accounts, 'revenue'),
    total('Revenue', 'Total Revenue', statement.revenue),
    ...accountLines(statement.accounts, 'cost_of_goods_sold'),
    total('Cost of Goods Sold', 'Total Cost of Goods Sold', statement.costOfGoodsSold),
    total('Summary', 'Gross Profit', statement.grossProfit),
    ...accountLines(statement.accounts, 'expense'),
    total('Operating Expenses', 'Total Operating Expenses', statement.operatingExpenses),
    total('Summary', 'Operating Income', statement.operatingIncome),
    ...accountLines(statement.accounts, 'other_income'),
    total('Other Income', 'Total Other Income', statement.otherIncome),
    ...accountLines(statement.accounts, 'other_expense'),
    total('Other Expenses', 'Total Other Expenses', statement.otherExpense),
    total('Summary', 'Net Income', statement.netIncome),
  ];
  return toCsv(lines, STATEMENT_COLUMNS);
}

export interface CashFlowItem {
  label: string;
  amount: number | null;
  isHeader?: boolean;
}

export interface CashFlowSectionData {
  title: string;
  items: CashFlowItem[];
  totalLabel: string;
  total: number;
}

export function cashFlowCsv(
  sections: CashFlowSectionData[],
  summary: Array<{ label: string; amount: number }>
): string {
  const lines: StatementLine[] = [];
  for (const s of sections) {
    for (const item of s.items) {
      if (item.isHeader) continue;
      lines.push({ section: s.title, account_number: '', account_name: item.label, amount: item.amount });
    }
    lines.push(total(s.title, s.totalLabel, s.total));
  }
  for (const row of summary) lines.push(total('Summary', row.label, row.amount));
  return toCsv(lines, STATEMENT_COLUMNS);
}

export interface LedgerCsvRow {
  entry_date: string;
  entry_number: string;
  description: string;
  debit: number;
  credit: number;
  runningBalance: number;
}

export function generalLedgerCsv(rows: LedgerCsvRow[]): string {
  return toCsv(rows, [
    { header: 'Date', value: (r) => r.entry_date },
    { header: 'Entry Number', value: (r) => r.entry_number },
    { header: 'Description', value: (r) => r.description },
    { header: 'Debit', value: (r) => money(r.debit) },
    { header: 'Credit', value: (r) => money(r.credit) },
    { header: 'Balance', value: (r) => money(r.runningBalance) },
  ]);
}

export interface TrialBalanceCsvRow {
  account_number: string;
  account_name: string;
  account_type: string;
  account_subtype: string | null;
  debit: number | null;
  credit: number | null;
}

export function trialBalanceCsv(
  rows: TrialBalanceCsvRow[],
  totals: { debits: number; credits: number }
): string {
  const all: TrialBalanceCsvRow[] = [
    ...rows,
    {
      account_number: '',
      account_name: 'Total',
      account_type: '',
      account_subtype: '',
      debit: totals.debits,
      credit: totals.credits,
    },
  ];
  return toCsv(all, [
    { header: 'Account Number', value: (r) => r.account_number },
    { header: 'Account', value: (r) => r.account_name },
    { header: 'Type', value: (r) => TYPE_LABELS[r.account_type] ?? r.account_type },
    { header: 'Subtype', value: (r) => (r.account_subtype ?? '').replace(/_/g, ' ') },
    { header: 'Debit', value: (r) => money(r.debit) },
    { header: 'Credit', value: (r) => money(r.credit) },
  ]);
}
