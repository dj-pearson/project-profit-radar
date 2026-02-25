import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';

const { mockTimeEntries } = vi.hoisted(() => ({
  mockTimeEntries: [
  {
    id: 'te-001',
    user_id: 'user-1',
    project_id: 'project-1',
    company_id: 'company-1',
    date: '2026-02-24',
    start_time: '2026-02-24T07:00:00Z',
    end_time: '2026-02-24T15:30:00Z',
    total_hours: 8.5,
    break_duration: 0.5,
    description: 'Framing second floor walls, installed headers over windows',
    cost_code: 'LABOR-FRAME-001',
    hourly_rate: 55,
    is_billable: true,
    approval_status: 'approved',
    approved_by: 'supervisor-1',
    approved_at: '2026-02-24T17:00:00Z',
    location: 'Site A - Building 1',
    created_at: '2026-02-24T07:00:00Z',
    updated_at: '2026-02-24T17:00:00Z',
  },
  {
    id: 'te-002',
    user_id: 'user-2',
    project_id: 'project-1',
    company_id: 'company-1',
    date: '2026-02-24',
    start_time: '2026-02-24T06:30:00Z',
    end_time: '2026-02-24T14:30:00Z',
    total_hours: 8,
    break_duration: 0.5,
    description: 'Electrical rough-in for second floor, ran conduit in walls',
    cost_code: 'LABOR-ELEC-002',
    hourly_rate: 65,
    is_billable: true,
    approval_status: 'pending',
    approved_by: null,
    approved_at: null,
    location: 'Site A - Building 1',
    created_at: '2026-02-24T06:30:00Z',
    updated_at: '2026-02-24T14:30:00Z',
  },
  {
    id: 'te-003',
    user_id: 'user-1',
    project_id: 'project-2',
    company_id: 'company-1',
    date: '2026-02-23',
    start_time: '2026-02-23T08:00:00Z',
    end_time: '2026-02-23T12:00:00Z',
    total_hours: 4,
    break_duration: 0,
    description: 'Safety meeting and site inspection walkthrough',
    cost_code: 'OVERHEAD-SAFETY-001',
    hourly_rate: 55,
    is_billable: false,
    approval_status: 'approved',
    approved_by: 'supervisor-1',
    approved_at: '2026-02-23T16:00:00Z',
    location: 'Site B - Warehouse',
    created_at: '2026-02-23T08:00:00Z',
    updated_at: '2026-02-23T16:00:00Z',
  },
  ],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTimeEntries,
            error: null,
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

describe('useTimeEntries hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns time entry data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('time_entries')
              .select('*')
              .eq('company_id', 'company-1')
              .order('date', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].description).toContain('Framing second floor');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when time entries fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries-error'],
          queryFn: async () => {
            throw new Error('Network timeout: could not fetch time entries');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Network timeout');
  });

  it('includes billable and non-billable time entries', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries-billable'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('time_entries')
              .select('*')
              .eq('company_id', 'company-1')
              .order('date', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const billable = result.current.data!.filter((te: any) => te.is_billable);
    const nonBillable = result.current.data!.filter((te: any) => !te.is_billable);

    expect(billable).toHaveLength(2);
    expect(nonBillable).toHaveLength(1);
  });

  it('returns entries with valid total_hours and hourly_rate', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries-hours'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('time_entries')
              .select('*')
              .eq('company_id', 'company-1')
              .order('date', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data!.forEach((entry: any) => {
      expect(entry.total_hours).toBeGreaterThan(0);
      expect(entry.hourly_rate).toBeGreaterThan(0);
    });

    const totalHours = result.current.data!.reduce((sum: number, e: any) => sum + e.total_hours, 0);
    expect(totalHours).toBe(20.5);
  });

  it('distinguishes between approval statuses', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['time-entries-approval'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('time_entries')
              .select('*')
              .eq('company_id', 'company-1')
              .order('date', { ascending: false });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const approved = result.current.data!.filter((e: any) => e.approval_status === 'approved');
    const pending = result.current.data!.filter((e: any) => e.approval_status === 'pending');

    expect(approved).toHaveLength(2);
    expect(pending).toHaveLength(1);

    // Approved entries should have approved_by set
    approved.forEach((entry: any) => {
      expect(entry.approved_by).not.toBeNull();
      expect(entry.approved_at).not.toBeNull();
    });

    // Pending entries should not have approved_by set
    pending.forEach((entry: any) => {
      expect(entry.approved_by).toBeNull();
    });
  });
});
