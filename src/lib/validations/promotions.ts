import { z } from 'zod';
import { requiredText } from './common';

/**
 * Admin Promotions create/edit dialog (US-268). Values are what the inputs
 * hold; the page still sends parseFloat(discount_percentage) and the
 * datetime-local strings as before.
 */
export const promotionFormSchema = z
  .object({
    name: requiredText('Campaign name is required'),
    description: z.string(),
    discount_percentage: z.string().refine(
      (v) => v.trim() !== '' && Number.isFinite(Number(v)) && Number(v) >= 1 && Number(v) <= 100,
      { message: 'Enter a discount from 1 to 100' },
    ),
    start_date: z.string().min(1, 'Start date and time are required'),
    end_date: z.string().min(1, 'End date and time are required'),
    is_active: z.boolean(),
    applies_to: z.array(z.string()),
    display_on: z.array(z.string()),
  })
  .refine((d) => !d.start_date || !d.end_date || d.end_date > d.start_date, {
    message: 'End must be after the start',
    path: ['end_date'],
  });
export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

export const PROMOTION_DEFAULTS: PromotionFormValues = {
  name: '',
  description: '',
  discount_percentage: '',
  start_date: '',
  end_date: '',
  is_active: true,
  applies_to: ['starter', 'professional', 'enterprise'],
  display_on: ['homepage', 'upgrade'],
};
