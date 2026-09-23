import { z } from 'zod';
import {
  optionalAmountField,
  optionalEmailField,
  optionalNumericString,
  requiredAmountField,
  requiredDateField,
  requiredText,
  numericDefault,
} from './common';

/**
 * Bonds and insurance forms (US-268). Amounts stay the strings the number
 * inputs hold; the builders parse them exactly as the useState versions did.
 */

const endAfterStart = <T extends { effective_date: string; expiry_date: string }>(d: T) =>
  !d.effective_date || !d.expiry_date || d.expiry_date > d.effective_date;
const END_AFTER_START = { message: 'Expiry date must be after the effective date', path: ['expiry_date'] };

/* eslint-disable @typescript-eslint/no-explicit-any -- rows come from untyped supabase selects */

export const bondFormSchema = z
  .object({
    project_id: z.string(),
    bond_type: z.string(),
    bond_number: requiredText('Bond number is required', 100),
    bond_name: requiredText('Bond name is required', 200),
    description: z.string(),
    bond_amount: requiredAmountField('Enter a bond amount of 0 or more'),
    premium_amount: optionalAmountField,
    bond_percentage: optionalNumericString({ min: 0, max: 100, message: 'Enter a percentage from 0 to 100' }),
    principal_name: requiredText('Principal is required', 200),
    obligee_name: requiredText('Obligee is required', 200),
    surety_company: requiredText('Surety company is required', 200),
    surety_contact_name: z.string(),
    surety_contact_phone: z.string(),
    surety_contact_email: optionalEmailField,
    agent_company: z.string(),
    agent_name: z.string(),
    agent_phone: z.string(),
    agent_email: optionalEmailField,
    effective_date: requiredDateField('Effective date is required'),
    expiry_date: requiredDateField('Expiry date is required'),
    issued_date: z.string(),
    status: z.string(),
    notes: z.string(),
    claim_made: z.boolean(),
    claim_amount: optionalAmountField,
    claim_date: z.string(),
    claim_status: z.string().nullable(),
    claim_notes: z.string(),
  })
  .refine(endAfterStart, END_AFTER_START);
export type BondFormValues = z.infer<typeof bondFormSchema>;

export const bondFormDefaults = (bond?: any): BondFormValues => ({
  project_id: bond?.project_id || '',
  bond_type: bond?.bond_type || 'performance',
  bond_number: bond?.bond_number || '',
  bond_name: bond?.bond_name || '',
  description: bond?.description || '',
  bond_amount: numericDefault(bond?.bond_amount, 0),
  premium_amount: numericDefault(bond?.premium_amount, 0),
  bond_percentage: numericDefault(bond?.bond_percentage, 100),
  principal_name: bond?.principal_name || '',
  obligee_name: bond?.obligee_name || '',
  surety_company: bond?.surety_company || '',
  surety_contact_name: bond?.surety_contact_name || '',
  surety_contact_phone: bond?.surety_contact_phone || '',
  surety_contact_email: bond?.surety_contact_email || '',
  agent_company: bond?.agent_company || '',
  agent_name: bond?.agent_name || '',
  agent_phone: bond?.agent_phone || '',
  agent_email: bond?.agent_email || '',
  effective_date: bond?.effective_date || '',
  expiry_date: bond?.expiry_date || '',
  issued_date: bond?.issued_date || '',
  status: bond?.status || 'pending',
  notes: bond?.notes || '',
  claim_made: bond?.claim_made || false,
  claim_amount: numericDefault(bond?.claim_amount, 0),
  claim_date: bond?.claim_date || '',
  claim_status: bond?.claim_status || null,
  claim_notes: bond?.claim_notes || '',
});

/** The bonds row the useState BondForm wrote. */
export const buildBondData = (
  v: BondFormValues,
  profile: { company_id?: string | null; id?: string | null } | null | undefined,
) => ({
  company_id: profile?.company_id,
  created_by: profile?.id,
  project_id: v.project_id || null,
  bond_type: v.bond_type,
  bond_number: v.bond_number,
  bond_name: v.bond_name,
  description: v.description,
  bond_amount: parseFloat(v.bond_amount.toString()) || 0,
  premium_amount: parseFloat(v.premium_amount.toString()) || 0,
  bond_percentage: parseFloat(v.bond_percentage.toString()) || 100,
  principal_name: v.principal_name,
  obligee_name: v.obligee_name,
  surety_company: v.surety_company,
  surety_contact_name: v.surety_contact_name,
  surety_contact_phone: v.surety_contact_phone,
  surety_contact_email: v.surety_contact_email,
  agent_company: v.agent_company,
  agent_name: v.agent_name,
  agent_phone: v.agent_phone,
  agent_email: v.agent_email,
  effective_date: v.effective_date || null,
  expiry_date: v.expiry_date || null,
  issued_date: v.issued_date || null,
  status: v.status,
  notes: v.notes,
  claim_made: v.claim_made,
  claim_amount: parseFloat(v.claim_amount.toString()) || 0,
  claim_date: v.claim_date || null,
  claim_status: v.claim_status,
  claim_notes: v.claim_notes,
});

export const insuranceFormSchema = z
  .object({
    policy_type: z.string(),
    policy_number: requiredText('Policy number is required', 100),
    policy_name: requiredText('Policy name is required', 200),
    description: z.string(),
    coverage_limit: requiredAmountField('Enter a coverage limit of 0 or more'),
    deductible: optionalAmountField,
    aggregate_limit: optionalAmountField,
    per_occurrence_limit: optionalAmountField,
    premium_amount: optionalAmountField,
    insurance_company: requiredText('Insurance company is required', 200),
    insurance_company_rating: z.string(),
    carrier_contact_name: z.string(),
    carrier_contact_phone: z.string(),
    carrier_contact_email: optionalEmailField,
    agent_company: z.string(),
    agent_name: z.string(),
    agent_phone: z.string(),
    agent_email: optionalEmailField,
    effective_date: requiredDateField('Effective date is required'),
    expiry_date: requiredDateField('Expiry date is required'),
    issued_date: z.string(),
    status: z.string(),
    additional_insured_required: z.boolean(),
    waiver_of_subrogation: z.boolean(),
    primary_non_contributory: z.boolean(),
    notes: z.string(),
    // Not on the form; carried through so an edit writes back what it read.
    claims_made: z.boolean(),
    total_claims_amount: z.string(),
    claims_count: z.string(),
  })
  .refine(endAfterStart, END_AFTER_START);
export type InsuranceFormValues = z.infer<typeof insuranceFormSchema>;

export const insuranceFormDefaults = (insurance?: any): InsuranceFormValues => ({
  policy_type: insurance?.policy_type || 'general_liability',
  policy_number: insurance?.policy_number || '',
  policy_name: insurance?.policy_name || '',
  description: insurance?.description || '',
  coverage_limit: numericDefault(insurance?.coverage_limit, 0),
  deductible: numericDefault(insurance?.deductible, 0),
  aggregate_limit: numericDefault(insurance?.aggregate_limit, 0),
  per_occurrence_limit: numericDefault(insurance?.per_occurrence_limit, 0),
  premium_amount: numericDefault(insurance?.premium_amount, 0),
  insurance_company: insurance?.insurance_company || '',
  insurance_company_rating: insurance?.insurance_company_rating || '',
  carrier_contact_name: insurance?.carrier_contact_name || '',
  carrier_contact_phone: insurance?.carrier_contact_phone || '',
  carrier_contact_email: insurance?.carrier_contact_email || '',
  agent_company: insurance?.agent_company || '',
  agent_name: insurance?.agent_name || '',
  agent_phone: insurance?.agent_phone || '',
  agent_email: insurance?.agent_email || '',
  effective_date: insurance?.effective_date || '',
  expiry_date: insurance?.expiry_date || '',
  issued_date: insurance?.issued_date || '',
  status: insurance?.status || 'pending',
  additional_insured_required: insurance?.additional_insured_required || false,
  waiver_of_subrogation: insurance?.waiver_of_subrogation || false,
  primary_non_contributory: insurance?.primary_non_contributory || false,
  notes: insurance?.notes || '',
  claims_made: insurance?.claims_made || false,
  total_claims_amount: numericDefault(insurance?.total_claims_amount, 0),
  claims_count: numericDefault(insurance?.claims_count, 0),
});

/** The insurance_policies row the useState InsuranceForm wrote. */
export const buildInsuranceData = (
  v: InsuranceFormValues,
  profile: { company_id?: string | null; id?: string | null } | null | undefined,
) => ({
  ...v,
  company_id: profile?.company_id,
  created_by: profile?.id,
  coverage_limit: parseFloat(v.coverage_limit.toString()) || 0,
  deductible: parseFloat(v.deductible.toString()) || 0,
  aggregate_limit: parseFloat(v.aggregate_limit.toString()) || 0,
  per_occurrence_limit: parseFloat(v.per_occurrence_limit.toString()) || 0,
  premium_amount: parseFloat(v.premium_amount.toString()) || 0,
  total_claims_amount: parseFloat(v.total_claims_amount.toString()) || 0,
  claims_count: parseInt(v.claims_count.toString()) || 0,
});
/* eslint-enable @typescript-eslint/no-explicit-any */
