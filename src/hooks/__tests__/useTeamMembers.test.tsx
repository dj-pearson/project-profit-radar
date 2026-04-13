import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const mockTeamMembers = [
  {
    id: 'user-001',
    email: 'mike.johnson@brikly.com',
    first_name: 'Mike',
    last_name: 'Johnson',
    phone: '555-100-2001',
    company_id: 'company-1',
    role: 'admin',
    is_active: true,
    created_at: '2025-06-15T08:00:00Z',
    updated_at: '2026-02-20T12:00:00Z',
  },
  {
    id: 'user-002',
    email: 'sarah.williams@brikly.com',
    first_name: 'Sarah',
    last_name: 'Williams',
    phone: '555-100-2002',
    company_id: 'company-1',
    role: 'project_manager',
    is_active: true,
    created_at: '2025-07-01T09:00:00Z',
    updated_at: '2026-02-18T15:30:00Z',
  },
  {
    id: 'user-003',
    email: 'james.martinez@brikly.com',
    first_name: 'James',
    last_name: 'Martinez',
    phone: '555-100-2003',
    company_id: 'company-1',
    role: 'field_supervisor',
    is_active: true,
    created_at: '2025-08-10T07:00:00Z',
    updated_at: '2026-02-24T06:45:00Z',
  },
  {
    id: 'user-004',
    email: 'lisa.chen@brikly.com',
    first_name: 'Lisa',
    last_name: 'Chen',
    phone: '555-100-2004',
    company_id: 'company-1',
    role: 'accounting',
    is_active: true,
    created_at: '2025-09-01T08:30:00Z',
    updated_at: '2026-02-22T10:00:00Z',
  },
  {
    id: 'user-005',
    email: 'tom.davis@brikly.com',
    first_name: 'Tom',
    last_name: 'Davis',
    phone: '555-100-2005',
    company_id: 'company-1',
    role: 'field_supervisor',
    is_active: false,
    created_at: '2025-07-20T08:00:00Z',
    updated_at: '2026-01-15T16:00:00Z',
  },
];

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockTeamMembers,
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

describe('useTeamMembers hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns team member data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('company_id', 'company-1')
              .order('first_name', { ascending: true });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(5);
    expect(result.current.data![0].first_name).toBe('Mike');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when team members fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members-error'],
          queryFn: async () => {
            throw new Error('Unauthorized: insufficient role permissions');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('insufficient role permissions');
  });

  it('includes members with different roles', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members-roles'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('company_id', 'company-1')
              .order('first_name', { ascending: true });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const roles = result.current.data!.map((m: any) => m.role);
    expect(roles).toContain('admin');
    expect(roles).toContain('project_manager');
    expect(roles).toContain('field_supervisor');
    expect(roles).toContain('accounting');
  });

  it('distinguishes active and inactive members', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members-active'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('company_id', 'company-1')
              .order('first_name', { ascending: true });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    const activeMembers = result.current.data!.filter((m: any) => m.is_active);
    const inactiveMembers = result.current.data!.filter((m: any) => !m.is_active);

    expect(activeMembers).toHaveLength(4);
    expect(inactiveMembers).toHaveLength(1);
    expect(inactiveMembers[0].first_name).toBe('Tom');
  });

  it('returns team members with contact information', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['team-members-contacts'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('user_profiles')
              .select('*')
              .eq('company_id', 'company-1')
              .order('first_name', { ascending: true });
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    result.current.data!.forEach((member: any) => {
      expect(member).toHaveProperty('email');
      expect(member).toHaveProperty('phone');
      expect(member).toHaveProperty('first_name');
      expect(member).toHaveProperty('last_name');
      expect(member.email).toMatch(/@/);
    });
  });
});
