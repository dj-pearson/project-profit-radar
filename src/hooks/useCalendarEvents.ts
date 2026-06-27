import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { logger } from '@/lib/logger';

/**
 * US-084: Calendar events for the project scheduling calendar.
 *
 * Combines three sources, color-coded by type:
 *  - user-created events from `project_calendar_events` (editable: meeting/crew/...)
 *  - project milestones from `project_milestones` (read-only overlay)
 *  - project end dates from `projects` (read-only "deadline" overlay)
 */

export type CalendarEventType = 'milestone' | 'deadline' | 'crew' | 'meeting';

export interface CalendarEvent {
  id: string;
  title: string;
  type: CalendarEventType;
  start: Date;
  end: Date | null;
  allDay: boolean;
  projectId: string | null;
  description: string | null;
  location: string | null;
  /** Only user-created events (project_calendar_events) can be edited/deleted. */
  editable: boolean;
}

export interface NewCalendarEvent {
  title: string;
  type: CalendarEventType;
  start: Date;
  end?: Date | null;
  allDay?: boolean;
  projectId?: string | null;
  description?: string | null;
  location?: string | null;
}

export const EVENT_TYPE_COLORS: Record<CalendarEventType, string> = {
  milestone: 'bg-blue-500',
  deadline: 'bg-red-500',
  crew: 'bg-green-500',
  meeting: 'bg-purple-500',
};

export const EVENT_TYPE_LABELS: Record<CalendarEventType, string> = {
  milestone: 'Milestone',
  deadline: 'Deadline',
  crew: 'Crew',
  meeting: 'Meeting',
};

export function useCalendarEvents() {
  const { user, userProfile } = useAuth();
  const companyId = userProfile?.company_id;
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadEvents = useCallback(async () => {
    if (!companyId) {
      setEvents([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [userEventsRes, milestonesRes, projectsRes] = await Promise.all([
        supabase
          .from('project_calendar_events')
          .select('id, title, description, event_type, start_time, end_time, all_day, project_id, location')
          .eq('company_id', companyId),
        supabase
          .from('project_milestones')
          .select('id, name, target_date, project_id, description')
          .eq('company_id', companyId),
        supabase
          .from('projects')
          .select('id, name, end_date')
          .eq('company_id', companyId)
          .not('end_date', 'is', null),
      ]);

      if (userEventsRes.error) throw userEventsRes.error;

      const combined: CalendarEvent[] = [];

      for (const e of userEventsRes.data ?? []) {
        combined.push({
          id: e.id,
          title: e.title,
          type: (e.event_type as CalendarEventType) ?? 'meeting',
          start: new Date(e.start_time),
          end: e.end_time ? new Date(e.end_time) : null,
          allDay: !!e.all_day,
          projectId: e.project_id,
          description: e.description,
          location: e.location,
          editable: true,
        });
      }

      // Milestones / project deadlines are best-effort overlays — never block the
      // user's own events if those tables aren't readable for this role.
      if (!milestonesRes.error) {
        for (const m of milestonesRes.data ?? []) {
          if (!m.target_date) continue;
          combined.push({
            id: `milestone-${m.id}`,
            title: m.name,
            type: 'milestone',
            start: new Date(m.target_date),
            end: null,
            allDay: true,
            projectId: m.project_id,
            description: m.description ?? null,
            location: null,
            editable: false,
          });
        }
      }

      if (!projectsRes.error) {
        for (const p of projectsRes.data ?? []) {
          if (!p.end_date) continue;
          combined.push({
            id: `deadline-${p.id}`,
            title: `Project deadline: ${p.name}`,
            type: 'deadline',
            start: new Date(p.end_date),
            end: null,
            allDay: true,
            projectId: p.id,
            description: null,
            location: null,
            editable: false,
          });
        }
      }

      setEvents(combined);
    } catch (err) {
      logger.error('Failed to load calendar events', err as Error);
      setError(err instanceof Error ? err.message : 'Failed to load calendar events');
    } finally {
      setLoading(false);
    }
  }, [companyId]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const createEvent = useCallback(
    async (input: NewCalendarEvent) => {
      if (!companyId) throw new Error('No company');
      const { error: insertError } = await supabase.from('project_calendar_events').insert({
        company_id: companyId,
        created_by: user?.id ?? null,
        title: input.title,
        description: input.description ?? null,
        event_type: input.type,
        start_time: input.start.toISOString(),
        end_time: input.end ? input.end.toISOString() : null,
        all_day: input.allDay ?? false,
        project_id: input.projectId ?? null,
        location: input.location ?? null,
      });
      if (insertError) throw insertError;
      await loadEvents();
    },
    [companyId, user?.id, loadEvents]
  );

  const updateEvent = useCallback(
    async (id: string, input: NewCalendarEvent) => {
      const { error: updateError } = await supabase
        .from('project_calendar_events')
        .update({
          title: input.title,
          description: input.description ?? null,
          event_type: input.type,
          start_time: input.start.toISOString(),
          end_time: input.end ? input.end.toISOString() : null,
          all_day: input.allDay ?? false,
          project_id: input.projectId ?? null,
          location: input.location ?? null,
        })
        .eq('id', id);
      if (updateError) throw updateError;
      await loadEvents();
    },
    [loadEvents]
  );

  const deleteEvent = useCallback(
    async (id: string) => {
      const { error: deleteError } = await supabase
        .from('project_calendar_events')
        .delete()
        .eq('id', id);
      if (deleteError) throw deleteError;
      await loadEvents();
    },
    [loadEvents]
  );

  return { events, loading, error, refetch: loadEvents, createEvent, updateEvent, deleteEvent };
}
