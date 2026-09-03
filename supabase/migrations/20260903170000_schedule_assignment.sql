-- A Gantt nobody is assigned to is a picture (US-329).
--
-- WHAT WAS THERE. Three schedule systems, and only one of them held data.
--
--   schedule_tasks + schedule_task_dependencies + schedule_baselines is real.
--   ProjectSchedule.tsx drives it through scheduleService.ts: drag to
--   reschedule with a dependency cascade, baseline slip against a saved plan.
--   It has no assignee column, so the schedule cannot say who is doing the
--   work.
--
--   ScheduleManagement.tsx at /schedule-management fetches projects only, and
--   the four components it renders - ProjectGanttChart, ScheduleCalendar,
--   ScheduleOverview, ProjectTimeline - make no Supabase call at all. They draw
--   each project as one bar. That is a picture of the projects list.
--
--   crew_assignments is a separate board. It is real and it is written, but it
--   has no connection to schedule_tasks: a superintendent assigns a crew to a
--   day, then separately draws a Gantt, and neither knows about the other. Its
--   arrival_notification_sent column has never been set by anything, because
--   nothing sends an arrival notification.
--
-- So the schedule could be perfect and no one on the crew would learn of it.
--
-- WHAT THIS DOES. Makes schedule_tasks the thing that assigns work, and keeps
-- crew_assignments as the day-level board it already is by generating its rows
-- from the assignment rather than asking for them twice.
--
-- Assignment and reschedule both notify, through real_time_notifications,
-- which is what the notification centre reads (useSimpleNotifications.ts:53).
-- Its type CHECK already admits 'task_assignment' and 'timeline_change', so no
-- constraint changes and nothing existing can start failing.

-- ---------------------------------------------------------------------------
-- 1. Who is on this task
-- ---------------------------------------------------------------------------
-- A row per person rather than an assignee column: a schedule task is a crew,
-- not an individual, and a single column would have forced the superintendent
-- back to the separate board to say who else is coming.
CREATE TABLE IF NOT EXISTS public.schedule_task_assignees (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  schedule_task_id UUID NOT NULL REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  -- A crew member is a user_profiles row; crew_assignments.crew_member_id has
  -- referenced that since 20250706012036.
  crew_member_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  -- The day-board row this generated, so a reschedule can move it and a
  -- removal can take it away.
  crew_assignment_id UUID REFERENCES public.crew_assignments(id) ON DELETE SET NULL,
  notified_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (schedule_task_id, crew_member_id)
);

COMMENT ON TABLE public.schedule_task_assignees IS
  'Who is doing a scheduled task. Assigning here generates the crew_assignments row and notifies the person. US-329.';

ALTER TABLE public.schedule_task_assignees ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'schedule_task_assignees'
      AND policyname = 'Staff manage their company schedule assignees'
  ) THEN
    CREATE POLICY "Staff manage their company schedule assignees"
      ON public.schedule_task_assignees FOR ALL
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- Which schedule task a crew_assignments row came from, so the day board can
-- say "this is the framing task" instead of showing an unexplained block.
ALTER TABLE public.crew_assignments
  ADD COLUMN IF NOT EXISTS schedule_task_id UUID REFERENCES public.schedule_tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.crew_assignments.schedule_task_id IS
  'The schedule task this day-assignment came from, when it was generated rather than entered by hand. US-329.';

-- ---------------------------------------------------------------------------
-- 2. Assigning generates the day-board row and tells the person
-- ---------------------------------------------------------------------------
-- A trigger rather than application code: assignment happens from the Gantt,
-- from a schedule import, and from whatever iOS grows, and the crew must be
-- told regardless of which one was used.
CREATE OR REPLACE FUNCTION public.assign_schedule_task_crew()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_task       public.schedule_tasks;
  v_project    text;
  v_assignment uuid;
BEGIN
  SELECT * INTO v_task FROM public.schedule_tasks WHERE id = NEW.schedule_task_id;
  IF v_task.id IS NULL THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project FROM public.projects WHERE id = v_task.project_id;

  -- The day board. crew_assignments is UNIQUE (crew_member_id, assigned_date,
  -- start_time) since 20250706012036, so a person already booked at that hour
  -- keeps their existing row: the schedule assignment still stands and the
  -- conflict is visible on the board, which is where a superintendent resolves
  -- it. Silently moving somebody's day would be worse.
  INSERT INTO public.crew_assignments
    (company_id, project_id, crew_member_id, assigned_date, start_time, end_time,
     status, schedule_task_id, created_by, notes)
  VALUES
    (NEW.company_id, v_task.project_id, NEW.crew_member_id, v_task.start_date,
     '07:00', '15:30', 'scheduled', v_task.id, NEW.created_by,
     'From schedule task: ' || v_task.name)
  ON CONFLICT DO NOTHING
  RETURNING id INTO v_assignment;

  IF v_assignment IS NOT NULL THEN
    NEW.crew_assignment_id := v_assignment;
    UPDATE public.crew_assignments
       SET arrival_notification_sent = true
     WHERE id = v_assignment;
  END IF;

  INSERT INTO public.real_time_notifications
    (recipient_id, sender_id, type, title, message, data, priority)
  VALUES
    (NEW.crew_member_id, NEW.created_by, 'task_assignment',
     'You are scheduled: ' || v_task.name,
     COALESCE(v_project, 'A project') || ' on ' || to_char(v_task.start_date, 'Mon DD') ||
       ', ' || v_task.duration_days || ' day(s)',
     jsonb_build_object(
       'schedule_task_id', v_task.id,
       'project_id', v_task.project_id,
       'start_date', v_task.start_date,
       'duration_days', v_task.duration_days
     ),
     'normal');

  NEW.notified_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_assign_schedule_task_crew ON public.schedule_task_assignees;
CREATE TRIGGER trg_assign_schedule_task_crew
  BEFORE INSERT ON public.schedule_task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.assign_schedule_task_crew();

-- Removing an assignment takes its day-board row with it. Otherwise the crew
-- keeps showing up for work that was reassigned a week ago.
CREATE OR REPLACE FUNCTION public.unassign_schedule_task_crew()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF OLD.crew_assignment_id IS NOT NULL THEN
    DELETE FROM public.crew_assignments WHERE id = OLD.crew_assignment_id;
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_unassign_schedule_task_crew ON public.schedule_task_assignees;
CREATE TRIGGER trg_unassign_schedule_task_crew
  AFTER DELETE ON public.schedule_task_assignees
  FOR EACH ROW
  EXECUTE FUNCTION public.unassign_schedule_task_crew();

-- ---------------------------------------------------------------------------
-- 3. Rescheduling moves the crew and tells them
-- ---------------------------------------------------------------------------
-- ProjectSchedule's drag cascades new dates through dependencies, so one drag
-- can move a dozen tasks. Every crew on every one of them needs to know, which
-- is precisely why this is a trigger and not something the drag handler does.
CREATE OR REPLACE FUNCTION public.notify_schedule_task_reschedule()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project text;
  v_row     record;
BEGIN
  IF NEW.start_date = OLD.start_date AND NEW.duration_days = OLD.duration_days THEN
    RETURN NEW;
  END IF;

  SELECT name INTO v_project FROM public.projects WHERE id = NEW.project_id;

  FOR v_row IN
    SELECT a.id, a.crew_member_id, a.crew_assignment_id
      FROM public.schedule_task_assignees a
     WHERE a.schedule_task_id = NEW.id
  LOOP
    IF v_row.crew_assignment_id IS NOT NULL THEN
      UPDATE public.crew_assignments
         SET assigned_date = NEW.start_date,
             arrival_notification_sent = true,
             updated_at = now()
       WHERE id = v_row.crew_assignment_id;
    END IF;

    INSERT INTO public.real_time_notifications
      (recipient_id, type, title, message, data, priority)
    VALUES
      (v_row.crew_member_id, 'timeline_change',
       'Rescheduled: ' || NEW.name,
       COALESCE(v_project, 'A project') || ' moved from ' ||
         to_char(OLD.start_date, 'Mon DD') || ' to ' || to_char(NEW.start_date, 'Mon DD'),
       jsonb_build_object(
         'schedule_task_id', NEW.id,
         'project_id', NEW.project_id,
         'previous_start_date', OLD.start_date,
         'start_date', NEW.start_date
       ),
       'high');
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_notify_schedule_task_reschedule ON public.schedule_tasks;
CREATE TRIGGER trg_notify_schedule_task_reschedule
  AFTER UPDATE OF start_date, duration_days ON public.schedule_tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_schedule_task_reschedule();

-- ---------------------------------------------------------------------------
-- 4. One read for the schedule
-- ---------------------------------------------------------------------------
-- So ScheduleManagement, the project hub's Schedule tab and the mobile
-- Schedule item all ask the same question and get the same answer.
CREATE OR REPLACE VIEW public.schedule_board AS
SELECT
  t.id                       AS schedule_task_id,
  t.company_id,
  t.project_id,
  p.name                     AS project_name,
  p.status                   AS project_status,
  t.name                     AS task_name,
  t.start_date,
  t.duration_days,
  (t.start_date + (GREATEST(t.duration_days, 1) - 1) * INTERVAL '1 day')::date AS end_date,
  t.status,
  t.sort_order,
  COALESCE(crew.assignee_count, 0) AS assignee_count,
  crew.assignee_names
FROM public.schedule_tasks t
JOIN public.projects p ON p.id = t.project_id
LEFT JOIN LATERAL (
  SELECT count(*) AS assignee_count,
         string_agg(btrim(COALESCE(u.first_name, '') || ' ' || COALESCE(u.last_name, '')), ', ') AS assignee_names
    FROM public.schedule_task_assignees a
    JOIN public.user_profiles u ON u.id = a.crew_member_id
   WHERE a.schedule_task_id = t.id
) crew ON true;

COMMENT ON VIEW public.schedule_board IS
  'Every scheduled task with its project and its crew. The one read for the schedule; the presentational components that drew projects as bars are gone. US-329.';

GRANT SELECT ON public.schedule_board TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. The two tables with no readers
-- ---------------------------------------------------------------------------
-- Recorded as comments rather than dropped, per the deprecation flow: neither
-- has a writer either, so nothing is lost by leaving them, and dropping a
-- table in the same release that stops using it is the pattern CLAUDE.md
-- forbids.
COMMENT ON TABLE public.schedule_conflicts IS
  'DEPRECATED (US-329): zero readers and zero writers. Conflicts are visible on the crew board through the crew_assignments UNIQUE constraint, which is enforcement rather than a report. Remove a release after nothing references it.';

COMMENT ON TABLE public.project_milestones IS
  'KEPT (US-329): zero readers today, but this is what the client portal timeline should read - a customer wants "foundation poured", not 400 schedule tasks. Wiring it is US-107 and the portal work, not a deprecation.';
