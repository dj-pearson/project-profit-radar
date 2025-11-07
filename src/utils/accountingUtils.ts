/**
 * Accounting Utilities for Enterprise Finance Module
 *
 * Provides utilities for:
 * - Double-entry bookkeeping validation
 * - Financial calculations
 * - Account type helpers
 * - Period management
 * - Financial reporting calculations
 */

// =====================================================
// TYPE DEFINITIONS
// =====================================================

export type AccountType =
  | 'asset'
  | 'liability'
  | 'equity'
  | 'revenue'
  | 'cost_of_goods_sold'
  | 'expense'
  | 'other_income'
  | 'other_expense';

export type NormalBalance = 'debit' | 'credit';

export type TransactionStatus = 'draft' | 'pending' | 'posted' | 'voided' | 'reversed';

export interface JournalEntryLine {
  accountId: string;
  accountName?: string;
  accountNumber?: string;
  debitAmount: number;
  creditAmount: number;
  description?: string;
  projectId?: string;
  costCodeId?: string;
}

export interface JournalEntry {
  id?: string;
  entryNumber?: string;
  entryDate: Date | string;
  description: string;
  memo?: string;
  lines: JournalEntryLine[];
  status?: TransactionStatus;
}

// =====================================================
// ACCOUNT TYPE HELPERS
// =====================================================

/**
 * Get the normal balance for an account type
 */
export function getNormalBalance(accountType: AccountType): NormalBalance {
  switch (accountType) {
    case 'asset':
    case 'expense':
    case 'cost_of_goods_sold':
    case 'other_expense':
      return 'debit';

    case 'liability':
    case 'equity':
    case 'revenue':
    case 'other_income':
      return 'credit';

    default:
      throw new Error(`Unknown account type: ${accountType}`);
  }
}

/**
 * Check if an account type is a balance sheet account
 */
export function isBalanceSheetAccount(accountType: AccountType): boolean {
  return ['asset', 'liability', 'equity'].includes(accountType);
}

/**
 * Check if an account type is an income statement account
 */
export function isIncomeStatementAccount(accountType: AccountType): boolean {
  return [
    'revenue',
    'cost_of_goods_sold',
    'expense',
    'other_income',
    'other_expense'
  ].includes(accountType);
}

/**
 * Get account type display name
 */
export function getAccountTypeLabel(accountType: AccountType): string {
  const labels: Record<AccountType, string> = {
    asset: 'Asset',
    liability: 'Liability',
    equity: 'Equity',
    revenue: 'Revenue',
    cost_of_goods_sold: 'Cost of Goods Sold',
    expense: 'Expense',
    other_income: 'Other Income',
    other_expense: 'Other Expense',
  };
  return labels[accountType] || accountType;
}

// =====================================================
// DOUBLE-ENTRY VALIDATION
// =====================================================

/**
 * Validate that debits equal credits in a journal entry
 */
export function validateJournalEntryBalance(lines: JournalEntryLine[]): {
  isBalanced: boolean;
  totalDebits: number;
  totalCredits: number;
  difference: number;
} {
  const totalDebits = lines.reduce((sum, line) => sum + (line.debitAmount || 0), 0);
  const totalCredits = lines.reduce((sum, line) => sum + (line.creditAmount || 0), 0);
  const difference = Math.abs(totalDebits - totalCredits);

  // Allow for small rounding differences (2 cents)
  const isBalanced = difference < 0.02;

  return {
    isBalanced,
    totalDebits: roundToTwoDecimals(totalDebits),
    totalCredits: roundToTwoDecimals(totalCredits),
    difference: roundToTwoDecimals(difference),
  };
}

/**
 * Validate individual journal entry line
 */
export function validateJournalEntryLine(line: JournalEntryLine): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!line.accountId) {
    errors.push('Account is required');
  }

  if (!line.debitAmount && !line.creditAmount) {
    errors.push('Either debit or credit amount is required');
  }

  if (line.debitAmount && line.creditAmount) {
    errors.push('Cannot have both debit and credit on the same line');
  }

  if (line.debitAmount && line.debitAmount < 0) {
    errors.push('Debit amount cannot be negative');
  }

  if (line.creditAmount && line.creditAmount < 0) {
    errors.push('Credit amount cannot be negative');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Validate complete journal entry
 */
export function validateJournalEntry(entry: JournalEntry): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!entry.entryDate) {
    errors.push('Entry date is required');
  }

  if (!entry.description || entry.description.trim() === '') {
    errors.push('Description is required');
  }

  if (!entry.lines || entry.lines.length === 0) {
    errors.push('At least one journal entry line is required');
  }

  if (entry.lines && entry.lines.length < 2) {
    warnings.push('Most journal entries have at least 2 lines (debit and credit)');
  }

  // Validate each line
  entry.lines?.forEach((line, index) => {
    const lineValidation = validateJournalEntryLine(line);
    if (!lineValidation.isValid) {
      errors.push(`Line ${index + 1}: ${lineValidation.errors.join(', ')}`);
    }
  });

  // Validate balance
  if (entry.lines && entry.lines.length > 0) {
    const balanceValidation = validateJournalEntryBalance(entry.lines);
    if (!balanceValidation.isBalanced) {
      errors.push(
        `Entry is not balanced. Debits: $${balanceValidation.totalDebits.toFixed(2)}, ` +
        `Credits: $${balanceValidation.totalCredits.toFixed(2)}, ` +
        `Difference: $${balanceValidation.difference.toFixed(2)}`
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

// =====================================================
// ACCOUNT BALANCE CALCULATIONS
// =====================================================

/**
 * Calculate the effect of a transaction on an account balance
 * Based on normal balance (debit or credit)
 */
export function calculateBalanceChange(
  accountType: AccountType,
  debitAmount: number,
  creditAmount: number
): number {
  const normalBalance = getNormalBalance(accountType);

  if (normalBalance === 'debit') {
    // For debit normal balance accounts: debits increase, credits decrease
    return debitAmount - creditAmount;
  } else {
    // For credit normal balance accounts: credits increase, debits decrease
    return creditAmount - debitAmount;
  }
}

/**
 * Calculate account balance after applying transactions
 */
export function calculateAccountBalance(
  beginningBalance: number,
  accountType: AccountType,
  transactions: Array<{ debitAmount: number; creditAmount: number }>
): number {
  let balance = beginningBalance;

  transactions.forEach(tx => {
    balance += calculateBalanceChange(accountType, tx.debitAmount, tx.creditAmount);
  });

  return roundToTwoDecimals(balance);
}

// =====================================================
// FINANCIAL STATEMENT CALCULATIONS
// =====================================================

/**
 * Calculate net income from revenue and expenses
 */
export function calculateNetIncome(
  revenue: number,
  costOfGoodsSold: number,
  expenses: number,
  otherIncome: number = 0,
  otherExpense: number = 0
): {
  grossProfit: number;
  operatingIncome: number;
  netIncome: number;
  grossMarginPercent: number;
  netMarginPercent: number;
} {
  const grossProfit = revenue - costOfGoodsSold;
  const operatingIncome = grossProfit - expenses;
  const netIncome = operatingIncome + otherIncome - otherExpense;

  const grossMarginPercent = revenue > 0 ? (grossProfit / revenue) * 100 : 0;
  const netMarginPercent = revenue > 0 ? (netIncome / revenue) * 100 : 0;

  return {
    grossProfit: roundToTwoDecimals(grossProfit),
    operatingIncome: roundToTwoDecimals(operatingIncome),
    netIncome: roundToTwoDecimals(netIncome),
    grossMarginPercent: roundToTwoDecimals(grossMarginPercent),
    netMarginPercent: roundToTwoDecimals(netMarginPercent),
  };
}

/**
 * Calculate working capital
 */
export function calculateWorkingCapital(
  currentAssets: number,
  currentLiabilities: number
): {
  workingCapital: number;
  currentRatio: number;
  quickRatio: number;
} {
  const workingCapital = currentAssets - currentLiabilities;
  const currentRatio = currentLiabilities > 0 ? currentAssets / currentLiabilities : 0;

  // Quick ratio = (Current Assets - Inventory) / Current Liabilities
  // Simplified version without inventory calculation
  const quickRatio = currentRatio;

  return {
    workingCapital: roundToTwoDecimals(workingCapital),
    currentRatio: roundToTwoDecimals(currentRatio),
    quickRatio: roundToTwoDecimals(quickRatio),
  };
}

/**
 * Calculate balance sheet equation: Assets = Liabilities + Equity
 */
export function validateBalanceSheet(
  totalAssets: number,
  totalLiabilities: number,
  totalEquity: number
): {
  isBalanced: boolean;
  difference: number;
  leftSide: number;
  rightSide: number;
} {
  const leftSide = totalAssets;
  const rightSide = totalLiabilities + totalEquity;
  const difference = Math.abs(leftSide - rightSide);

  // Allow for small rounding differences
  const isBalanced = difference < 0.02;

  return {
    isBalanced,
    difference: roundToTwoDecimals(difference),
    leftSide: roundToTwoDecimals(leftSide),
    rightSide: roundToTwoDecimals(rightSide),
  };
}

// =====================================================
// PERIOD MANAGEMENT
// =====================================================

/**
 * Check if a date falls within a fiscal period
 */
export function isDateInPeriod(
  date: Date | string,
  periodStart: Date | string,
  periodEnd: Date | string
): boolean {
  const checkDate = new Date(date);
  const start = new Date(periodStart);
  const end = new Date(periodEnd);

  return checkDate >= start && checkDate <= end;
}

/**
 * Generate fiscal periods for a year (monthly)
 */
export function generateMonthlyPeriods(
  fiscalYearStart: Date,
  fiscalYearEnd: Date
): Array<{
  periodNumber: number;
  periodName: string;
  startDate: Date;
  endDate: Date;
}> {
  const periods = [];
  let currentDate = new Date(fiscalYearStart);
  let periodNumber = 1;

  while (currentDate < fiscalYearEnd) {
    const monthStart = new Date(currentDate);
    const monthEnd = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      0
    );

    // Don't exceed fiscal year end
    if (monthEnd > fiscalYearEnd) {
      monthEnd.setTime(fiscalYearEnd.getTime());
    }

    const monthName = monthStart.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
    });

    periods.push({
      periodNumber,
      periodName: monthName,
      startDate: monthStart,
      endDate: monthEnd,
    });

    // Move to next month
    currentDate = new Date(
      currentDate.getFullYear(),
      currentDate.getMonth() + 1,
      1
    );
    periodNumber++;
  }

  return periods;
}

// =====================================================
// ACCOUNT AGING
// =====================================================

export interface AgingBucket {
  label: string;
  minDays: number;
  maxDays: number | null;
  amount: number;
}

/**
 * Calculate aging buckets for receivables or payables
 */
export function calculateAging(
  items: Array<{ dueDate: Date | string; amountDue: number }>,
  asOfDate: Date = new Date()
): {
  current: number;
  days1to30: number;
  days31to60: number;
  days61to90: number;
  over90: number;
  total: number;
  buckets: AgingBucket[];
} {
  let current = 0;
  let days1to30 = 0;
  let days31to60 = 0;
  let days61to90 = 0;
  let over90 = 0;

  items.forEach(item => {
    const dueDate = new Date(item.dueDate);
    const daysOverdue = Math.floor(
      (asOfDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysOverdue < 0) {
      current += item.amountDue;
    } else if (daysOverdue <= 30) {
      days1to30 += item.amountDue;
    } else if (daysOverdue <= 60) {
      days31to60 += item.amountDue;
    } else if (daysOverdue <= 90) {
      days61to90 += item.amountDue;
    } else {
      over90 += item.amountDue;
    }
  });

  const total = current + days1to30 + days31to60 + days61to90 + over90;

  return {
    current: roundToTwoDecimals(current),
    days1to30: roundToTwoDecimals(days1to30),
    days31to60: roundToTwoDecimals(days31to60),
    days61to90: roundToTwoDecimals(days61to90),
    over90: roundToTwoDecimals(over90),
    total: roundToTwoDecimals(total),
    buckets: [
      { label: 'Current', minDays: 0, maxDays: 0, amount: roundToTwoDecimals(current) },
      { label: '1-30 Days', minDays: 1, maxDays: 30, amount: roundToTwoDecimals(days1to30) },
      { label: '31-60 Days', minDays: 31, maxDays: 60, amount: roundToTwoDecimals(days31to60) },
      { label: '61-90 Days', minDays: 61, maxDays: 90, amount: roundToTwoDecimals(days61to90) },
      { label: 'Over 90 Days', minDays: 91, maxDays: null, amount: roundToTwoDecimals(over90) },
    ],
  };
}

// =====================================================
// FORMATTING UTILITIES
// =====================================================

/**
 * Format currency amount
 */
export function formatCurrency(
  amount: number,
  options: {
    showCents?: boolean;
    showParensForNegative?: boolean;
    currencySymbol?: string;
  } = {}
): string {
  const {
    showCents = true,
    showParensForNegative = true,
    currencySymbol = '$',
  } = options;

  const absAmount = Math.abs(amount);
  const isNegative = amount < 0;

  const formatted = absAmount.toLocaleString('en-US', {
    minimumFractionDigits: showCents ? 2 : 0,
    maximumFractionDigits: showCents ? 2 : 0,
  });

  let result = `${currencySymbol}${formatted}`;

  if (isNegative) {
    result = showParensForNegative ? `(${result})` : `-${result}`;
  }

  return result;
}

/**
 * Format percentage
 */
export function formatPercentage(
  value: number,
  decimals: number = 1
): string {
  return `${value.toFixed(decimals)}%`;
}

/**
 * Format account number with leading zeros
 */
export function formatAccountNumber(
  accountNumber: string | number,
  length: number = 4
): string {
  return String(accountNumber).padStart(length, '0');
}

// =====================================================
// HELPER FUNCTIONS
// =====================================================

/**
 * Round number to 2 decimal places (for currency)
 */
function roundToTwoDecimals(num: number): number {
  return Math.round((num + Number.EPSILON) * 100) / 100;
}

/**
 * Generate a unique reference number
 */
export function generateReferenceNumber(
  prefix: string,
  sequenceNumber: number,
  length: number = 6
): string {
  const paddedNumber = String(sequenceNumber).padStart(length, '0');
  return `${prefix}-${paddedNumber}`;
}

/**
 * Parse reference number to extract sequence
 */
export function parseReferenceNumber(referenceNumber: string): {
  prefix: string;
  sequenceNumber: number;
} | null {
  const parts = referenceNumber.split('-');
  if (parts.length !== 2) return null;

  return {
    prefix: parts[0],
    sequenceNumber: parseInt(parts[1], 10),
  };
}

// =====================================================
// EXPORT ALL
// =====================================================

export default {
  getNormalBalance,
  isBalanceSheetAccount,
  isIncomeStatementAccount,
  getAccountTypeLabel,
  validateJournalEntryBalance,
  validateJournalEntryLine,
  validateJournalEntry,
  calculateBalanceChange,
  calculateAccountBalance,
  calculateNetIncome,
  calculateWorkingCapital,
  validateBalanceSheet,
  isDateInPeriod,
  generateMonthlyPeriods,
  calculateAging,
  formatCurrency,
  formatPercentage,
  formatAccountNumber,
  generateReferenceNumber,
  parseReferenceNumber,
};
