/**
 * US-332: what every creation path reads the company billing settings through.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const h = vi.hoisted(() => ({ results: {} as Record<string, { data: unknown; error: unknown }> }));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: (table: string) => {
      const res = () => h.results[table];
      const q: Record<string, unknown> = {
        select: () => q,
        eq: () => q,
        order: () => Promise.resolve(res()),
        maybeSingle: () => Promise.resolve(res()),
      };
      return q;
    },
  },
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ userProfile: null }) }));

import { fetchBillingDefaults } from '../useBillingDefaults';

beforeEach(() => {
  h.results = {
    company_settings: {
      data: {
        default_tax_rate: 8.25, default_payment_terms_days: 15, license_number: 'CCB-123456',
        insurance_carrier: 'Acme Mutual', insurance_policy_number: 'GL-9',
        estimate_terms: 'Valid 30 days', invoice_terms: null, change_order_terms: null,
      },
      error: null,
    },
    tax_rates: {
      data: [{ id: 'r1', name: 'County', rate: 7.5, applies_to: 'all', is_default: true, is_active: true }],
      error: null,
    },
    companies: { data: { name: 'Reyes Builders', address: '12 Oak St' }, error: null },
  };
});

describe('fetchBillingDefaults', () => {
  it('reduces the settings to what a new document needs, with the PDF header', async () => {
    const d = await fetchBillingDefaults('company-a');
    expect(d.taxRate).toBe(7.5);
    expect(d.paymentTermsDays).toBe(15);
    expect(d.terms.estimate).toBe('Valid 30 days');
    expect(d.company).toEqual({
      name: 'Reyes Builders',
      address: '12 Oak St',
      licenseLine: 'Licence CCB-123456 | Insured by Acme Mutual (policy GL-9)',
    });
  });

  it('falls back to Net 30 and no tax for a company with no settings row', async () => {
    h.results.company_settings = { data: null, error: null };
    h.results.tax_rates = { data: [], error: null };
    const d = await fetchBillingDefaults('company-a');
    expect(d.taxRate).toBe(0);
    expect(d.paymentTermsDays).toBe(30);
    expect(d.company?.licenseLine).toBeUndefined();
  });

  it('throws on a failed read rather than quietly starting from zero tax', async () => {
    h.results.tax_rates = { data: null, error: { message: 'permission denied' } };
    await expect(fetchBillingDefaults('company-a')).rejects.toMatchObject({ message: 'permission denied' });
  });
});
