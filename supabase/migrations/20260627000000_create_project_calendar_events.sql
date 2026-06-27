-- US-084: User-created calendar events for the project scheduling calendar.
--
-- The existing `calendar_events` table is reserved for events synced FROM
-- external providers (it requires calendar_provider / external_id /
-- integration_id), so it can't hold app-created events. This table is the
-- source of truth for events created in the in-app Calendar (meetings, crew
-- schedules, ad-hoc deadlines/milestones). Project milestones and project end
-- dates are overlaid read-only by the UI from their own tables.
--
-- Backward-compat: CREATE TABLE + RLS in a single migration is the "always
-- safe" additive path (see CLAUDE.md > Backward Compatibility). No existing
-- shape is altered.

CREATE TABLE IF NOT EXISTS public.project_calendar_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL,
  project_id   uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by   uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  title        text NOT NULL,
  description  text,
  event_type   text NOT NULL DEFAULT 'meeting'
                 CHECK (event_type IN ('milestone', 'deadline', 'crew', 'meeting')),
  start_time   timestamptz NOT NULL,
  end_time     timestamptz,
  all_day      boolean NOT NULL DEFAULT false,
  location     text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_project_calendar_events_company_start
  ON public.project_calendar_events (company_id, start_time);

CREATE INDEX IF NOT EXISTS idx_project_calendar_events_project
  ON public.project_calendar_events (project_id);

ALTER TABLE public.project_calendar_events ENABLE ROW LEVEL SECURITY;

-- All authenticated members of the company can view the shared calendar.
CREATE POLICY "Company members can view calendar events"
  ON public.project_calendar_events
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can create calendar events"
  ON public.project_calendar_events
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role]
    )
  );

CREATE POLICY "Staff can update calendar events"
  ON public.project_calendar_events
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'office_staff'::user_role]
    )
  );

CREATE POLICY "Management can delete calendar events"
  ON public.project_calendar_events
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role]
    )
  );

-- Keep updated_at fresh on writes (reuses the shared trigger fn).
DROP TRIGGER IF EXISTS set_project_calendar_events_updated_at ON public.project_calendar_events;
CREATE TRIGGER set_project_calendar_events_updated_at
  BEFORE UPDATE ON public.project_calendar_events
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
