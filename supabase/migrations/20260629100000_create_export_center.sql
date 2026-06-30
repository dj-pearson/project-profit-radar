-- US-086: Export Center — scheduled report delivery + export history.
--
-- scheduled_reports stores recurring report-email configs (a delivery worker /
-- edge function processes due rows — out of scope for this UI-first slice).
-- export_history records each on-demand export so it can be re-downloaded.
--
-- Backward-compat: new tables + RLS in a single migration is the "always safe"
-- additive path (see CLAUDE.md). No existing shape is altered.

CREATE TABLE IF NOT EXISTS public.scheduled_reports (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  name        text NOT NULL,
  template    text NOT NULL,
  format      text NOT NULL DEFAULT 'pdf' CHECK (format IN ('pdf', 'excel', 'csv')),
  filters     jsonb NOT NULL DEFAULT '{}'::jsonb,
  frequency   text NOT NULL CHECK (frequency IN ('daily', 'weekly', 'monthly')),
  recipients  text[] NOT NULL DEFAULT '{}',
  start_date  date NOT NULL,
  next_run_at date,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.export_history (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  template   text NOT NULL,
  format     text NOT NULL CHECK (format IN ('pdf', 'excel', 'csv')),
  filters    jsonb NOT NULL DEFAULT '{}'::jsonb,
  row_count  integer NOT NULL DEFAULT 0,
  status     text NOT NULL DEFAULT 'completed',
  created_by uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_reports_company
  ON public.scheduled_reports (company_id, is_active, next_run_at);
CREATE INDEX IF NOT EXISTS idx_export_history_company
  ON public.export_history (company_id, created_at DESC);

ALTER TABLE public.scheduled_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;

-- Company members read; builders (admin/pm) manage. export_history rows are
-- written by whoever runs an export (any company member).
CREATE POLICY "Company members can view scheduled reports"
  ON public.scheduled_reports FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can manage scheduled reports"
  ON public.scheduled_reports FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

CREATE POLICY "Company members can view export history"
  ON public.export_history FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Company members can record exports"
  ON public.export_history FOR INSERT TO authenticated
  WITH CHECK (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can delete export history"
  ON public.export_history FOR DELETE TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Keep updated_at fresh on scheduled_reports writes.
DROP TRIGGER IF EXISTS set_scheduled_reports_updated_at ON public.scheduled_reports;
CREATE TRIGGER set_scheduled_reports_updated_at
  BEFORE UPDATE ON public.scheduled_reports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
