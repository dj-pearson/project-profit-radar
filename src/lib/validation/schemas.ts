import { z } from 'zod';

// Contact form validation
export const contactFormSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  message: z.string()
    .trim()
    .min(1, 'Message is required')
    .max(5000, 'Message must be less than 5000 characters'),
});

export type ContactFormData = z.infer<typeof contactFormSchema>;

// Project validation
export const projectSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'Project name is required')
    .max(200, 'Project name must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  budget: z.number()
    .positive('Budget must be positive')
    .max(99999999, 'Budget exceeds maximum')
    .optional(),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    return data.endDate >= data.startDate;
  }
  return true;
}, {
  message: 'End date must be after start date',
  path: ['endDate'],
});

export type ProjectFormData = z.infer<typeof projectSchema>;

// User profile validation
export const userProfileSchema = z.object({
  firstName: z.string()
    .trim()
    .min(1, 'First name is required')
    .max(50, 'First name must be less than 50 characters'),
  lastName: z.string()
    .trim()
    .min(1, 'Last name is required')
    .max(50, 'Last name must be less than 50 characters'),
  email: z.string()
    .trim()
    .email('Invalid email address')
    .max(255, 'Email must be less than 255 characters'),
  phone: z.string()
    .trim()
    .regex(/^[\d\s\-\+\(\)]+$/, 'Invalid phone number')
    .optional()
    .or(z.literal('')),
  bio: z.string()
    .trim()
    .max(500, 'Bio must be less than 500 characters')
    .optional()
    .or(z.literal('')),
});

export type UserProfileData = z.infer<typeof userProfileSchema>;

// Task validation
export const taskSchema = z.object({
  title: z.string()
    .trim()
    .min(1, 'Title is required')
    .max(200, 'Title must be less than 200 characters'),
  description: z.string()
    .trim()
    .max(2000, 'Description must be less than 2000 characters')
    .optional()
    .or(z.literal('')),
  priority: z.enum(['low', 'medium', 'high', 'urgent']),
  status: z.enum(['todo', 'in_progress', 'review', 'done']),
  dueDate: z.date().optional(),
  estimatedHours: z.number()
    .min(0, 'Estimated hours must be positive')
    .max(1000, 'Estimated hours exceeds maximum')
    .optional(),
});

export type TaskFormData = z.infer<typeof taskSchema>;

// Comment validation
export const commentSchema = z.object({
  content: z.string()
    .trim()
    .min(1, 'Comment cannot be empty')
    .max(2000, 'Comment must be less than 2000 characters'),
  mentions: z.array(z.string().uuid()).optional(),
});

export type CommentFormData = z.infer<typeof commentSchema>;

// File upload validation
export const fileUploadSchema = z.object({
  name: z.string()
    .trim()
    .min(1, 'File name is required')
    .max(255, 'File name must be less than 255 characters'),
  size: z.number()
    .max(10 * 1024 * 1024, 'File size must be less than 10MB'),
  type: z.string()
    .regex(/^[a-z]+\/[a-z0-9\-\+\.]+$/i, 'Invalid file type'),
});

export type FileUploadData = z.infer<typeof fileUploadSchema>;

// Search validation
export const searchSchema = z.object({
  query: z.string()
    .trim()
    .min(1, 'Search query is required')
    .max(100, 'Search query must be less than 100 characters'),
  filters: z.record(z.string()).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export type SearchData = z.infer<typeof searchSchema>;

// Pagination validation
export const paginationSchema = z.object({
  page: z.number().int().min(0, 'Page must be 0 or greater'),
  pageSize: z.number().int().min(1).max(100, 'Page size must be between 1 and 100'),
});

export type PaginationData = z.infer<typeof paginationSchema>;
