-- US-223: DB-backed project Gantt — schedule tasks, dependencies, baselines.
--
-- The critical-path/float engine (src/lib/schedule/criticalPath.ts) and an
-- in-memory Gantt already exist (US-234). This adds the persistence layer so a
-- project's schedule (tasks + finish-to-start dependencies) is stored, a
-- baseline can be captured, and the live schedule can be compared to it (slip)
-- to feed the project health indicator.
--
-- Backward-compat: new tables + RLS in a single migration is the "always safe"
-- additive path (see CLAUDE.md). No existing shape is altered.

-- Schedule tasks: the dated bars on the Gantt (distinct from work-queue `tasks`).
CREATE TABLE IF NOT EXISTS public.schedule_tasks (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  project_id    uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name          text NOT NULL,
  start_date    date NOT NULL,
  duration_days integer NOT NULL DEFAULT 1 CHECK (duration_days >= 1),
  status        text NOT NULL DEFAULT 'not-started'
                CHECK (status IN ('not-started', 'in-progress', 'completed', 'delayed', 'on-hold')),
  sort_order    integer NOT NULL DEFAULT 0,
  created_by    uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- Finish-to-start dependencies between schedule tasks (with optional lag).
CREATE TABLE IF NOT EXISTS public.schedule_task_dependencies (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id     uuid NOT NULL,
  project_id     uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  predecessor_id uuid NOT NULL REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  successor_id   uuid NOT NULL REFERENCES public.schedule_tasks(id) ON DELETE CASCADE,
  lag_days       integer NOT NULL DEFAULT 0,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (predecessor_id, successor_id),
  CHECK (predecessor_id <> successor_id)
);

-- A captured baseline snapshot of the schedule for baseline-vs-actual comparison.
-- The task snapshot is stored as JSONB so a baseline is immutable even if tasks
-- are later edited or deleted.
CREATE TABLE IF NOT EXISTS public.schedule_baselines (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  project_id  uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name        text NOT NULL,
  is_current  boolean NOT NULL DEFAULT true,
  tasks       jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(tasks) = 'array'),
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_schedule_tasks_project
  ON public.schedule_tasks (company_id, project_id, sort_order);
CREATE INDEX IF NOT EXISTS idx_schedule_task_deps_project
  ON public.schedule_task_dependencies (company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_schedule_baselines_current
  ON public.schedule_baselines (company_id, project_id, is_current);

-- Tenant integrity: bind company_id to the referenced project, and keep
-- dependency edges within a single project+company, at the schema level.
DO $$
BEGIN
  -- projects.id is already the PK (so (id, company_id) is trivially unique);
  -- this composite key lets child tables reference it in a composite FK.
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_id_company_id_key'
  ) THEN
    ALTER TABLE public.projects ADD CONSTRAINT projects_id_company_id_key UNIQUE (id, company_id);
  END IF;
END $$;

-- schedule_tasks.company_id must match the project's company.
ALTER TABLE public.schedule_tasks
  ADD CONSTRAINT schedule_tasks_project_company_fk
  FOREIGN KEY (project_id, company_id)
  REFERENCES public.projects (id, company_id) ON DELETE CASCADE;

-- Composite key so dependency edges can be scoped to (task, company, project).
ALTER TABLE public.schedule_tasks
  ADD CONSTRAINT schedule_tasks_id_company_project_key
  UNIQUE (id, company_id, project_id);

-- Both endpoints of a dependency must live in the same project + company.
ALTER TABLE public.schedule_task_dependencies
  ADD CONSTRAINT schedule_task_deps_predecessor_scope_fk
  FOREIGN KEY (predecessor_id, company_id, project_id)
  REFERENCES public.schedule_tasks (id, company_id, project_id) ON DELETE CASCADE;
ALTER TABLE public.schedule_task_dependencies
  ADD CONSTRAINT schedule_task_deps_successor_scope_fk
  FOREIGN KEY (successor_id, company_id, project_id)
  REFERENCES public.schedule_tasks (id, company_id, project_id) ON DELETE CASCADE;

ALTER TABLE public.schedule_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.schedule_baselines ENABLE ROW LEVEL SECURITY;

-- Company members read; builders (admin/pm) write. Mirrors the change-order /
-- scheduling access model.
DO $$
DECLARE
  tbl text;
BEGIN
  FOREACH tbl IN ARRAY ARRAY['schedule_tasks', 'schedule_task_dependencies', 'schedule_baselines']
  LOOP
    EXECUTE format($f$
      CREATE POLICY "Company members can view %1$s"
        ON public.%1$s FOR SELECT TO authenticated
        USING (company_id = get_user_company(auth.uid()));
    $f$, tbl);

    EXECUTE format($f$
      CREATE POLICY "Builders can manage %1$s"
        ON public.%1$s FOR ALL TO authenticated
        USING (
          company_id = get_user_company(auth.uid())
          AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
        )
        WITH CHECK (
          company_id = get_user_company(auth.uid())
          AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
        );
    $f$, tbl);
  END LOOP;
END $$;

-- Keep updated_at fresh on writes (shared trigger function).
DROP TRIGGER IF EXISTS set_schedule_tasks_updated_at ON public.schedule_tasks;
CREATE TRIGGER set_schedule_tasks_updated_at
  BEFORE UPDATE ON public.schedule_tasks
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS set_schedule_baselines_updated_at ON public.schedule_baselines;
CREATE TRIGGER set_schedule_baselines_updated_at
  BEFORE UPDATE ON public.schedule_baselines
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
