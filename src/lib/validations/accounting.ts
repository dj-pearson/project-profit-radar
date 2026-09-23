import { z } from 'zod';
import { requiredDateField, requiredText } from './common';

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

/** One row of the Journal Entries "Create Journal Entry" grid. */
export const journalEntryLineSchema = z.object({
  id: z.string(),
  accountId: z.string(),
  accountName: z.string().optional(),
  debitAmount: z.number(),
  creditAmount: z.number(),
  description: z.string(),
});
export type JournalEntryLineValues = z.infer<typeof journalEntryLineSchema>;

/**
 * Journal Entries create dialog. The per-line and balance rules are the ones
 * validateJournalEntry (utils/accountingUtils) applied after submit; here each
 * lands on the row or field it belongs to.
 */
export const journalEntryFormSchema = z
  .object({
    entryDate: requiredDateField('Entry date is required'),
    description: requiredText('Description is required', 500),
    memo: z.string(),
    lines: z.array(journalEntryLineSchema),
  })
  .superRefine((d, ctx) => {
    if (d.lines.length < 2) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lines'], message: 'Add at least two lines' });
      return;
    }
    let linesValid = true;
    d.lines.forEach((line, i) => {
      if (!line.accountId) {
        linesValid = false;
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lines', i, 'accountId'], message: 'Select an account' });
      }
      const debit = Number(line.debitAmount) || 0;
      const credit = Number(line.creditAmount) || 0;
      let amountError: string | null = null;
      if (debit < 0 || credit < 0) amountError = 'Amounts cannot be negative';
      else if (!debit && !credit) amountError = 'Enter a debit or a credit';
      else if (debit && credit) amountError = 'A line cannot have both a debit and a credit';
      if (amountError) {
        linesValid = false;
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lines', i, 'debitAmount'], message: amountError });
      }
    });
    if (!linesValid) return;
    const debits = d.lines.reduce((s, l) => s + (Number(l.debitAmount) || 0), 0);
    const credits = d.lines.reduce((s, l) => s + (Number(l.creditAmount) || 0), 0);
    if (Math.abs(debits - credits) >= 0.01) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['lines'], message: 'Debits must equal credits' });
    }
  });
export type JournalEntryFormValues = z.infer<typeof journalEntryFormSchema>;

export const newJournalLine = (): JournalEntryLineValues => ({
  id: Math.random().toString(36).substr(2, 9),
  accountId: '',
  debitAmount: 0,
  creditAmount: 0,
  description: '',
});

/** A fresh dialog: today's date and the two starting lines. */
export const emptyJournalEntry = (): JournalEntryFormValues => ({
  entryDate: new Date().toISOString().split('T')[0],
  description: '',
  memo: '',
  lines: [newJournalLine(), newJournalLine()],
});

/** The useCreateJournalEntry argument, built exactly as the useState form built it. */
export const buildJournalEntryPayload = (companyId: string, values: JournalEntryFormValues) => ({
  companyId,
  entryDate: values.entryDate,
  description: values.description,
  memo: values.memo,
  lines: values.lines.map((line) => ({
    accountId: line.accountId,
    debitAmount: Number(line.debitAmount) || 0,
    creditAmount: Number(line.creditAmount) || 0,
    description: line.description,
  })),
});

/** One line of the Accounts Payable "Create Bill" grid. */
export const billLineItemSchema = z.object({
  id: z.string(),
  description: z.string(),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unitPrice: z.number().min(0, 'Unit price cannot be negative'),
  amount: z.number(),
  expenseAccountId: z.string().min(1, 'Select an expense account'),
});
export type BillLineItemValues = z.infer<typeof billLineItemSchema>;

/** Accounts Payable "Create Bill" dialog. */
export const billFormSchema = z
  .object({
    vendorId: z.string().min(1, 'Select a vendor'),
    billDate: requiredDateField('Bill date is required'),
    dueDate: requiredDateField('Due date is required'),
    vendorRefNumber: z.string().max(100, 'Must be 100 characters or fewer'),
    memo: z.string(),
    lineItems: z.array(billLineItemSchema).min(1, 'Add at least one line'),
  })
  .refine((d) => !d.billDate || !d.dueDate || d.dueDate >= d.billDate, {
    message: 'Due date cannot be before the bill date',
    path: ['dueDate'],
  });
export type BillFormValues = z.infer<typeof billFormSchema>;

/** One selected bill in the Bill Payments "Pay Bills" dialog. */
export const billPaymentApplicationSchema = z
  .object({
    billId: z.string(),
    billNumber: z.string(),
    vendorName: z.string(),
    totalAmount: z.number(),
    amountDue: z.number(),
    amountToPay: z.number(),
  })
  .superRefine((a, ctx) => {
    if (!(a.amountToPay > 0)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountToPay'], message: 'Enter an amount above zero' });
    } else if (a.amountToPay - Number(a.amountDue) > 0.005) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['amountToPay'], message: 'More than the amount due' });
    }
  });

/** Bill Payments "Pay Bills" dialog. */
export const billPaymentFormSchema = z.object({
  paymentDate: requiredDateField('Payment date is required'),
  paymentMethod: z.string(),
  bankAccountId: z.string().min(1, 'Select a bank account'),
  checkNumber: z.string().max(50, 'Must be 50 characters or fewer'),
  referenceNumber: z.string().max(100, 'Must be 100 characters or fewer'),
  memo: z.string(),
  billsToPayArray: z.array(billPaymentApplicationSchema).min(1, 'Select at least one bill to pay'),
});
export type BillPaymentFormValues = z.infer<typeof billPaymentFormSchema>;

export const newBillLineItem = (): BillLineItemValues => ({
  id: Math.random().toString(36).substr(2, 9),
  description: '',
  quantity: 1,
  unitPrice: 0,
  amount: 0,
  expenseAccountId: '',
});

/** A fresh "Create Bill" dialog: dated today, due in 30 days, one empty line. */
export const emptyBill = (lineItems: BillLineItemValues[] = [newBillLineItem()]): BillFormValues => ({
  vendorId: '',
  billDate: new Date().toISOString().split('T')[0],
  dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  vendorRefNumber: '',
  memo: '',
  lineItems,
});

/** The useCreateBill argument, built exactly as the useState form built it. */
export const buildBillPayload = (companyId: string, values: BillFormValues) => ({
  companyId,
  vendorId: values.vendorId,
  billDate: values.billDate,
  dueDate: values.dueDate,
  vendorRefNumber: values.vendorRefNumber,
  memo: values.memo,
  lineItems: values.lineItems.map((item) => ({
    description: item.description,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    amount: item.amount,
    expenseAccountId: item.expenseAccountId,
  })),
});

/** A fresh "Pay Bills" dialog. */
export const emptyBillPayment = (): BillPaymentFormValues => ({
  paymentDate: new Date().toISOString().split('T')[0],
  paymentMethod: 'check',
  bankAccountId: '',
  checkNumber: '',
  referenceNumber: '',
  memo: '',
  billsToPayArray: [],
});
