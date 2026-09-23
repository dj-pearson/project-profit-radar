import { z } from 'zod';
import { emailField, requiredDateField, requiredText } from './common';

/**
 * InvoiceGenerator form (US-268). The checks are the two the component used
 * to throw into a toast after submit (client name and email; every line
 * needs a description and a positive unit price), now shown on the field.
 */

export const invoiceLineSchema = z.object({
  description: requiredText('Enter a description', 500),
  quantity: z.number().min(0, 'Quantity cannot be negative'),
  unit_price: z.number().positive('Enter a unit price above zero'),
  cost_code_id: z.string().optional(),
  project_phase_id: z.string().optional(),
  /** US-332: null means the invoice rate applies. */
  tax_rate: z.number().nullable(),
  taxable: z.boolean(),
});
export type InvoiceLineValues = z.infer<typeof invoiceLineSchema>;

export const invoiceFormSchema = z.object({
  client_id: z.string().nullable(),
  client_name: requiredText('Client name is required', 200),
  client_email: emailField,
  project_id: z.string(),
  due_date: requiredDateField('Due date is required'),
  tax_rate: z.number().min(0, 'Tax rate cannot be negative').max(100, 'Tax rate cannot exceed 100%'),
  terms: z.string(),
  discount_amount: z.number().min(0, 'Discount cannot be negative'),
  notes: z.string(),
  line_items: z.array(invoiceLineSchema).min(1, 'Add at least one line item'),
});
export type InvoiceFormValues = z.infer<typeof invoiceFormSchema>;

export const blankInvoiceLine = (): InvoiceLineValues => ({
  description: '',
  quantity: 1,
  unit_price: 0,
  tax_rate: null,
  taxable: true,
});

/** The generate-invoice body the useState form sent. */
export const buildInvoiceRequest = (v: InvoiceFormValues) => {
  const { line_items, ...invoiceData } = v;
  return {
    ...invoiceData,
    // The schema takes an optional uuid, and `optional()` accepts undefined
    // but not null - sending null would 400 the whole request.
    client_id: invoiceData.client_id ?? undefined,
    line_items: line_items
      .filter((item) => item.description.trim() !== '')
      .map(({ tax_rate, taxable, ...item }) => ({
        ...item,
        // Sent only when the line overrides the invoice rate, so the request
        // is byte-for-byte the old one when nobody does.
        ...(tax_rate != null ? { tax_rate } : {}),
        ...(taxable === false ? { taxable } : {}),
      })),
  };
};
