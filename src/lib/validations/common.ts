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
  .regex(/^[\d\s\-()+]+$/, 'Invalid phone number format')
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

/**
 * Form-field helpers (US-268). These validate without transforming: a form
 * converted to react-hook-form sends the value the user typed, exactly as the
 * useState version did, so the payload to Supabase does not change shape.
 */

/** A text field that must contain something other than whitespace. */
export const requiredText = (message: string, max?: number) => {
  const base = z.string().refine((v) => v.trim().length > 0, { message });
  return max === undefined
    ? base
    : base.refine((v) => v.length <= max, { message: `Must be ${max} characters or fewer` });
};

/** A required email address, checked but not lowercased or trimmed. */
export const emailField = z
  .string()
  .min(1, 'Email is required')
  .max(255, 'Email must be 255 characters or fewer')
  .email('Enter a valid email address');

/** An optional phone number: empty, or digits with the usual separators. */
export const optionalPhoneField = z
  .string()
  .refine(
    (v) => v === '' || (/^[\d\s\-()+]+$/.test(v) && v.replace(/\D/g, '').length >= 10 && v.length <= 20),
    { message: 'Enter a phone number with at least 10 digits' },
  );

/** A YYYY-MM-DD date from an <input type="date">. */
export const requiredDateField = (message: string) =>
  z.string().min(1, message).regex(/^\d{4}-\d{2}-\d{2}$/, 'Enter a valid date');

/** Empty, or a string that parses as a number within [min, max]. */
export const optionalNumericString = (opts: {
  min?: number;
  max?: number;
  integer?: boolean;
  message: string;
}) =>
  z.string().refine(
    (v) => {
      if (v.trim() === '') return true;
      const n = Number(v);
      if (!Number.isFinite(n)) return false;
      if (opts.integer && !Number.isInteger(n)) return false;
      if (opts.min !== undefined && n < opts.min) return false;
      if (opts.max !== undefined && n > opts.max) return false;
      return true;
    },
    { message: opts.message },
  );
