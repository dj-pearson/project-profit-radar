/**
 * The company billing settings a new estimate, invoice or change order starts
 * from (US-332): default tax rate and named rates, payment terms, terms per
 * document type, and the licence line and company name the PDFs print.
 *
 * Settings are entered once in Company Settings > Billing and documents; every
 * creation path reads them through here rather than hardcoding "30 days" and a
 * zero tax rate, which is what each form did before.
 */
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import {
  billingDefaultsFrom, FALLBACK_BILLING_DEFAULTS,
  type BillingDefaults, type NamedTaxRate,
} from '@/lib/companyBilling';

export interface PdfCompanyInfo {
  name: string;
  address?: string;
  licenseLine?: string;
}

export interface BillingDefaultsResult extends BillingDefaults {
  company: PdfCompanyInfo | null;
}

export const billingDefaultsKey = (companyId: string | undefined) =>
  ['billing-defaults', companyId] as const;

export async function fetchBillingDefaults(companyId: string): Promise<BillingDefaultsResult> {
  const [settingsRes, ratesRes, companyRes] = await Promise.all([
    supabase
      .from('company_settings')
      .select('default_tax_rate, default_payment_terms_days, license_number, insurance_carrier, insurance_policy_number, estimate_terms, invoice_terms, change_order_terms')
      .eq('company_id', companyId)
      .maybeSingle(),
    supabase
      .from('tax_rates')
      .select('id, name, rate, applies_to, is_default, is_active')
      .eq('company_id', companyId)
      .order('name'),
    supabase
      .from('companies')
      .select('name, address')
      .eq('id', companyId)
      .maybeSingle(),
  ]);

  // A form that silently starts from zero tax because the settings read failed
  // would under-charge without anyone noticing, so a failure is an error the
  // caller shows, not an empty default.
  const failure = settingsRes.error ?? ratesRes.error ?? companyRes.error;
  if (failure) throw failure;

  const defaults = billingDefaultsFrom(
    settingsRes.data as Parameters<typeof billingDefaultsFrom>[0],
    (ratesRes.data ?? []) as NamedTaxRate[],
  );
  const company = companyRes.data
    ? {
        name: companyRes.data.name,
        address: companyRes.data.address ?? undefined,
        licenseLine: defaults.licenceLine || undefined,
      }
    : null;
  return { ...defaults, company };
}

export function useBillingDefaults() {
  const { userProfile } = useAuth();
  const companyId = userProfile?.company_id ?? undefined;

  const query = useQuery({
    queryKey: billingDefaultsKey(companyId),
    queryFn: () => fetchBillingDefaults(companyId as string),
    enabled: !!companyId,
    staleTime: 60_000,
  });

  return {
    defaults: query.data ?? { ...FALLBACK_BILLING_DEFAULTS, company: null },
    /** True once the company's own settings have arrived. */
    loaded: query.isSuccess,
    isLoading: query.isLoading,
    error: query.error,
  };
}
