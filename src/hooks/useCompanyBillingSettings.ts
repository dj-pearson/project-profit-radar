/**
 * Reads and writes behind Company Settings > Billing and documents (US-266).
 *
 * The card read its three tables in one effect and, when a read failed,
 * toasted and then rendered the form anyway with empty defaults: a zero tax
 * rate, no terms, net 30. Pressing Save wrote those over the company's real
 * settings. A failed read throws now and the card shows the error instead of
 * the form. Writes are scoped to the company and read back; a write that
 * touched no row throws rather than reporting success.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { billingDefaultsKey } from './useBillingDefaults';
import type { BillingSettingsValues, DocumentType, NamedTaxRate } from '@/lib/companyBilling';

export interface NumberSetting {
  doc_type: DocumentType;
  prefix: string;
  include_year: boolean;
  pad_width: number;
  next_number: number;
}

export type NumberDraft = Omit<NumberSetting, 'doc_type'>;

export interface CompanyBillingSettingsData {
  /** Null when the company has never saved billing settings. */
  settings: BillingSettingsValues | null;
  taxRates: NamedTaxRate[];
  numbering: NumberSetting[];
}

/** Where each document type's numbers live, to check a new format against. */
export const NUMBERED: Record<DocumentType, { table: string; column: string }> = {
  invoice: { table: 'invoices', column: 'invoice_number' },
  estimate: { table: 'estimates', column: 'estimate_number' },
  change_order: { table: 'change_orders', column: 'change_order_number' },
  purchase_order: { table: 'purchase_orders', column: 'po_number' },
};

export const companyBillingSettingsKey = (companyId: string | undefined) =>
  ['company-billing-settings', companyId] as const;

export async function fetchCompanyBillingSettings(companyId: string): Promise<CompanyBillingSettingsData> {
  const [settingsRes, taxRes, numberRes] = await Promise.all([
    supabase
      .from('company_settings')
      .select('default_tax_rate, default_payment_terms_days, license_number, insurance_carrier, insurance_policy_number, insurance_expires_on, estimate_terms, invoice_terms, change_order_terms')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('tax_rates')
      .select('id, name, rate, applies_to, is_default, is_active')
      .eq('company_id', companyId)
      .order('name'),
    supabase
      .from('document_number_settings')
      .select('doc_type, prefix, include_year, pad_width, next_number')
      .eq('company_id', companyId),
  ]);
  const failure = [settingsRes, taxRes, numberRes].find((r) => r.error)?.error;
  if (failure) throw failure;

  const d = settingsRes.data as Record<string, unknown> | null;
  const settings: BillingSettingsValues | null = d
    ? {
        default_tax_rate: Number(d.default_tax_rate) || 0,
        default_payment_terms_days: Number(d.default_payment_terms_days ?? 30),
        license_number: (d.license_number as string) || '',
        insurance_carrier: (d.insurance_carrier as string) || '',
        insurance_policy_number: (d.insurance_policy_number as string) || '',
        insurance_expires_on: (d.insurance_expires_on as string) || '',
        estimate_terms: (d.estimate_terms as string) || '',
        invoice_terms: (d.invoice_terms as string) || '',
        change_order_terms: (d.change_order_terms as string) || '',
      }
    : null;
  return {
    settings,
    taxRates: (taxRes.data ?? []) as NamedTaxRate[],
    numbering: (numberRes.data ?? []) as NumberSetting[],
  };
}

const oneRow = (rows: unknown[] | null, what: string) => {
  if (!rows || rows.length === 0) throw new Error(`${what} was not saved. It may have been removed, or you may not have permission.`);
};

export async function saveCompanyBillingSettings(companyId: string, values: BillingSettingsValues): Promise<void> {
  const row = {
    company_id: companyId,
    ...values,
    insurance_expires_on: values.insurance_expires_on || null,
  };
  const { data, error } = await supabase
    .from('company_settings')
    // The generated Insert type has the Row's US-332 columns missing
    // (types.ts predates 20260903210000; US-369). Narrowed to the columns
    // it does know; the billing fields go through at runtime.
    .upsert(row as { company_id: string }, { onConflict: 'company_id' })
    .select('company_id');
  if (error) throw error;
  oneRow(data, 'The billing settings');
}

export async function addTaxRate(companyId: string, name: string, rate: number): Promise<void> {
  const { data, error } = await supabase
    .from('tax_rates')
    .insert({
      company_id: companyId,
      name,
      rate,
      // Never default-on: the partial unique index refuses a second default,
      // so an added rate must not claim it.
      is_default: false,
    })
    .select('id');
  if (error) throw error;
  oneRow(data, 'The tax rate');
}

export async function updateTaxRate(companyId: string, id: string, patch: Partial<NamedTaxRate>): Promise<void> {
  // Clear the old default first, or the partial unique index refuses the new one.
  if (patch.is_default) {
    const { error: clearError } = await supabase
      .from('tax_rates')
      .update({ is_default: false })
      .eq('company_id', companyId)
      .eq('is_default', true)
      .neq('id', id);
    if (clearError) throw clearError;
  }
  const { data, error } = await supabase
    .from('tax_rates')
    .update(patch)
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  oneRow(data, 'The tax rate');
}

export async function removeTaxRate(companyId: string, id: string): Promise<void> {
  const { data, error } = await supabase
    .from('tax_rates')
    .delete()
    .eq('id', id)
    .eq('company_id', companyId)
    .select('id');
  if (error) throw error;
  if (!data || data.length === 0) throw new Error('The tax rate was not removed. It may already be gone, or you may not have permission.');
}

/** True when `number` is already on one of the company's documents of this type. */
export async function documentNumberTaken(companyId: string, docType: DocumentType, number: string): Promise<boolean> {
  const target = NUMBERED[docType];
  // The table name comes from a fixed map, so the typed client cannot see
  // which table this is; the query itself is the same shape for all four.
  const { data, error } = await supabase
    .from(target.table as 'invoices')
    .select('id')
    .eq('company_id', companyId)
    .eq(target.column as 'invoice_number', number)
    .limit(1);
  if (error) throw error;
  return (data ?? []).length > 0;
}

/**
 * Write one document type's numbering. On an existing row only the changed
 * fields are sent: the whole row would write back a next_number read before
 * somebody else created an invoice, which the database refuses as a rewind.
 * The PostgREST error is thrown as-is so the caller can read its code.
 */
export async function writeNumberSetting(
  companyId: string,
  docType: DocumentType,
  existing: boolean,
  values: Partial<NumberDraft>,
): Promise<void> {
  const { data, error } = existing
    ? await supabase
        .from('document_number_settings')
        .update(values)
        .eq('company_id', companyId)
        .eq('doc_type', docType)
        .select('doc_type')
    : await supabase
        .from('document_number_settings')
        .insert({ company_id: companyId, doc_type: docType, ...(values as NumberDraft) })
        .select('doc_type');
  if (error) throw error;
  oneRow(data, 'The numbering');
}

export function useCompanyBillingSettings() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;
  const queryClient = useQueryClient();

  const query = useQuery({
    queryKey: companyBillingSettingsKey(companyId),
    queryFn: () => fetchCompanyBillingSettings(companyId as string),
    enabled: !!companyId,
  });

  // New documents read these through useBillingDefaults; tell it they moved.
  const invalidate = () => {
    void queryClient.invalidateQueries({ queryKey: companyBillingSettingsKey(companyId) });
    void queryClient.invalidateQueries({ queryKey: billingDefaultsKey(companyId) });
  };
  const need = () => {
    if (!companyId) throw new Error('Your profile is not linked to a company.');
    return companyId;
  };

  const saveSettings = useMutation({
    mutationFn: (values: BillingSettingsValues) => saveCompanyBillingSettings(need(), values),
    onSettled: invalidate,
  });
  const addRate = useMutation({
    mutationFn: (v: { name: string; rate: number }) => addTaxRate(need(), v.name, v.rate),
    onSettled: invalidate,
  });
  const updateRate = useMutation({
    mutationFn: (v: { id: string; patch: Partial<NamedTaxRate> }) => updateTaxRate(need(), v.id, v.patch),
    onSettled: invalidate,
  });
  const removeRate = useMutation({
    mutationFn: (id: string) => removeTaxRate(need(), id),
    onSettled: invalidate,
  });
  const saveNumbering = useMutation({
    mutationFn: (v: { docType: DocumentType; existing: boolean; values: Partial<NumberDraft> }) =>
      writeNumberSetting(need(), v.docType, v.existing, v.values),
    onSettled: invalidate,
  });

  return {
    companyId,
    data: query.data,
    isLoading: query.isLoading,
    error: query.error as Error | null,
    refetch: query.refetch,
    saveSettings,
    addRate,
    updateRate,
    removeRate,
    saveNumbering,
  };
}
