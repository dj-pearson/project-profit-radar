-- Indexes for project status and closeout (US-328).
--
-- Alone in their own file because CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction block and the migration runner wraps each file in one.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_closeout_items_project
  ON public.project_closeout_items (project_id, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_closeout_items_company
  ON public.project_closeout_items (company_id);

-- The dashboard counts active projects per company; before US-328 it counted
-- every project, so this pair is newly on the hot path.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_company_status
  ON public.projects (company_id, status);

-- project_closeout_status counts open punch items per project.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_punch_list_items_project_status
  ON public.punch_list_items (project_id, status);
