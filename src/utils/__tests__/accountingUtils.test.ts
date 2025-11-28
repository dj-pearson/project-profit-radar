import { describe, it, expect } from 'vitest';
import {
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
  type AccountType,
  type JournalEntryLine,
  type JournalEntry,
} from '../accountingUtils';

// =====================================================
// ACCOUNT TYPE HELPERS TESTS
// =====================================================

describe('Account Type Helpers', () => {
  describe('getNormalBalance()', () => {
    it('should return debit for asset accounts', () => {
      expect(getNormalBalance('asset')).toBe('debit');
    });

    it('should return debit for expense accounts', () => {
      expect(getNormalBalance('expense')).toBe('debit');
    });

    it('should return debit for cost_of_goods_sold accounts', () => {
      expect(getNormalBalance('cost_of_goods_sold')).toBe('debit');
    });

    it('should return debit for other_expense accounts', () => {
      expect(getNormalBalance('other_expense')).toBe('debit');
    });

    it('should return credit for liability accounts', () => {
      expect(getNormalBalance('liability')).toBe('credit');
    });

    it('should return credit for equity accounts', () => {
      expect(getNormalBalance('equity')).toBe('credit');
    });

    it('should return credit for revenue accounts', () => {
      expect(getNormalBalance('revenue')).toBe('credit');
    });

    it('should return credit for other_income accounts', () => {
      expect(getNormalBalance('other_income')).toBe('credit');
    });

    it('should throw error for unknown account type', () => {
      expect(() => getNormalBalance('invalid' as AccountType)).toThrow('Unknown account type: invalid');
    });
  });

  describe('isBalanceSheetAccount()', () => {
    it('should return true for asset', () => {
      expect(isBalanceSheetAccount('asset')).toBe(true);
    });

    it('should return true for liability', () => {
      expect(isBalanceSheetAccount('liability')).toBe(true);
    });

    it('should return true for equity', () => {
      expect(isBalanceSheetAccount('equity')).toBe(true);
    });

    it('should return false for revenue', () => {
      expect(isBalanceSheetAccount('revenue')).toBe(false);
    });

    it('should return false for expense', () => {
      expect(isBalanceSheetAccount('expense')).toBe(false);
    });
  });

  describe('isIncomeStatementAccount()', () => {
    it('should return true for revenue', () => {
      expect(isIncomeStatementAccount('revenue')).toBe(true);
    });

    it('should return true for expense', () => {
      expect(isIncomeStatementAccount('expense')).toBe(true);
    });

    it('should return true for cost_of_goods_sold', () => {
      expect(isIncomeStatementAccount('cost_of_goods_sold')).toBe(true);
    });

    it('should return true for other_income', () => {
      expect(isIncomeStatementAccount('other_income')).toBe(true);
    });

    it('should return true for other_expense', () => {
      expect(isIncomeStatementAccount('other_expense')).toBe(true);
    });

    it('should return false for asset', () => {
      expect(isIncomeStatementAccount('asset')).toBe(false);
    });

    it('should return false for liability', () => {
      expect(isIncomeStatementAccount('liability')).toBe(false);
    });
  });

  describe('getAccountTypeLabel()', () => {
    it('should return correct labels for all account types', () => {
      expect(getAccountTypeLabel('asset')).toBe('Asset');
      expect(getAccountTypeLabel('liability')).toBe('Liability');
      expect(getAccountTypeLabel('equity')).toBe('Equity');
      expect(getAccountTypeLabel('revenue')).toBe('Revenue');
      expect(getAccountTypeLabel('cost_of_goods_sold')).toBe('Cost of Goods Sold');
      expect(getAccountTypeLabel('expense')).toBe('Expense');
      expect(getAccountTypeLabel('other_income')).toBe('Other Income');
      expect(getAccountTypeLabel('other_expense')).toBe('Other Expense');
    });
  });
});

// =====================================================
// DOUBLE-ENTRY VALIDATION TESTS
// =====================================================

describe('Double-Entry Validation', () => {
  describe('validateJournalEntryBalance()', () => {
    it('should return balanced for equal debits and credits', () => {
      const lines: JournalEntryLine[] = [
        { accountId: '1', debitAmount: 100, creditAmount: 0 },
        { accountId: '2', debitAmount: 0, creditAmount: 100 },
      ];

      const result = validateJournalEntryBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(100);
      expect(result.totalCredits).toBe(100);
      expect(result.difference).toBe(0);
    });

    it('should return unbalanced for unequal debits and credits', () => {
      const lines: JournalEntryLine[] = [
        { accountId: '1', debitAmount: 100, creditAmount: 0 },
        { accountId: '2', debitAmount: 0, creditAmount: 50 },
      ];

      const result = validateJournalEntryBalance(lines);

      expect(result.isBalanced).toBe(false);
      expect(result.totalDebits).toBe(100);
      expect(result.totalCredits).toBe(50);
      expect(result.difference).toBe(50);
    });

    it('should handle multiple lines', () => {
      const lines: JournalEntryLine[] = [
        { accountId: '1', debitAmount: 100, creditAmount: 0 },
        { accountId: '2', debitAmount: 50, creditAmount: 0 },
        { accountId: '3', debitAmount: 0, creditAmount: 100 },
        { accountId: '4', debitAmount: 0, creditAmount: 50 },
      ];

      const result = validateJournalEntryBalance(lines);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(150);
      expect(result.totalCredits).toBe(150);
    });

    it('should allow small rounding differences', () => {
      const lines: JournalEntryLine[] = [
        { accountId: '1', debitAmount: 100.001, creditAmount: 0 },
        { accountId: '2', debitAmount: 0, creditAmount: 100 },
      ];

      const result = validateJournalEntryBalance(lines);

      expect(result.isBalanced).toBe(true);
    });

    it('should handle empty lines array', () => {
      const result = validateJournalEntryBalance([]);

      expect(result.isBalanced).toBe(true);
      expect(result.totalDebits).toBe(0);
      expect(result.totalCredits).toBe(0);
    });
  });

  describe('validateJournalEntryLine()', () => {
    it('should validate a valid debit line', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: 100,
        creditAmount: 0,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should validate a valid credit line', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: 0,
        creditAmount: 100,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require accountId', () => {
      const line: JournalEntryLine = {
        accountId: '',
        debitAmount: 100,
        creditAmount: 0,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Account is required');
    });

    it('should require either debit or credit amount', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: 0,
        creditAmount: 0,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Either debit or credit amount is required');
    });

    it('should not allow both debit and credit on same line', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: 100,
        creditAmount: 50,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Cannot have both debit and credit on the same line');
    });

    it('should not allow negative debit amount', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: -100,
        creditAmount: 0,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Debit amount cannot be negative');
    });

    it('should not allow negative credit amount', () => {
      const line: JournalEntryLine = {
        accountId: '123',
        debitAmount: 0,
        creditAmount: -100,
      };

      const result = validateJournalEntryLine(line);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Credit amount cannot be negative');
    });
  });

  describe('validateJournalEntry()', () => {
    it('should validate a complete valid entry', () => {
      const entry: JournalEntry = {
        entryDate: '2024-01-15',
        description: 'Test journal entry',
        lines: [
          { accountId: '1', debitAmount: 100, creditAmount: 0 },
          { accountId: '2', debitAmount: 0, creditAmount: 100 },
        ],
      };

      const result = validateJournalEntry(entry);

      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should require entry date', () => {
      const entry: JournalEntry = {
        entryDate: '',
        description: 'Test',
        lines: [
          { accountId: '1', debitAmount: 100, creditAmount: 0 },
          { accountId: '2', debitAmount: 0, creditAmount: 100 },
        ],
      };

      const result = validateJournalEntry(entry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Entry date is required');
    });

    it('should require description', () => {
      const entry: JournalEntry = {
        entryDate: '2024-01-15',
        description: '',
        lines: [
          { accountId: '1', debitAmount: 100, creditAmount: 0 },
          { accountId: '2', debitAmount: 0, creditAmount: 100 },
        ],
      };

      const result = validateJournalEntry(entry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('Description is required');
    });

    it('should require at least one line', () => {
      const entry: JournalEntry = {
        entryDate: '2024-01-15',
        description: 'Test',
        lines: [],
      };

      const result = validateJournalEntry(entry);

      expect(result.isValid).toBe(false);
      expect(result.errors).toContain('At least one journal entry line is required');
    });

    it('should warn for single line entry', () => {
      const entry: JournalEntry = {
        entryDate: '2024-01-15',
        description: 'Test',
        lines: [
          { accountId: '1', debitAmount: 100, creditAmount: 0 },
        ],
      };

      const result = validateJournalEntry(entry);

      expect(result.warnings).toContain('Most journal entries have at least 2 lines (debit and credit)');
    });

    it('should report unbalanced entry', () => {
      const entry: JournalEntry = {
        entryDate: '2024-01-15',
        description: 'Test',
        lines: [
          { accountId: '1', debitAmount: 100, creditAmount: 0 },
          { accountId: '2', debitAmount: 0, creditAmount: 50 },
        ],
      };

      const result = validateJournalEntry(entry);

      expect(result.isValid).toBe(false);
      expect(result.errors.some(e => e.includes('Entry is not balanced'))).toBe(true);
    });
  });
});

// =====================================================
// ACCOUNT BALANCE CALCULATIONS TESTS
// =====================================================

describe('Account Balance Calculations', () => {
  describe('calculateBalanceChange()', () => {
    it('should increase asset account with debit', () => {
      const change = calculateBalanceChange('asset', 100, 0);
      expect(change).toBe(100);
    });

    it('should decrease asset account with credit', () => {
      const change = calculateBalanceChange('asset', 0, 100);
      expect(change).toBe(-100);
    });

    it('should increase liability account with credit', () => {
      const change = calculateBalanceChange('liability', 0, 100);
      expect(change).toBe(100);
    });

    it('should decrease liability account with debit', () => {
      const change = calculateBalanceChange('liability', 100, 0);
      expect(change).toBe(-100);
    });

    it('should increase revenue account with credit', () => {
      const change = calculateBalanceChange('revenue', 0, 1000);
      expect(change).toBe(1000);
    });

    it('should increase expense account with debit', () => {
      const change = calculateBalanceChange('expense', 500, 0);
      expect(change).toBe(500);
    });
  });

  describe('calculateAccountBalance()', () => {
    it('should calculate correct balance for asset account', () => {
      const transactions = [
        { debitAmount: 100, creditAmount: 0 },
        { debitAmount: 50, creditAmount: 0 },
        { debitAmount: 0, creditAmount: 25 },
      ];

      const balance = calculateAccountBalance(0, 'asset', transactions);

      expect(balance).toBe(125);
    });

    it('should include beginning balance', () => {
      const transactions = [
        { debitAmount: 100, creditAmount: 0 },
      ];

      const balance = calculateAccountBalance(500, 'asset', transactions);

      expect(balance).toBe(600);
    });

    it('should calculate correct balance for liability account', () => {
      const transactions = [
        { debitAmount: 0, creditAmount: 100 },
        { debitAmount: 50, creditAmount: 0 },
      ];

      const balance = calculateAccountBalance(0, 'liability', transactions);

      expect(balance).toBe(50);
    });
  });
});

// =====================================================
// FINANCIAL STATEMENT CALCULATIONS TESTS
// =====================================================

describe('Financial Statement Calculations', () => {
  describe('calculateNetIncome()', () => {
    it('should calculate gross profit correctly', () => {
      const result = calculateNetIncome(10000, 4000, 3000);

      expect(result.grossProfit).toBe(6000);
    });

    it('should calculate operating income correctly', () => {
      const result = calculateNetIncome(10000, 4000, 3000);

      expect(result.operatingIncome).toBe(3000);
    });

    it('should calculate net income correctly', () => {
      const result = calculateNetIncome(10000, 4000, 3000, 500, 200);

      expect(result.netIncome).toBe(3300);
    });

    it('should calculate margins correctly', () => {
      const result = calculateNetIncome(10000, 4000, 3000);

      expect(result.grossMarginPercent).toBe(60);
      expect(result.netMarginPercent).toBe(30);
    });

    it('should handle zero revenue', () => {
      const result = calculateNetIncome(0, 0, 0);

      expect(result.grossMarginPercent).toBe(0);
      expect(result.netMarginPercent).toBe(0);
    });

    it('should handle negative net income', () => {
      const result = calculateNetIncome(5000, 3000, 4000);

      expect(result.netIncome).toBe(-2000);
    });
  });

  describe('calculateWorkingCapital()', () => {
    it('should calculate working capital correctly', () => {
      const result = calculateWorkingCapital(50000, 30000);

      expect(result.workingCapital).toBe(20000);
    });

    it('should calculate current ratio correctly', () => {
      const result = calculateWorkingCapital(50000, 25000);

      expect(result.currentRatio).toBe(2);
    });

    it('should handle zero liabilities', () => {
      const result = calculateWorkingCapital(50000, 0);

      expect(result.currentRatio).toBe(0);
    });

    it('should handle negative working capital', () => {
      const result = calculateWorkingCapital(30000, 50000);

      expect(result.workingCapital).toBe(-20000);
    });
  });

  describe('validateBalanceSheet()', () => {
    it('should return balanced for equal assets and liabilities + equity', () => {
      const result = validateBalanceSheet(100000, 40000, 60000);

      expect(result.isBalanced).toBe(true);
      expect(result.difference).toBe(0);
    });

    it('should return unbalanced for unequal amounts', () => {
      const result = validateBalanceSheet(100000, 40000, 50000);

      expect(result.isBalanced).toBe(false);
      expect(result.difference).toBe(10000);
    });

    it('should show correct left and right sides', () => {
      const result = validateBalanceSheet(100000, 40000, 60000);

      expect(result.leftSide).toBe(100000);
      expect(result.rightSide).toBe(100000);
    });
  });
});

// =====================================================
// PERIOD MANAGEMENT TESTS
// =====================================================

describe('Period Management', () => {
  describe('isDateInPeriod()', () => {
    it('should return true for date within period', () => {
      const result = isDateInPeriod('2024-01-15', '2024-01-01', '2024-01-31');
      expect(result).toBe(true);
    });

    it('should return true for date on start boundary', () => {
      const result = isDateInPeriod('2024-01-01', '2024-01-01', '2024-01-31');
      expect(result).toBe(true);
    });

    it('should return true for date on end boundary', () => {
      const result = isDateInPeriod('2024-01-31', '2024-01-01', '2024-01-31');
      expect(result).toBe(true);
    });

    it('should return false for date before period', () => {
      const result = isDateInPeriod('2023-12-31', '2024-01-01', '2024-01-31');
      expect(result).toBe(false);
    });

    it('should return false for date after period', () => {
      const result = isDateInPeriod('2024-02-01', '2024-01-01', '2024-01-31');
      expect(result).toBe(false);
    });
  });

  describe('generateMonthlyPeriods()', () => {
    it('should generate 12 periods for a full year', () => {
      const periods = generateMonthlyPeriods(
        new Date('2024-01-01'),
        new Date('2024-12-31')
      );

      expect(periods.length).toBe(12);
    });

    it('should number periods sequentially', () => {
      const periods = generateMonthlyPeriods(
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );

      expect(periods[0].periodNumber).toBe(1);
      expect(periods[1].periodNumber).toBe(2);
      expect(periods[2].periodNumber).toBe(3);
    });

    it('should include correct month names', () => {
      const periods = generateMonthlyPeriods(
        new Date('2024-01-01'),
        new Date('2024-03-31')
      );

      expect(periods[0].periodName).toContain('January');
      expect(periods[1].periodName).toContain('February');
      expect(periods[2].periodName).toContain('March');
    });
  });
});

// =====================================================
// ACCOUNT AGING TESTS
// =====================================================

describe('Account Aging', () => {
  describe('calculateAging()', () => {
    it('should categorize current items correctly', () => {
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + 10);

      const items = [
        { dueDate: futureDate, amountDue: 100 },
      ];

      const result = calculateAging(items);

      expect(result.current).toBe(100);
      expect(result.total).toBe(100);
    });

    it('should categorize 1-30 days items correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 15);

      const items = [
        { dueDate: pastDate, amountDue: 200 },
      ];

      const result = calculateAging(items);

      expect(result.days1to30).toBe(200);
    });

    it('should categorize 31-60 days items correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 45);

      const items = [
        { dueDate: pastDate, amountDue: 300 },
      ];

      const result = calculateAging(items);

      expect(result.days31to60).toBe(300);
    });

    it('should categorize over 90 days items correctly', () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 120);

      const items = [
        { dueDate: pastDate, amountDue: 500 },
      ];

      const result = calculateAging(items);

      expect(result.over90).toBe(500);
    });

    it('should calculate total correctly', () => {
      const today = new Date();
      const items = [
        { dueDate: new Date(today.getTime() + 86400000 * 5), amountDue: 100 }, // current
        { dueDate: new Date(today.getTime() - 86400000 * 20), amountDue: 200 }, // 1-30
        { dueDate: new Date(today.getTime() - 86400000 * 45), amountDue: 300 }, // 31-60
      ];

      const result = calculateAging(items);

      expect(result.total).toBe(600);
    });

    it('should generate correct bucket array', () => {
      const result = calculateAging([]);

      expect(result.buckets).toHaveLength(5);
      expect(result.buckets[0].label).toBe('Current');
      expect(result.buckets[4].label).toBe('Over 90 Days');
    });
  });
});

// =====================================================
// FORMATTING UTILITIES TESTS
// =====================================================

describe('Formatting Utilities', () => {
  describe('formatCurrency()', () => {
    it('should format positive amounts correctly', () => {
      expect(formatCurrency(1234.56)).toBe('$1,234.56');
    });

    it('should format negative amounts with parentheses by default', () => {
      expect(formatCurrency(-1234.56)).toBe('($1,234.56)');
    });

    it('should format negative amounts with minus sign when specified', () => {
      expect(formatCurrency(-1234.56, { showParensForNegative: false })).toBe('-$1,234.56');
    });

    it('should format without cents when specified', () => {
      expect(formatCurrency(1234.56, { showCents: false })).toBe('$1,235');
    });

    it('should use custom currency symbol', () => {
      expect(formatCurrency(1234.56, { currencySymbol: '€' })).toBe('€1,234.56');
    });

    it('should format zero correctly', () => {
      expect(formatCurrency(0)).toBe('$0.00');
    });
  });

  describe('formatPercentage()', () => {
    it('should format percentage with default decimals', () => {
      expect(formatPercentage(25.5)).toBe('25.5%');
    });

    it('should format percentage with custom decimals', () => {
      expect(formatPercentage(25.567, 2)).toBe('25.57%');
    });

    it('should format percentage with no decimals', () => {
      expect(formatPercentage(25.5, 0)).toBe('26%');
    });
  });

  describe('formatAccountNumber()', () => {
    it('should pad account number with leading zeros', () => {
      expect(formatAccountNumber('123')).toBe('0123');
    });

    it('should use custom length', () => {
      expect(formatAccountNumber('1', 6)).toBe('000001');
    });

    it('should handle numeric input', () => {
      expect(formatAccountNumber(42, 4)).toBe('0042');
    });

    it('should not truncate longer numbers', () => {
      expect(formatAccountNumber('12345', 4)).toBe('12345');
    });
  });

  describe('generateReferenceNumber()', () => {
    it('should generate reference with prefix and padded sequence', () => {
      expect(generateReferenceNumber('INV', 1)).toBe('INV-000001');
    });

    it('should use custom length', () => {
      expect(generateReferenceNumber('JE', 42, 8)).toBe('JE-00000042');
    });

    it('should handle larger sequence numbers', () => {
      expect(generateReferenceNumber('BILL', 123456)).toBe('BILL-123456');
    });
  });

  describe('parseReferenceNumber()', () => {
    it('should parse valid reference number', () => {
      const result = parseReferenceNumber('INV-000123');

      expect(result).not.toBeNull();
      expect(result?.prefix).toBe('INV');
      expect(result?.sequenceNumber).toBe(123);
    });

    it('should return null for invalid format', () => {
      const result = parseReferenceNumber('INVALID');

      expect(result).toBeNull();
    });

    it('should return null for too many parts', () => {
      const result = parseReferenceNumber('INV-123-456');

      expect(result).toBeNull();
    });
  });
});
