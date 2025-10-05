import { z } from 'zod';

export const profileUpdateSchema = z.object({
  full_name: z.string()
    .trim()
    .min(2, 'Full name must be at least 2 characters')
    .max(100, 'Full name must be less than 100 characters')
    .optional(),
  phone: z.string()
    .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits')
    .max(20, 'Phone number must be less than 20 characters')
    .optional()
    .or(z.literal('')),
  job_title: z.string()
    .max(100, 'Job title must be less than 100 characters')
    .optional(),
  department: z.string()
    .max(100, 'Department must be less than 100 characters')
    .optional(),
  hourly_rate: z.number()
    .min(0, 'Hourly rate cannot be negative')
    .max(1000, 'Hourly rate cannot exceed $1000')
    .optional(),
  avatar_url: z.string()
    .url('Invalid avatar URL')
    .max(2048, 'URL too long')
    .optional()
    .or(z.literal('')),
});

export const passwordChangeSchema = z.object({
  current_password: z.string()
    .min(1, 'Current password is required'),
  new_password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .max(72, 'Password must be less than 72 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),
  confirm_password: z.string()
    .min(1, 'Please confirm your password'),
}).refine((data) => data.new_password === data.confirm_password, {
  message: 'Passwords do not match',
  path: ['confirm_password'],
});

export const emailUpdateSchema = z.object({
  email: z.string()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters')
    .toLowerCase()
    .trim(),
});

export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;
export type PasswordChangeInput = z.infer<typeof passwordChangeSchema>;
export type EmailUpdateInput = z.infer<typeof emailUpdateSchema>;
