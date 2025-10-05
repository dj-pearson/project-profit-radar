import { z } from 'zod';

const baseProjectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters'),
  description: z.string()
    .max(2000, 'Description must be less than 2000 characters')
    .optional(),
  client_name: z.string()
    .trim()
    .min(1, 'Client name is required')
    .max(200, 'Client name must be less than 200 characters'),
  client_email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .optional()
    .or(z.literal('')),
  client_phone: z.string()
    .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  project_address: z.string()
    .max(500, 'Address must be less than 500 characters')
    .optional(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  end_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format'),
  budget: z.number()
    .positive('Budget must be greater than 0')
    .max(100000000, 'Budget cannot exceed $100,000,000')
    .optional(),
  status: z.enum(['planning', 'active', 'on_hold', 'completed', 'cancelled'], {
    errorMap: () => ({ message: 'Invalid project status' }),
  }).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical'], {
    errorMap: () => ({ message: 'Invalid priority level' }),
  }).optional(),
});

export const projectSchema = baseProjectSchema.refine((data) => {
  if (data.start_date && data.end_date) {
    return new Date(data.end_date) >= new Date(data.start_date);
  }
  return true;
}, {
  message: 'End date must be on or after start date',
  path: ['end_date'],
});

export const projectUpdateSchema = baseProjectSchema.partial().extend({
  id: z.string().uuid('Invalid project ID'),
});

export type ProjectInput = z.infer<typeof projectSchema>;
export type ProjectUpdateInput = z.infer<typeof projectUpdateSchema>;
