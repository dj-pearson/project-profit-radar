import { z } from 'zod';
import { emailField, requiredText } from './common';

/**
 * Public lead forms (US-268). The limits mirror what the receiving edge
 * function's Zod schema accepts (handle-sales-contact, capture-lead), so a
 * visitor sees the problem next to the field instead of a failed request.
 * Nothing here transforms: the payloads are the values as typed.
 */

const maxLen = (max: number) =>
  z.string().max(max, `Must be ${max} characters or fewer`);

/** Contact Sales modal -> handle-sales-contact. */
export const contactSalesSchema = z.object({
  firstName: requiredText('First name is required', 100),
  lastName: requiredText('Last name is required', 100),
  email: emailField,
  phone: maxLen(20),
  companyName: requiredText('Company name is required', 200),
  companySize: maxLen(50),
  industry: maxLen(100),
  inquiryType: maxLen(50),
  message: requiredText('Tell us what you need', 5000),
  estimatedBudget: maxLen(50),
  timeline: maxLen(100),
});
export type ContactSalesValues = z.infer<typeof contactSalesSchema>;

export const CONTACT_SALES_DEFAULTS: ContactSalesValues = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  companyName: '',
  companySize: '',
  industry: '',
  inquiryType: 'general',
  message: '',
  estimatedBudget: '',
  timeline: '',
};

/** Profitability calculator report modal -> capture-lead. */
export const emailCaptureSchema = z.object({
  email: emailField,
  companyName: maxLen(200),
  phone: maxLen(20),
});
export type EmailCaptureValues = z.infer<typeof emailCaptureSchema>;

/** Footer newsletter box -> capture-lead. Surrounding spaces are ignored, as before. */
export const newsletterSchema = z.object({
  email: z.string().refine((v) => emailField.safeParse(v.trim()).success, {
    message: 'Enter a valid email address',
  }),
});
export type NewsletterValues = z.infer<typeof newsletterSchema>;

/** Public booking page attendee details -> bookings (all TEXT columns, no length limit). */
export const publicBookingSchema = z.object({
  name: requiredText('Enter your name'),
  email: emailField,
  phone: z.string(),
  notes: z.string(),
});
export type PublicBookingValues = z.infer<typeof publicBookingSchema>;
