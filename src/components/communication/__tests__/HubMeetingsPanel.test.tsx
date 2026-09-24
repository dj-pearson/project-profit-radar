/**
 * US-313: the Meetings tab reads and writes project_calendar_events through
 * useCalendarEvents, the hook /calendar uses, rather than a store of its own.
 */
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';

const createEvent = vi.fn();
const future = new Date(Date.now() + 3 * 86400000);

vi.mock('@/hooks/useCalendarEvents', () => ({
  useCalendarEvents: () => ({
    events: [
      { id: 'e1', title: 'OAC meeting', type: 'meeting', start: future, end: null, allDay: false, projectId: 'p1', description: null, location: 'Trailer', editable: true },
      { id: 'e2', title: 'Hilltop walk', type: 'meeting', start: future, end: null, allDay: false, projectId: 'p2', description: null, location: null, editable: true },
      { id: 'e3', title: 'Crew day', type: 'crew', start: future, end: null, allDay: true, projectId: 'p1', description: null, location: null, editable: true },
      { id: 'milestone-m1', title: 'Slab poured', type: 'milestone', start: future, end: null, allDay: true, projectId: 'p1', description: null, location: null, editable: false },
    ],
    loading: false,
    error: null,
    refetch: vi.fn(),
    createEvent,
    updateEvent: vi.fn(),
    deleteEvent: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { HubMeetingsPanel } from '../HubMeetingsPanel';

const projects = [{ id: 'p1', name: 'Riverside' }, { id: 'p2', name: 'Hilltop' }];

describe('HubMeetingsPanel (US-313)', () => {
  beforeEach(() => createEvent.mockReset().mockResolvedValue(undefined));

  it('lists only meeting events on the selected project', () => {
    render(<MemoryRouter><HubMeetingsPanel projectId="p1" projects={projects} /></MemoryRouter>);
    expect(screen.getByText('OAC meeting')).toBeTruthy();
    expect(screen.queryByText('Hilltop walk')).toBeNull();
    expect(screen.queryByText('Crew day')).toBeNull();
    expect(screen.queryByText('Slab poured')).toBeNull();
  });

  it('schedules a meeting as a calendar event of type meeting', async () => {
    render(<MemoryRouter><HubMeetingsPanel projectId="p1" projects={projects} /></MemoryRouter>);
    fireEvent.click(screen.getByRole('button', { name: /Schedule meeting/ }));
    fireEvent.change(await screen.findByLabelText('Title'), { target: { value: 'Pre-pour meeting' } });
    fireEvent.change(screen.getByLabelText('Date'), { target: { value: '2026-10-05' } });
    fireEvent.submit(screen.getByRole('form', { name: 'Meeting form' }));
    await waitFor(() => expect(createEvent).toHaveBeenCalledTimes(1));
    expect(createEvent.mock.calls[0][0]).toMatchObject({
      title: 'Pre-pour meeting',
      type: 'meeting',
      projectId: 'p1',
      start: new Date(2026, 9, 5, 9, 0),
      end: new Date(2026, 9, 5, 10, 0),
    });
  });
});
