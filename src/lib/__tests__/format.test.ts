/**
 * US-377 AC3: one formatting module. These cases pin the output each of the
 * four former formatCurrency implementations produced before they were folded
 * into @/lib/format, so the consolidation cannot change what a caller renders.
 */
import { describe, it, expect } from 'vitest';
import {
  formatCurrency,
  formatDate,
  formatDateTime,
  formatNumber,
  formatPercent,
} from '@/lib/format';
import { formatCurrency as utilsFormatCurrency } from '@/lib/utils';
import {
  formatCurrency as formattersFormatCurrency,
  formatDate as formattersFormatDate,
  formatDateTime as formattersFormatDateTime,
  formatPercentage as formattersFormatPercentage,
} from '@/utils/formatters';
import { formatCurrency as accountingFormatCurrency } from '@/utils/accountingUtils';
import {
  formatCurrency as profitabilityFormatCurrency,
  formatPercentage as profitabilityFormatPercentage,
} from '@/lib/profitabilityCalculations';

const AMOUNTS = [0, 1234.56, -1234.56, 1234.5, 0.005, 999999.999, -0.4, 1e9];

describe('@/lib/utils formatCurrency (USD, 2 decimals)', () => {
  it.each([
    [0, '$0.00'],
    [1234.56, '$1,234.56'],
    [-1234.56, '-$1,234.56'],
    [1234.5, '$1,234.50'],
    [0.005, '$0.01'],
    [999999.999, '$1,000,000.00'],
    [-0.4, '-$0.40'],
    [1e9, '$1,000,000,000.00'],
  ])('%s -> %s', (n, out) => {
    expect(utilsFormatCurrency(n)).toBe(out);
  });
});

describe('whole-dollar formatCurrency (formatters, profitabilityCalculations)', () => {
  it.each([
    [0, '$0'],
    [1234.56, '$1,235'],
    [-1234.56, '-$1,235'],
    [1234.5, '$1,235'],
    [0.005, '$0'],
    [999999.999, '$1,000,000'],
    [-0.4, '-$0'],
    [1e9, '$1,000,000,000'],
  ])('%s -> %s', (n, out) => {
    expect(formattersFormatCurrency(n)).toBe(out);
    expect(profitabilityFormatCurrency(n)).toBe(out);
  });
});

describe('accountingUtils formatCurrency (parens, custom symbol)', () => {
  it('pins default output', () => {
    expect(AMOUNTS.map((n) => accountingFormatCurrency(n))).toEqual([
      '$0.00',
      '$1,234.56',
      '($1,234.56)',
      '$1,234.50',
      '$0.01',
      '$1,000,000.00',
      '($0.40)',
      '$1,000,000,000.00',
    ]);
  });

  it('pins option combinations', () => {
    expect(accountingFormatCurrency(-1234.56, { showParensForNegative: false })).toBe('-$1,234.56');
    expect(accountingFormatCurrency(1234.56, { showCents: false })).toBe('$1,235');
    expect(accountingFormatCurrency(-1234.56, { showCents: false })).toBe('($1,235)');
    expect(accountingFormatCurrency(1234.56, { currencySymbol: 'EUR ' })).toBe('EUR 1,234.56');
    expect(accountingFormatCurrency(-0)).toBe('$0.00');
  });
});

describe('formatters date and percentage helpers', () => {
  it('formatDate', () => {
    expect(formattersFormatDate('2024-03-15T12:00:00')).toBe('Mar 15, 2024');
  });

  it('formatDateTime', () => {
    expect(formattersFormatDateTime('2024-03-15T14:05:00')).toBe('Mar 15, 2024, 02:05 PM');
  });

  it('formatPercentage', () => {
    expect(formattersFormatPercentage(12.345)).toBe('12.3%');
    expect(profitabilityFormatPercentage(12.345)).toBe('12.3%');
    expect(profitabilityFormatPercentage(12.345, 2)).toBe('12.35%');
  });
});

describe('@/lib/format', () => {
  it('lib/utils re-exports the canonical formatCurrency', () => {
    expect(utilsFormatCurrency).toBe(formatCurrency);
  });

  it('formatCurrency options', () => {
    expect(formatCurrency(1234.567)).toBe('$1,234.57');
    expect(formatCurrency(1234.567, { decimals: 0 })).toBe('$1,235');
    expect(formatCurrency(-5, { negative: 'parens' })).toBe('($5.00)');
    expect(formatCurrency(-5, { symbol: 'EUR ' })).toBe('-EUR 5.00');
  });

  it('formatNumber', () => {
    expect(formatNumber(1234.5)).toBe('1,234.5');
    expect(formatNumber(0.1234, { style: 'percent', maximumFractionDigits: 1 })).toBe('12.3%');
    expect(formatNumber(1500, { notation: 'compact' })).toBe('1.5K');
  });

  it('formatPercent', () => {
    expect(formatPercent(12.345)).toBe('12.3%');
    expect(formatPercent(12.345, 0)).toBe('12%');
  });

  it('formatDate and formatDateTime accept string, number and Date', () => {
    const d = new Date(2024, 2, 15, 14, 5);
    expect(formatDate(d)).toBe('Mar 15, 2024');
    expect(formatDate(d.getTime())).toBe('Mar 15, 2024');
    expect(formatDate(d, { month: 'long', day: 'numeric' })).toBe('March 15');
    expect(formatDateTime(d)).toBe('Mar 15, 2024, 02:05 PM');
  });
});
