/**
 * US-084: calendar event aggregation
 *
 * Verifies useCalendarEvents merges the three sources (user events,
 * project milestones, project deadlines) into a single typed list.
 */
import { describe, it, expect, vi } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';

const tableData: Record<string, unknown[]> = {
  project_calendar_events: [
    {
      id: 'e1',
      title: 'Site walkthrough',
      event_type: 'meeting',
      start_time: '2026-06-10T09:00:00.000Z',
      end_time: null,
      all_day: false,
      project_id: null,
      description: null,
      location: null,
    },
  ],
  project_milestones: [
    { id: 'm1', name: 'Foundation poured', target_date: '2026-06-12', project_id: 'p1', description: null },
  ],
  projects: [{ id: 'p1', name: 'Riverside', end_date: '2026-06-20' }],
};

function makeQuery(table: string) {
  const result = { data: tableData[table] ?? [], error: null };
  const q: Record<string, unknown> = {
    select: () => q,
    eq: () => q,
    not: () => q,
    order: () => q,
    then: (resolve: (r: typeof result) => void) => resolve(result),
  };
  return q;
}

vi.mock('@/integrations/supabase/client', () => ({
  supabase: { from: (t: string) => makeQuery(t) },
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'u1' }, userProfile: { company_id: 'c1' } }),
}));

import { useCalendarEvents } from '@/hooks/useCalendarEvents';

describe('useCalendarEvents (US-084)', () => {
  it('merges user events, milestones, and project deadlines', async () => {
    const { result } = renderHook(() => useCalendarEvents());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const ids = result.current.events.map((e) => e.id);
    expect(ids).toContain('e1');
    expect(ids).toContain('milestone-m1');
    expect(ids).toContain('deadline-p1');
  });

  it('marks only user-created events as editable and overlays as read-only', async () => {
    const { result } = renderHook(() => useCalendarEvents());
    await waitFor(() => expect(result.current.loading).toBe(false));

    const userEvent = result.current.events.find((e) => e.id === 'e1');
    const milestone = result.current.events.find((e) => e.id === 'milestone-m1');
    const deadline = result.current.events.find((e) => e.id === 'deadline-p1');

    expect(userEvent?.editable).toBe(true);
    expect(userEvent?.type).toBe('meeting');
    expect(milestone?.editable).toBe(false);
    expect(milestone?.type).toBe('milestone');
    expect(deadline?.editable).toBe(false);
    expect(deadline?.type).toBe('deadline');
  });
});
