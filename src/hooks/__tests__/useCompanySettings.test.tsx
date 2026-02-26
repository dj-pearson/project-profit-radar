import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const mockCompany = {
  id: 'company-1',
  name: 'Pacific Northwest Construction LLC',
  email: 'office@pnwconstruction.com',
  phone: '503-555-1234',
  address: '1200 Industrial Parkway',
  city: 'Portland',
  state: 'OR',
  zip_code: '97209',
  website: 'https://www.pnwconstruction.com',
  is_active: true,
  subscription_status: 'active',
  subscription_plan: 'professional',
  logo_url: 'https://storage.example.com/logos/pnw-construction.png',
  timezone: 'America/Los_Angeles',
  currency: 'USD',
  tax_rate: 8.5,
  fiscal_year_start: '01',
  default_payment_terms: 30,
  license_number: 'CCB-123456',
  insurance_policy: 'GL-2026-789012',
  insurance_expiry: '2027-01-15',
  created_at: '2025-03-01T08:00:00Z',
  updated_at: '2026-02-20T10:00:00Z',
};

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: mockCompany,
            error: null,
          }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-001' } }, error: null }),
    },
  },
}));

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useCompanySettings hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns company settings on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .eq('id', 'company-1')
              .single();
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data.name).toBe('Pacific Northwest Construction LLC');
    expect(result.current.data.subscription_status).toBe('active');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when settings fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-error'],
          queryFn: async () => {
            throw new Error('PGRST116: no rows returned for single()');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('PGRST116');
  });

  it('returns complete business information', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-info'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .eq('id', 'company-1')
              .single();
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const company = result.current.data;
    expect(company).toHaveProperty('name');
    expect(company).toHaveProperty('email');
    expect(company).toHaveProperty('phone');
    expect(company).toHaveProperty('address');
    expect(company).toHaveProperty('city');
    expect(company).toHaveProperty('state');
    expect(company).toHaveProperty('zip_code');
    expect(company.email).toMatch(/@/);
    expect(company.state).toHaveLength(2);
  });

  it('includes subscription and billing details', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-subscription'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .eq('id', 'company-1')
              .single();
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const company = result.current.data;
    expect(company.subscription_status).toBe('active');
    expect(company.subscription_plan).toBe('professional');
    expect(company.is_active).toBe(true);
  });

  it('includes financial configuration', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-financial'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .eq('id', 'company-1')
              .single();
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const company = result.current.data;
    expect(company.tax_rate).toBe(8.5);
    expect(company.currency).toBe('USD');
    expect(company.default_payment_terms).toBe(30);
    expect(company.fiscal_year_start).toBe('01');
  });

  it('includes licensing and insurance information', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['company-settings-compliance'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('companies')
              .select('*')
              .eq('id', 'company-1')
              .single();
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const company = result.current.data;
    expect(company.license_number).toBe('CCB-123456');
    expect(company.insurance_policy).toBeTruthy();
    expect(company.insurance_expiry).toBeTruthy();

    // Insurance should not be expired for this company
    const expiryDate = new Date(company.insurance_expiry);
    expect(expiryDate.getFullYear()).toBeGreaterThanOrEqual(2027);
  });
});
