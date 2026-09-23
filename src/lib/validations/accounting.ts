import { z } from 'zod';
import { requiredDateField } from './common';

/**
 * Accounting page forms (US-268). Values are the strings the inputs hold;
 * each page converts them exactly as its useState version did.
 */

/** Fiscal Periods "Create Fiscal Year" dialog. */
export const fiscalYearFormSchema = z
  .object({
    yearNumber: z.string().refine((v) => /^\d{4}$/.test(v.trim()), { message: 'Enter a four-digit year' }),
    startDate: requiredDateField('Start date is required'),
    endDate: requiredDateField('End date is required'),
  })
  .refine((d) => !d.startDate || !d.endDate || d.endDate > d.startDate, {
    message: 'End date must be after the start date',
    path: ['endDate'],
  });
export type FiscalYearFormValues = z.infer<typeof fiscalYearFormSchema>;

/** Defaults for a calendar fiscal year. */
export const fiscalYearDefaults = (year: number): FiscalYearFormValues => ({
  yearNumber: String(year),
  startDate: `${year}-01-01`,
  endDate: `${year}-12-31`,
});

/** Chart of Accounts create/edit dialog. */
export const chartAccountFormSchema = z.object({
  accountNumber: z.string().refine((v) => v.trim().length > 0, { message: 'Account number is required' }),
  accountName: z.string().refine((v) => v.trim().length > 0, { message: 'Account name is required' }),
  accountType: z.string(),
  accountSubtype: z.string(),
  description: z.string(),
  // An account row can hold null here; editing one sends it back unchanged.
  isActive: z.boolean().nullable(),
  allowManualEntries: z.boolean().nullable(),
});
export type ChartAccountFormValues = z.infer<typeof chartAccountFormSchema>;

export const CHART_ACCOUNT_DEFAULTS: ChartAccountFormValues = {
  accountNumber: '',
  accountName: '',
  accountType: 'asset',
  accountSubtype: 'bank',
  description: '',
  isActive: true,
  allowManualEntries: true,
};
