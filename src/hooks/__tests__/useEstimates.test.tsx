import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';

const { mockEstimates } = vi.hoisted(() => ({
  mockEstimates: [
    {
      id: 'est-001',
      estimate_number: 'EST-2026-001',
      company_id: 'company-1',
      project_id: 'project-1',
      title: 'Kitchen Remodel - Full Renovation',
      description: 'Complete kitchen renovation including cabinets, countertops, plumbing, and electrical',
      client_name: 'Sarah Johnson',
      client_email: 'sarah@homeowner.com',
      client_phone: '555-234-5678',
      status: 'sent',
      estimate_date: '2026-02-01',
      site_address: '456 Oak Drive, Portland, OR 97201',
      markup_percentage: 15,
      tax_percentage: 8.5,
      discount_amount: 500,
      notes: 'Customer prefers quartz countertops. Timeline: 6-8 weeks.',
      sent_date: '2026-02-02',
      accepted_date: null,
      created_at: '2026-02-01T09:00:00Z',
      updated_at: '2026-02-02T10:30:00Z',
    },
    {
      id: 'est-002',
      estimate_number: 'EST-2026-002',
      company_id: 'company-1',
      project_id: null,
      title: 'Commercial Office Buildout - Suite 300',
      description: 'New office buildout including framing, drywall, flooring, HVAC, and electrical',
      client_name: 'TechCorp Inc',
      client_email: 'facilities@techcorp.com',
      client_phone: '555-345-6789',
      status: 'accepted',
      estimate_date: '2026-01-20',
      site_address: '789 Business Blvd, Suite 300, Portland, OR 97209',
      markup_percentage: 20,
      tax_percentage: 8.5,
      discount_amount: 0,
      notes: 'Phase 1 of 3-phase buildout. Start date: March 1.',
      sent_date: '2026-01-21',
      accepted_date: '2026-01-25',
      created_at: '2026-01-20T14:00:00Z',
      updated_at: '2026-01-25T08:15:00Z',
    },
    {
      id: 'est-003',
      estimate_number: 'EST-2026-003',
      company_id: 'company-1',
      project_id: null,
      title: 'Bathroom Addition - Primary Suite',
      description: 'New bathroom addition with walk-in shower, double vanity, and heated floors',
      client_name: 'Mike Chen',
      client_email: 'mike.chen@email.com',
      client_phone: '555-456-7890',
      status: 'draft',
      estimate_date: '2026-02-10',
      site_address: '321 Elm Street, Portland, OR 97214',
      markup_percentage: 18,
      tax_percentage: 8.5,
      discount_amount: 0,
      notes: null,
      sent_date: null,
      accepted_date: null,
      created_at: '2026-02-10T11:00:00Z',
      updated_at: '2026-02-10T11:00:00Z',
    },
  ],
}));

vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockEstimates,
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

describe('useEstimates hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns estimate data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['estimates'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('estimates')
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
    expect(result.current.data).toHaveLength(3);
    expect(result.current.data![0].title).toBe('Kitchen Remodel - Full Renovation');
    expect(result.current.data![1].status).toBe('accepted');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['estimates-loading'],
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
          queryKey: ['estimates-error'],
          queryFn: async () => {
            throw new Error('RLS policy violation: insufficient permissions');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('insufficient permissions');
  });

  it('returns estimates with all required fields', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['estimates-fields'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('estimates')
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
    const estimate = result.current.data![0];
    expect(estimate).toHaveProperty('estimate_number');
    expect(estimate).toHaveProperty('title');
    expect(estimate).toHaveProperty('client_name');
    expect(estimate).toHaveProperty('status');
    expect(estimate).toHaveProperty('markup_percentage');
    expect(estimate).toHaveProperty('tax_percentage');
  });

  it('differentiates between estimate statuses', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['estimates-statuses'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('estimates')
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

    const sent = result.current.data!.filter((e: any) => e.status === 'sent');
    const accepted = result.current.data!.filter((e: any) => e.status === 'accepted');
    const draft = result.current.data!.filter((e: any) => e.status === 'draft');

    expect(sent).toHaveLength(1);
    expect(accepted).toHaveLength(1);
    expect(draft).toHaveLength(1);

    expect(accepted[0].accepted_date).not.toBeNull();
    expect(draft[0].sent_date).toBeNull();
  });
});
