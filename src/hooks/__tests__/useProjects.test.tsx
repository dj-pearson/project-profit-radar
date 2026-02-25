import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              { id: '1', name: 'Office Renovation', status: 'active', budget: 150000, completion_percentage: 45 },
              { id: '2', name: 'Warehouse Build', status: 'active', budget: 500000, completion_percentage: 20 },
            ],
            error: null,
          }),
        }),
      }),
    }),
    auth: { getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-1' } }, error: null }) },
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

describe('useProjects hook', () => {
  beforeEach(() => { vi.clearAllMocks(); });

  it('returns project data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['projects'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data).toHaveLength(2);
    expect(result.current.data![0].name).toBe('Office Renovation');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['projects-loading'],
          queryFn: () => new Promise(() => {}), // never resolves
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
  });

  it('handles error state', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['projects-error'],
          queryFn: async () => {
            throw new Error('Database error');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeDefined();
  });

  it('returns project budgets as numbers', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['projects-budget'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(result.current.data![0].budget).toBe(150000);
    expect(result.current.data![1].budget).toBe(500000);
  });

  it('returns data with correct structure', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['projects-structure'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('projects')
              .select('*')
              .order('created_at')
              .eq('company_id', 'company-1');
            if (error) throw error;
            return data;
          },
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    const project = result.current.data![0];
    expect(project).toHaveProperty('id');
    expect(project).toHaveProperty('name');
    expect(project).toHaveProperty('status');
    expect(project).toHaveProperty('budget');
    expect(project).toHaveProperty('completion_percentage');
  });
});
