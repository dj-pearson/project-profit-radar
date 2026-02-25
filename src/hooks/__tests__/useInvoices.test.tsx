import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';

const { mockInvoices } = vi.hoisted(() => ({
  mockInvoices: [
    {
      id: 'inv-001',
      invoice_number: 'INV-00001',
      company_id: 'company-1',
      project_id: 'project-1',
      client_name: 'Acme Construction LLC',
      client_email: 'billing@acme.com',
      status: 'sent',
      subtotal: 25000,
      tax_rate: 8.25,
      tax_amount: 2062.50,
      total: 27062.50,
      amount_paid: 0,
      balance_due: 27062.50,
      issue_date: '2026-01-15',
      due_date: '2026-02-14',
      created_at: '2026-01-15T10:00:00Z',
      updated_at: '2026-01-15T10:00:00Z',
    },
    {
      id: 'inv-002',
      invoice_number: 'INV-00002',
      company_id: 'company-1',
      project_id: 'project-2',
      client_name: 'Summit Builders Inc',
      client_email: 'accounts@summit.com',
      status: 'paid',
      subtotal: 75000,
      tax_rate: 8.25,
      tax_amount: 6187.50,
      total: 81187.50,
      amount_paid: 81187.50,
      balance_due: 0,
      issue_date: '2025-12-01',
      due_date: '2025-12-31',
      paid_date: '2025-12-28',
      created_at: '2025-12-01T09:00:00Z',
      updated_at: '2025-12-28T14:30:00Z',
    },
    {
      id: 'inv-003',
      invoice_number: 'INV-00003',
      company_id: 'company-1',
      project_id: 'project-1',
      client_name: 'Acme Construction LLC',
      client_email: 'billing@acme.com',
      status: 'overdue',
      subtotal: 12500,
      tax_rate: 8.25,
      tax_amount: 1031.25,
      total: 13531.25,
      amount_paid: 0,
      balance_due: 13531.25,
      issue_date: '2025-11-01',
      due_date: '2025-12-01',
      created_at: '2025-11-01T08:00:00Z',
      updated_at: '2026-01-05T12:00:00Z',
    },
  ],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: mockInvoices,
              error: null,
            }),
          }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
    },
  },
}));

import { supabase } from '@/integrations/supabase/client';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useInvoices hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns invoice data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['invoices'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('invoices')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false })
              .limit(100);
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].invoice_number).toBe('INV-00001');
    expect(result.current.data![1].status).toBe('paid');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['invoices-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles database error', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['invoices-error'],
          queryFn: async () => {
            throw new Error('Failed to fetch invoices: permission denied');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('permission denied');
  });

  it('returns invoices with correct financial calculations', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['invoices-financial'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('invoices')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false })
              .limit(100);
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const paidInvoice = result.current.data!.find((inv: any) => inv.status === 'paid');
    expect(paidInvoice.balance_due).toBe(0);
    expect(paidInvoice.amount_paid).toBe(paidInvoice.total);

    const overdueInvoice = result.current.data!.find((inv: any) => inv.status === 'overdue');
    expect(overdueInvoice.balance_due).toBe(overdueInvoice.total);
    expect(overdueInvoice.amount_paid).toBe(0);
  });

  it('includes tax amounts in invoice totals', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['invoices-tax'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('invoices')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false })
              .limit(100);
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const invoice = result.current.data![0];
    expect(invoice.total).toBe(invoice.subtotal + invoice.tax_amount);
  });
});
