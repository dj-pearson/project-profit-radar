import { z } from 'zod';
import { numericDefault, optionalAmountField, optionalEmailField, requiredText } from './common';

/**
 * Permit create/edit form (US-268). Dates the user never touched were
 * undefined in the useState version and so left out of the row; the builder
 * maps an empty date back to undefined to keep that.
 */

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from untyped supabase selects */

export const permitFormSchema = z
  .object({
    project_id: z.string().min(1, 'Select a project'),
    permit_type: z.string().min(1, 'Select a permit type'),
    permit_name: requiredText('Permit name is required', 200),
    permit_number: z.string().max(100, 'Must be 100 characters or fewer'),
    description: z.string(),
    issuing_authority: requiredText('Issuing authority is required', 200),
    application_date: z.string(),
    application_fee: optionalAmountField,
    application_status: z.string(),
    approval_date: z.string(),
    permit_fee: optionalAmountField,
    permit_start_date: z.string(),
    permit_expiry_date: z.string(),
    contact_name: z.string(),
    contact_phone: z.string(),
    contact_email: optionalEmailField,
    conditions: z.string(),
    inspection_required: z.boolean(),
    bond_required: z.boolean(),
    bond_amount: optionalAmountField,
    priority: z.string(),
    notes: z.string(),
  })
  .refine((d) => !d.permit_start_date || !d.permit_expiry_date || d.permit_expiry_date >= d.permit_start_date, {
    message: 'Expiry date cannot be before the start date',
    path: ['permit_expiry_date'],
  });
export type PermitFormValues = z.infer<typeof permitFormSchema>;

export const permitFormDefaults = (permit?: any, projectId?: string): PermitFormValues => ({
  project_id: permit?.project_id || projectId || '',
  permit_type: permit?.permit_type || '',
  permit_name: permit?.permit_name || '',
  permit_number: permit?.permit_number || '',
  description: permit?.description || '',
  issuing_authority: permit?.issuing_authority || '',
  application_date: permit?.application_date || '',
  application_fee: numericDefault(permit?.application_fee, 0),
  application_status: permit?.application_status || 'not_applied',
  approval_date: permit?.approval_date || '',
  permit_fee: numericDefault(permit?.permit_fee, 0),
  permit_start_date: permit?.permit_start_date || '',
  permit_expiry_date: permit?.permit_expiry_date || '',
  contact_name: permit?.contact_name || '',
  contact_phone: permit?.contact_phone || '',
  contact_email: permit?.contact_email || '',
  conditions: permit?.conditions || '',
  inspection_required: permit?.inspection_required || false,
  bond_required: permit?.bond_required || false,
  bond_amount: numericDefault(permit?.bond_amount, 0),
  priority: permit?.priority || 'medium',
  notes: permit?.notes || '',
});

/** The permits row the useState PermitForm wrote. */
export const buildPermitData = (
  v: PermitFormValues,
  profile: { company_id?: string | null; id?: string | null } | null | undefined,
) => ({
  ...v,
  application_date: v.application_date || undefined,
  approval_date: v.approval_date || undefined,
  permit_start_date: v.permit_start_date || undefined,
  permit_expiry_date: v.permit_expiry_date || undefined,
  company_id: profile?.company_id,
  created_by: profile?.id,
  application_fee: parseFloat(v.application_fee.toString()) || 0,
  permit_fee: parseFloat(v.permit_fee.toString()) || 0,
  bond_amount: parseFloat(v.bond_amount.toString()) || 0,
});
/* eslint-enable @typescript-eslint/no-explicit-any */
