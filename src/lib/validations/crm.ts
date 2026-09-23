import { z } from 'zod';
import { emailField, optionalNumericString, requiredText } from './common';

/** CRM dialogs (US-268): lead edit, opportunity edit, booking page create. */

export const leadEditFormSchema = z.object({
  first_name: requiredText('First name is required', 100),
  last_name: requiredText('Last name is required', 100),
  email: emailField,
  phone: requiredText('Phone is required', 30),
  company_name: z.string(),
  project_name: z.string(),
  project_type: z.string(),
  estimated_budget: optionalNumericString({ min: 0, message: 'Enter a budget of 0 or more' }),
  status: z.string(),
  priority: z.string(),
  lead_source: z.string(),
  next_follow_up_date: z.string(),
});
export type LeadEditFormValues = z.infer<typeof leadEditFormSchema>;

interface LeadLike {
  first_name: string;
  last_name: string;
  email: string;
  phone: string;
  company_name?: string;
  project_name?: string;
  project_type?: string;
  estimated_budget?: number;
  status: string;
  priority: string;
  lead_source: string;
  next_follow_up_date?: string;
}

export const leadEditDefaults = (lead: LeadLike): LeadEditFormValues => ({
  first_name: lead.first_name ?? '',
  last_name: lead.last_name ?? '',
  email: lead.email ?? '',
  phone: lead.phone ?? '',
  company_name: lead.company_name || '',
  project_name: lead.project_name || '',
  project_type: lead.project_type || '',
  estimated_budget: String(lead.estimated_budget || 0),
  status: lead.status,
  priority: lead.priority,
  lead_source: lead.lead_source,
  next_follow_up_date: lead.next_follow_up_date || '',
});

/** The onUpdate argument the useState dialog passed. */
export const buildLeadUpdates = (v: LeadEditFormValues) => ({
  ...v,
  estimated_budget: Number(v.estimated_budget),
});

export const opportunityEditFormSchema = z.object({
  name: requiredText('Opportunity name is required', 200),
  estimated_value: z
    .string()
    .refine((v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 0, {
      message: 'Enter a value of 0 or more',
    }),
  probability_percent: z
    .string()
    .refine((v) => v.trim() !== '' && Number(v) >= 0 && Number(v) <= 100, {
      message: 'Enter a probability from 0 to 100',
    }),
  stage: z.string(),
  expected_close_date: z.string(),
  account_manager: z.string(),
  project_type: z.string(),
});
export type OpportunityEditFormValues = z.infer<typeof opportunityEditFormSchema>;

interface OpportunityLike {
  name: string;
  estimated_value: number;
  probability_percent: number;
  stage: string;
  expected_close_date?: string;
  account_manager?: string;
  project_type?: string;
}

export const opportunityEditDefaults = (o: OpportunityLike): OpportunityEditFormValues => ({
  name: o.name ?? '',
  estimated_value: String(o.estimated_value ?? ''),
  probability_percent: String(o.probability_percent ?? ''),
  stage: o.stage,
  expected_close_date: o.expected_close_date || '',
  account_manager: o.account_manager || '',
  project_type: o.project_type || '',
});

export const buildOpportunityUpdates = (v: OpportunityEditFormValues) => ({
  ...v,
  estimated_value: Number(v.estimated_value),
  probability_percent: Number(v.probability_percent),
});

export const slugify = (title: string) =>
  title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');

export const bookingPageFormSchema = z.object({
  title: requiredText('Page title is required', 200),
  slug: z
    .string()
    .min(1, 'URL slug is required')
    .max(100, 'Must be 100 characters or fewer')
    .regex(/^[a-z0-9-]+$/, 'Use lowercase letters, numbers and hyphens'),
  description: z.string().max(2000, 'Must be 2000 characters or fewer'),
  duration_minutes: z
    .string()
    .refine((v) => /^\d+$/.test(v.trim()) && Number(v) >= 15, { message: 'Enter at least 15 minutes' }),
  location_type: z.string(),
  is_active: z.boolean(),
});
export type BookingPageFormValues = z.infer<typeof bookingPageFormSchema>;

export const BOOKING_PAGE_DEFAULTS: BookingPageFormValues = {
  title: '',
  slug: '',
  description: '',
  duration_minutes: '30',
  location_type: 'video_zoom',
  is_active: true,
};

/** The booking_pages fields the useState form inserted (before user_id). */
export const buildBookingPageData = (v: BookingPageFormValues) => ({
  ...v,
  duration_minutes: parseInt(v.duration_minutes),
});
