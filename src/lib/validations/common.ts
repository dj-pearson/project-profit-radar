import { z } from 'zod';

/**
 * Common validation schemas used across the application
 */

export const uuidSchema = z.string().uuid('Invalid ID format');

export const dateSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date format (YYYY-MM-DD)');

export const datetimeSchema = z.string().datetime('Invalid datetime format');

export const urlSchema = z.string()
  .url('Invalid URL')
  .max(2048, 'URL too long');

export const phoneSchema = z.string()
  .regex(/^[\d\s\-\(\)\+]+$/, 'Invalid phone number format')
  .min(10, 'Phone number must be at least 10 digits')
  .max(20, 'Phone number too long');

export const emailSchema = z.string()
  .email('Invalid email address')
  .max(255, 'Email too long')
  .toLowerCase()
  .trim();

export const currencySchema = z.number()
  .positive('Amount must be greater than 0')
  .max(999999999.99, 'Amount too large')
  .refine((val) => {
    // Check max 2 decimal places for currency
    return Math.round(val * 100) === val * 100;
  }, {
    message: 'Amount must have at most 2 decimal places',
  });

export const percentageSchema = z.number()
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100');

export const coordinateSchema = z.object({
  latitude: z.number()
    .min(-90, 'Invalid latitude')
    .max(90, 'Invalid latitude'),
  longitude: z.number()
    .min(-180, 'Invalid longitude')
    .max(180, 'Invalid longitude'),
});

/**
 * Sanitize HTML input to prevent XSS attacks
 * Strips all HTML tags and special characters
 */
export const sanitizeHtml = (input: string): string => {
  return input
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>]/g, '') // Remove angle brackets
    .trim();
};

/**
 * Validate and sanitize user input
 */
export const sanitizedStringSchema = (maxLength: number = 1000) => 
  z.string()
    .max(maxLength, `Text must be less than ${maxLength} characters`)
    .transform(sanitizeHtml);
