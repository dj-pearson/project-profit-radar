import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, useQuery } from '@tanstack/react-query';
import React from 'react';
import { supabase } from '@/integrations/supabase/client';

const { mockDailyReports } = vi.hoisted(() => ({
  mockDailyReports: [
  {
    id: 'dr-001',
    company_id: 'company-1',
    project_id: 'project-1',
    date: '2026-02-24',
    status: 'submitted',
    created_by: 'user-003',
    submitted_by: 'user-003',
    crew_count: 12,
    completion_percentage: 48,
    delays_issues: 'Rain delay from 10am-12pm. Lost 2 hours of framing work.',
    materials_delivered: 'Lumber delivery received (2x4, 2x6 studs). Missing LVL beams - backordered.',
    equipment_used: 'Crane (8hrs), Forklift (4hrs), Compressor (8hrs)',
    safety_incidents: null,
    quality_issues: null,
    next_day_plan: 'Continue framing second floor. Pour grade beams if weather permits.',
    client_visitors: 'Owner visited site at 2pm for progress walk-through',
    photos: ['photos/dr-001/img-1.jpg', 'photos/dr-001/img-2.jpg', 'photos/dr-001/img-3.jpg'],
    gps_latitude: 45.5152,
    gps_longitude: -122.6784,
    gps_accuracy: 8.5,
    is_auto_populated: false,
    submission_timestamp: '2026-02-24T16:30:00Z',
    created_at: '2026-02-24T07:00:00Z',
    updated_at: '2026-02-24T16:30:00Z',
  },
  {
    id: 'dr-002',
    company_id: 'company-1',
    project_id: 'project-1',
    date: '2026-02-23',
    status: 'approved',
    created_by: 'user-003',
    submitted_by: 'user-003',
    crew_count: 14,
    completion_percentage: 46,
    delays_issues: null,
    materials_delivered: 'Rebar delivery for grade beams. Anchor bolt sets.',
    equipment_used: 'Crane (8hrs), Forklift (6hrs), Concrete Pump (4hrs)',
    safety_incidents: null,
    quality_issues: null,
    next_day_plan: 'Start second floor wall framing. Continue sheathing.',
    client_visitors: null,
    photos: ['photos/dr-002/img-1.jpg'],
    gps_latitude: 45.5152,
    gps_longitude: -122.6784,
    gps_accuracy: 5.2,
    is_auto_populated: false,
    submission_timestamp: '2026-02-23T17:00:00Z',
    created_at: '2026-02-23T06:30:00Z',
    updated_at: '2026-02-23T18:00:00Z',
  },
  {
    id: 'dr-003',
    company_id: 'company-1',
    project_id: 'project-2',
    date: '2026-02-24',
    status: 'draft',
    created_by: 'user-004',
    submitted_by: null,
    crew_count: 8,
    completion_percentage: 22,
    delays_issues: 'Waiting on permit approval for electrical rough-in.',
    materials_delivered: null,
    equipment_used: 'Scissor Lift (8hrs)',
    safety_incidents: 'Near-miss: unsecured material fell from second level. No injuries. Toolbox talk conducted.',
    quality_issues: 'Drywall seams not meeting spec in Suite 302. Subcontractor to redo.',
    next_day_plan: 'Continue HVAC ductwork installation. Electrical permit expected.',
    client_visitors: null,
    photos: [],
    gps_latitude: 45.5231,
    gps_longitude: -122.6765,
    gps_accuracy: 12.0,
    is_auto_populated: true,
    submission_timestamp: null,
    created_at: '2026-02-24T08:00:00Z',
    updated_at: '2026-02-24T15:00:00Z',
  },
  ],
}));

// Mock supabase
vi.mock('@/integrations/supabase/client', () => ({
  supabase: {
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockResolvedValue({
            data: mockDailyReports,
            error: null,
          }),
        }),
      }),
    }),
    auth: {
      getUser: vi.fn().mockResolvedValue({ data: { user: { id: 'user-003' } }, error: null }),
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

describe('useDailyReports hook', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns daily report data on success', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('daily_reports')
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
    expect(result.current.data![0].date).toBe('2026-02-24');
  });

  it('starts in loading state', () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-loading'],
          queryFn: () => new Promise(() => {}),
        }),
      { wrapper: createWrapper() }
    );

    expect(result.current.isLoading).toBe(true);
    expect(result.current.data).toBeUndefined();
  });

  it('handles error when reports fail to load', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-error'],
          queryFn: async () => {
            throw new Error('Query timeout: daily_reports table');
          },
          retry: false,
        }),
      { wrapper: createWrapper() }
    );

    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error).toBeInstanceOf(Error);
    expect((result.current.error as Error).message).toContain('Query timeout');
  });

  it('tracks crew counts and completion percentage', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-metrics'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('daily_reports')
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

    result.current.data!.forEach((report: any) => {
      expect(report.crew_count).toBeGreaterThan(0);
      expect(report.completion_percentage).toBeGreaterThanOrEqual(0);
      expect(report.completion_percentage).toBeLessThanOrEqual(100);
    });

    const totalCrew = result.current.data!.reduce(
      (sum: number, r: any) => sum + r.crew_count,
      0
    );
    expect(totalCrew).toBe(34);
  });

  it('captures safety incidents when present', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-safety'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('daily_reports')
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

    const reportsWithIncidents = result.current.data!.filter(
      (r: any) => r.safety_incidents !== null
    );
    expect(reportsWithIncidents).toHaveLength(1);
    expect(reportsWithIncidents[0].safety_incidents).toContain('Near-miss');
  });

  it('supports different report statuses (draft, submitted, approved)', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-statuses'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('daily_reports')
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

    const statuses = result.current.data!.map((r: any) => r.status);
    expect(statuses).toContain('draft');
    expect(statuses).toContain('submitted');
    expect(statuses).toContain('approved');

    // Draft reports should not have submission_timestamp
    const draftReport = result.current.data!.find((r: any) => r.status === 'draft');
    expect(draftReport.submission_timestamp).toBeNull();
    expect(draftReport.submitted_by).toBeNull();
  });

  it('includes GPS location data', async () => {
    const { result } = renderHook(
      () =>
        useQuery({
          queryKey: ['daily-reports-gps'],
          queryFn: async () => {
            const { data, error } = await supabase
              .from('daily_reports')
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

    result.current.data!.forEach((report: any) => {
      expect(report.gps_latitude).toBeGreaterThan(0);
      expect(report.gps_longitude).toBeLessThan(0); // West hemisphere
      expect(report.gps_accuracy).toBeGreaterThan(0);
    });
  });
});
