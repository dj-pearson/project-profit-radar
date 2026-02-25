import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const mockChangeOrders = [
  {
    id: 'co-001',
    change_order_number: 'CO-2026-001',
    company_id: 'company-1',
    project_id: 'project-1',
    title: 'Add Recessed Lighting Package',
    description: 'Client requested additional recessed LED lighting in kitchen and living areas. Includes 18 fixtures, wiring, and dimmable switches.',
    amount: 4850,
    status: 'approved',
    reason: 'Client design change',
    created_by: 'user-002',
    internal_approved: true,
    internal_approved_by: 'user-001',
    internal_approved_date: '2026-02-18T10:00:00Z',
    client_approved: true,
    client_approved_date: '2026-02-19T14:00:00Z',
    approval_due_date: '2026-02-20',
    approval_notes: 'Approved - within budget contingency. Timeline extended by 2 days.',
    assigned_approvers: ['user-001', 'user-002'],
    created_at: '2026-02-15T09:00:00Z',
    updated_at: '2026-02-19T14:00:00Z',
  },
  {
    id: 'co-002',
    change_order_number: 'CO-2026-002',
    company_id: 'company-1',
    project_id: 'project-1',
    title: 'Upgrade to Quartz Countertops',
    description: 'Upgrade from granite to quartz countertops in kitchen and both bathrooms. Includes removal, fabrication, and installation.',
    amount: 8200,
    status: 'pending',
    reason: 'Client upgrade request',
    created_by: 'user-002',
    internal_approved: true,
    internal_approved_by: 'user-001',
    internal_approved_date: '2026-02-22T11:00:00Z',
    client_approved: false,
    client_approved_date: null,
    approval_due_date: '2026-02-28',
    approval_notes: null,
    assigned_approvers: ['user-001'],
    created_at: '2026-02-20T15:00:00Z',
    updated_at: '2026-02-22T11:00:00Z',
  },
  {
    id: 'co-003',
    change_order_number: 'CO-2026-003',
    company_id: 'company-1',
    project_id: 'project-2',
    title: 'Additional Fire Suppression Zones',
    description: 'Building code review requires 2 additional fire suppression zones in the warehouse storage area. Non-negotiable requirement per city inspector.',
    amount: 15750,
    status: 'approved',
    reason: 'Code compliance',
    created_by: 'user-003',
    internal_approved: true,
    internal_approved_by: 'user-001',
    internal_approved_date: '2026-02-10T08:00:00Z',
    client_approved: true,
    client_approved_date: '2026-02-11T09:30:00Z',
    approval_due_date: '2026-02-12',
    approval_notes: 'Required by fire marshal inspection. Client acknowledged cost impact.',
    assigned_approvers: ['user-001', 'user-003'],
    created_at: '2026-02-08T14:00:00Z',
    updated_at: '2026-02-11T09:30:00Z',
  },
  {
    id: 'co-004',
    change_order_number: 'CO-2026-004',
    company_id: 'company-1',
    project_id: 'project-1',
    title: 'Delete Deck Extension',
    description: 'Client decided to remove planned rear deck extension from project scope. Credit to be applied.',
    amount: -6500,
    status: 'approved',
    reason: 'Client scope reduction',
    created_by: 'user-002',
    internal_approved: true,
    internal_approved_by: 'user-001',
    internal_approved_date: '2026-02-12T16:00:00Z',
    client_approved: true,
    client_approved_date: '2026-02-12T17:00:00Z',
    approval_due_date: '2026-02-15',
    approval_notes: 'Deductive change order. Savings passed to client.',
    assigned_approvers: ['user-001'],
    created_at: '2026-02-12T10:00:00Z',
    updated_at: '2026-02-12T17:00:00Z',
  },
];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockChangeOrders,
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

describe('useChangeOrders hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns change order data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('change_orders')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(4);
    expect(result.current.data![0].title).toBe('Add Recessed Lighting Package');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when change orders fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders-error'],
          queryFn: async () => {
            throw new Error('RLS policy denied access to change_orders');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('RLS policy denied');
  });

  it('calculates net change order impact', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders-net'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('change_orders')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const approvedOrders = result.current.data!.filter(
      (co: any) => co.status === 'approved'
    );
    const netImpact = approvedOrders.reduce(
      (sum: number, co: any) => sum + co.amount,
      0
    );

    // 4850 + 15750 + (-6500) = 14100
    expect(netImpact).toBe(14100);
  });

  it('supports both additive and deductive change orders', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders-types'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('change_orders')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const additive = result.current.data!.filter((co: any) => co.amount > 0);
    const deductive = result.current.data!.filter((co: any) => co.amount < 0);

    expect(additive).toHaveLength(3);
    expect(deductive).toHaveLength(1);
    expect(deductive[0].title).toContain('Delete Deck');
  });

  it('tracks dual approval workflow (internal and client)', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['change-orders-approval'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('change_orders')
              .select('*')
              .eq('company_id', 'company-1')
              .order('created_at', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // Fully approved orders have both internal and client approval
    const fullyApproved = result.current.data!.filter(
      (co: any) => co.internal_approved && co.client_approved
    );
    expect(fullyApproved).toHaveLength(3);

    // Pending order has internal approval but not client
    const pendingOrder = result.current.data!.find(
      (co: any) => co.status === 'pending'
    );
    expect(pendingOrder.internal_approved).toBe(true);
    expect(pendingOrder.client_approved).toBe(false);
    expect(pendingOrder.client_approved_date).toBeNull();
  });
});
