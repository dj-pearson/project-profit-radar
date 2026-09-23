// US-377: thin aliases over @/lib/format, kept for existing importers. Each
// wrapper takes one argument on purpose, so `list.map(formatDate)` cannot pass
// the index through as formatting options.
import {
  formatCurrency as formatCurrencyBase,
  formatDate as formatDateBase,
  formatDateTime as formatDateTimeBase,
  formatPercent,
} from '@/lib/format';

/** Whole-dollar USD: 1234.56 -> "$1,235". */
export const formatCurrency = (amount: number): string =>
  formatCurrencyBase(amount, { decimals: 0 });

export const formatDate = (dateString: string): string => formatDateBase(dateString);

export const formatDateTime = (dateString: string): string => formatDateTimeBase(dateString);

export const formatPercentage = (value: number): string => formatPercent(value);
