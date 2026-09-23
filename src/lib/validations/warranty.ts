import { z } from 'zod';
import { numericDefault, optionalAmountField, optionalEmailField, requiredDateField, requiredText } from './common';

/** Warranty and warranty-claim forms (US-268). */

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from untyped supabase selects */

type Profile = { company_id?: string | null; id?: string | null } | null | undefined;

export const warrantyFormSchema = z.object({
  warranty_type: z.string(),
  item_name: requiredText('Item name is required', 200),
  item_description: z.string(),
  manufacturer: z.string(),
  model_number: z.string(),
  serial_number: z.string(),
  project_id: z.string(),
  vendor_id: z.string(),
  purchase_order_id: z.string(),
  warranty_duration_months: z.string().refine((v) => /^\d+$/.test(v) && Number(v) > 0, {
    message: 'Select a warranty duration',
  }),
  warranty_start_date: requiredDateField('Start date is required'),
  installation_date: z.string(),
  coverage_details: z.string(),
  coverage_limitations: z.string(),
  is_transferable: z.boolean(),
  warranty_contact_name: z.string(),
  warranty_contact_phone: z.string(),
  warranty_contact_email: optionalEmailField,
  notes: z.string(),
});
export type WarrantyFormValues = z.infer<typeof warrantyFormSchema>;

export const warrantyFormDefaults = (warranty?: any, projectId?: string): WarrantyFormValues => ({
  warranty_type: warranty?.warranty_type || 'material',
  item_name: warranty?.item_name || '',
  item_description: warranty?.item_description || '',
  manufacturer: warranty?.manufacturer || '',
  model_number: warranty?.model_number || '',
  serial_number: warranty?.serial_number || '',
  project_id: warranty?.project_id || projectId || '',
  vendor_id: warranty?.vendor_id || '',
  purchase_order_id: warranty?.purchase_order_id || '',
  warranty_duration_months: numericDefault(warranty?.warranty_duration_months, 12),
  warranty_start_date: warranty?.warranty_start_date || '',
  installation_date: warranty?.installation_date || '',
  coverage_details: warranty?.coverage_details || '',
  coverage_limitations: warranty?.coverage_limitations || '',
  is_transferable: warranty?.is_transferable || false,
  warranty_contact_name: warranty?.warranty_contact_name || '',
  warranty_contact_phone: warranty?.warranty_contact_phone || '',
  warranty_contact_email: warranty?.warranty_contact_email || '',
  notes: warranty?.notes || '',
});

/** The warranties row the useState WarrantyForm wrote. */
export const buildWarrantyData = (v: WarrantyFormValues, profile: Profile) => ({
  ...v,
  warranty_duration_months: parseInt(v.warranty_duration_months),
  // Handle empty strings for UUID fields
  project_id: v.project_id || null,
  vendor_id: v.vendor_id || null,
  purchase_order_id: v.purchase_order_id || null,
  // Handle empty strings for date fields
  warranty_start_date: v.warranty_start_date || null,
  installation_date: v.installation_date || null,
  company_id: profile?.company_id,
  created_by: profile?.id,
});

export const warrantyClaimFormSchema = z.object({
  warranty_id: z.string().min(1, 'Select a warranty'),
  issue_description: requiredText('Describe the issue', 5000),
  issue_category: z.string(),
  severity: z.string(),
  claimant_name: requiredText('Claimant name is required', 200),
  claimant_contact: z.string(),
  claimant_email: optionalEmailField,
  claim_date: requiredDateField('Claim date is required'),
  status: z.string(),
  resolution_type: z.string(),
  resolution_details: z.string(),
  resolution_cost: optionalAmountField,
  resolved_date: z.string(),
  resolved_by: z.string(),
});
export type WarrantyClaimFormValues = z.infer<typeof warrantyClaimFormSchema>;

export const warrantyClaimFormDefaults = (claim?: any): WarrantyClaimFormValues => ({
  warranty_id: claim?.warranty_id || '',
  issue_description: claim?.issue_description || '',
  issue_category: claim?.issue_category || 'defect',
  severity: claim?.severity || 'medium',
  claimant_name: claim?.claimant_name || '',
  claimant_contact: claim?.claimant_contact || '',
  claimant_email: claim?.claimant_email || '',
  claim_date: claim?.claim_date || new Date().toISOString().split('T')[0],
  status: claim?.status || 'submitted',
  resolution_type: claim?.resolution_type || '',
  resolution_details: claim?.resolution_details || '',
  resolution_cost: numericDefault(claim?.resolution_cost, 0),
  resolved_date: claim?.resolved_date || '',
  resolved_by: claim?.resolved_by || '',
});

/** The warranty_claims update the useState WarrantyClaimForm sent. */
export const buildWarrantyClaimUpdate = (v: WarrantyClaimFormValues, profile: Profile) => ({
  ...v,
  created_by: profile?.id,
  resolution_cost: parseFloat(v.resolution_cost.toString()) || 0,
});

/** The warranty_claims insert; claim_number is filled by a trigger. */
export const buildWarrantyClaimInsert = (v: WarrantyClaimFormValues, profile: Profile) => ({
  warranty_id: v.warranty_id,
  issue_description: v.issue_description,
  issue_category: v.issue_category,
  severity: v.severity,
  claimant_name: v.claimant_name,
  claimant_contact: v.claimant_contact,
  claimant_email: v.claimant_email,
  claim_date: v.claim_date,
  status: v.status,
  resolution_type: v.resolution_type,
  resolution_details: v.resolution_details,
  resolved_date: v.resolved_date,
  resolved_by: v.resolved_by,
  created_by: profile?.id,
  resolution_cost: parseFloat(v.resolution_cost.toString()) || 0,
  claim_number: '', // Required by types but will be auto-generated
});
/* eslint-enable @typescript-eslint/no-explicit-any */
