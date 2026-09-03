-- Indexes for schedule assignment (US-329).
--
-- Alone in their own file because CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction block and the migration runner wraps each file in one.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_assignees_task
  ON public.schedule_task_assignees (schedule_task_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_assignees_crew_member
  ON public.schedule_task_assignees (crew_member_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_assignees_project
  ON public.schedule_task_assignees (project_id);

-- The reschedule trigger looks up every assignee of a task, and one drag can
-- cascade through a dozen tasks.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_crew_assignments_schedule_task
  ON public.crew_assignments (schedule_task_id)
  WHERE schedule_task_id IS NOT NULL;

-- schedule_board is the company-wide read; before US-329 nothing queried
-- schedule_tasks across projects.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_tasks_company_start
  ON public.schedule_tasks (company_id, start_date);
