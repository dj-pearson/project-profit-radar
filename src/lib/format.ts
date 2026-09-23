/**
 * The one place the app formats money, numbers, dates and times (US-377).
 *
 * formatCurrency used to exist four times (lib/utils, utils/formatters,
 * utils/accountingUtils, lib/profitabilityCalculations) with three different
 * outputs for the same number. Those modules now delegate here with the
 * options that reproduce what they always returned, and
 * src/lib/__tests__/format.test.ts pins those outputs.
 *
 * eslint.config.js flags toLocaleDateString and `new Intl.NumberFormat`
 * everywhere else in src/, and scripts/check-direct-formatting.mjs keeps the
 * remaining direct uses from growing.
 */

const LOCALE = 'en-US';

const numberFormatCache = new Map<string, Intl.NumberFormat>();

function numberFormat(options: Intl.NumberFormatOptions): Intl.NumberFormat {
  const key = JSON.stringify(options);
  let nf = numberFormatCache.get(key);
  if (!nf) {
    nf = new Intl.NumberFormat(LOCALE, options);
    numberFormatCache.set(key, nf);
  }
  return nf;
}

export interface FormatCurrencyOptions {
  /** Fraction digits, used as both min and max. Default 2 (cents). */
  decimals?: number;
  /**
   * How a negative amount renders. 'minus' (default) gives -$1.00;
   * 'parens' gives the accounting form ($1.00).
   */
  negative?: 'minus' | 'parens';
  /**
   * A literal prefix in place of the USD currency sign, e.g. 'EUR '. Setting
   * this (or negative: 'parens') formats the absolute value and prefixes the
   * symbol, so -0 renders without a sign.
   */
  symbol?: string;
}

/**
 * Format a USD amount. Defaults: 2 decimals, minus sign for negatives
 * (1234.5 -> "$1,234.50", -3 -> "-$3.00").
 */
export function formatCurrency(amount: number, options: FormatCurrencyOptions = {}): string {
  const { decimals = 2, negative = 'minus', symbol } = options;

  if (symbol === undefined && negative === 'minus') {
    return numberFormat({
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(amount);
  }

  const digits = numberFormat({
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(Math.abs(amount));
  const result = `${symbol ?? '$'}${digits}`;
  if (amount < 0) return negative === 'parens' ? `(${result})` : `-${result}`;
  return result;
}

/** Format a plain number with en-US grouping (1234.5 -> "1,234.5"). */
export function formatNumber(value: number, options: Intl.NumberFormatOptions = {}): string {
  return numberFormat(options).format(value);
}

/** Format a percentage value that is already 0-100 (12.345 -> "12.3%"). */
export function formatPercent(value: number, decimals: number = 1): string {
  return `${value.toFixed(decimals)}%`;
}

export type DateInput = string | number | Date;

const DEFAULT_DATE: Intl.DateTimeFormatOptions = {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
};

const DEFAULT_DATE_TIME: Intl.DateTimeFormatOptions = {
  ...DEFAULT_DATE,
  hour: '2-digit',
  minute: '2-digit',
};

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/** Format a date ("Mar 15, 2024" by default). Pass options to override. */
export function formatDate(value: DateInput, options: Intl.DateTimeFormatOptions = DEFAULT_DATE): string {
  return toDate(value).toLocaleDateString(LOCALE, options);
}

/** Format a date and time ("Mar 15, 2024, 02:05 PM" by default). */
export function formatDateTime(
  value: DateInput,
  options: Intl.DateTimeFormatOptions = DEFAULT_DATE_TIME,
): string {
  return toDate(value).toLocaleString(LOCALE, options);
}
