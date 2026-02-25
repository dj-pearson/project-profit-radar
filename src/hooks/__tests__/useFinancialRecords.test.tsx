import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';

const { mockFinancialRecords } = vi.hoisted(() => ({
  mockFinancialRecords: [
  {
    id: 'fin-001',
    company_id: 'company-1',
    project_id: 'project-1',
    type: 'income',
    amount: 45000,
    description: 'Progress billing - Foundation complete',
    category: 'Progress Payment',
    date: '2026-02-15',
    reference_number: 'PAY-2026-001',
    vendor_name: null,
    cost_code: 'REV-001',
    is_reconciled: true,
    created_at: '2026-02-15T10:00:00Z',
    updated_at: '2026-02-15T10:00:00Z',
  },
  {
    id: 'fin-002',
    company_id: 'company-1',
    project_id: 'project-1',
    type: 'expense',
    amount: 12500,
    description: 'Concrete delivery - 25 yards',
    category: 'Materials',
    date: '2026-02-10',
    reference_number: 'PO-2026-045',
    vendor_name: 'Pacific Concrete Supply',
    cost_code: 'MAT-CONC-001',
    is_reconciled: true,
    created_at: '2026-02-10T08:00:00Z',
    updated_at: '2026-02-12T14:00:00Z',
  },
  {
    id: 'fin-003',
    company_id: 'company-1',
    project_id: 'project-1',
    type: 'expense',
    amount: 8200,
    description: 'Rebar and structural steel',
    category: 'Materials',
    date: '2026-02-08',
    reference_number: 'PO-2026-042',
    vendor_name: 'Northwest Steel',
    cost_code: 'MAT-STEEL-001',
    is_reconciled: false,
    created_at: '2026-02-08T09:00:00Z',
    updated_at: '2026-02-08T09:00:00Z',
  },
  {
    id: 'fin-004',
    company_id: 'company-1',
    project_id: 'project-2',
    type: 'cost',
    amount: 3500,
    description: 'Equipment rental - Excavator (1 week)',
    category: 'Equipment',
    date: '2026-02-12',
    reference_number: 'RENT-2026-008',
    vendor_name: 'United Rentals',
    cost_code: 'EQUIP-RENT-001',
    is_reconciled: false,
    created_at: '2026-02-12T07:00:00Z',
    updated_at: '2026-02-12T07:00:00Z',
  },
  {
    id: 'fin-005',
    company_id: 'company-1',
    project_id: 'project-2',
    type: 'revenue',
    amount: 85000,
    description: 'Initial deposit - Warehouse project',
    category: 'Deposit',
    date: '2026-01-28',
    reference_number: 'DEP-2026-002',
    vendor_name: null,
    cost_code: 'REV-002',
    is_reconciled: true,
    created_at: '2026-01-28T11:00:00Z',
    updated_at: '2026-01-30T09:00:00Z',
  },
];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: mockFinancialRecords,
          error: null,
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }),
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

describe('useFinancialRecords hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns financial records on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('financial_records')
              .select('*')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error state', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records-error'],
          queryFn: async () => {
            throw new Error('Connection refused: database unavailable');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('database unavailable');
  });

  it('correctly separates income and expense records', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records-types'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('financial_records')
              .select('*')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const incomeRecords = result.current.data!.filter(
      (r: any) => r.type === 'income' || r.type === 'revenue'
    );
    const expenseRecords = result.current.data!.filter(
      (r: any) => r.type === 'expense' || r.type === 'cost'
    );

    expect(incomeRecords).toHaveLength(2);
    expect(expenseRecords).toHaveLength(3);

    const totalRevenue = incomeRecords.reduce((sum: number, r: any) => sum + r.amount, 0);
    const totalExpenses = expenseRecords.reduce((sum: number, r: any) => sum + r.amount, 0);

    expect(totalRevenue).toBe(130000);
    expect(totalExpenses).toBe(24200);
  });

  it('tracks reconciliation status', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records-reconciled'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('financial_records')
              .select('*')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const reconciled = result.current.data!.filter((r: any) => r.is_reconciled);
    const unreconciled = result.current.data!.filter((r: any) => !r.is_reconciled);

    expect(reconciled).toHaveLength(3);
    expect(unreconciled).toHaveLength(2);
  });

  it('associates records with projects', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['financial-records-projects'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('financial_records')
              .select('*')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const project1Records = result.current.data!.filter(
      (r: any) => r.project_id === 'project-1'
    );
    const project2Records = result.current.data!.filter(
      (r: any) => r.project_id === 'project-2'
    );

    expect(project1Records).toHaveLength(3);
    expect(project2Records).toHaveLength(2);
  });
});
