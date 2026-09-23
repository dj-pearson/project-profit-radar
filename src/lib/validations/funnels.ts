import { z } from 'zod';
import { requiredText } from './common';

/**
 * Lead funnel forms (US-268): admin FunnelManager "Create New Funnel" and
 * FunnelStepBuilder "Add Funnel Step". Both used to read uncontrolled inputs
 * through FormData; the payload builders keep that exact shape.
 */

export const funnelFormSchema = z.object({
  name: requiredText('Funnel name is required', 200),
  description: z.string().max(2000, 'Must be 2000 characters or fewer'),
  trigger_event: z.string().min(1, 'Select a trigger event'),
});
export type FunnelFormValues = z.infer<typeof funnelFormSchema>;

export const FUNNEL_FORM_DEFAULTS: FunnelFormValues = { name: '', description: '', trigger_event: '' };

export const funnelStepFormSchema = z.object({
  name: requiredText('Step name is required', 200),
  email_template_id: z.string().min(1, 'Select an email template'),
  delay_amount: z
    .string()
    .refine((v) => /^\d+$/.test(v.trim()), { message: 'Enter a whole number of 0 or more' }),
  delay_unit: z.string(),
});
export type FunnelStepFormValues = z.infer<typeof funnelStepFormSchema>;

export const FUNNEL_STEP_DEFAULTS: FunnelStepFormValues = {
  name: '',
  email_template_id: '',
  delay_amount: '0',
  delay_unit: 'days',
};

/** The funnel_steps insert fields the FormData version sent. */
export const buildFunnelStepData = (v: FunnelStepFormValues) => ({
  name: v.name,
  email_template_id: v.email_template_id,
  delay_amount: parseInt(v.delay_amount),
  delay_unit: v.delay_unit,
});
