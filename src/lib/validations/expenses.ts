import { z } from 'zod';

const paymentMethods = ['Cash', 'Check', 'Credit Card', 'Debit Card', 'Wire Transfer', 'ACH', 'Company Account'] as const;
const paymentStatuses = ['pending', 'approved', 'paid', 'reimbursed'] as const;

export const expenseSchema = z.object({
  project_id: z.string().uuid('Invalid project ID').optional().or(z.literal('')),
  vendor_name: z.string()
    .trim()
    .min(1, 'Vendor name is required')
    .max(200, 'Vendor name must be less than 200 characters'),
  amount: z.number()
    .positive('Amount must be greater than 0')
    .max(1000000, 'Amount cannot exceed $1,000,000')
    .refine((val) => Number.isFinite(val) && val > 0, {
      message: 'Amount must be a valid positive number',
    }),
  tax_amount: z.number()
    .min(0, 'Tax amount cannot be negative')
    .max(100000, 'Tax amount too large')
    .optional(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  payment_method: z.enum(paymentMethods, {
    errorMap: () => ({ message: 'Please select a valid payment method' }),
  }),
  payment_status: z.enum(paymentStatuses, {
    errorMap: () => ({ message: 'Please select a valid payment status' }),
  }).optional(),
  description: z.string()
    .max(1000, 'Description must be less than 1000 characters')
    .optional(),
  receipt_url: z.string()
    .url('Invalid receipt URL')
    .max(2048, 'URL too long')
    .optional()
    .or(z.literal('')),
  is_billable: z.boolean().optional(),
});

export const expenseApprovalSchema = z.object({
  expense_id: z.string().uuid('Invalid expense ID'),
  status: z.enum(['approved', 'rejected'], {
    errorMap: () => ({ message: 'Status must be approved or rejected' }),
  }),
  approval_notes: z.string()
    .max(500, 'Approval notes must be less than 500 characters')
    .optional(),
});

export type ExpenseInput = z.infer<typeof expenseSchema>;
export type ExpenseApprovalInput = z.infer<typeof expenseApprovalSchema>;
