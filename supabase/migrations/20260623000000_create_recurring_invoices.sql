-- US-068: Recurring invoice configurations for retainer / progress billing.
--
-- Stores a recurring schedule (frequency, start/end or occurrence cap, template
-- line items) that drives automated invoice generation. Generation itself runs
-- elsewhere (edge function / cron); this table is the source of truth + UI state.
--
-- Backward-compat: CREATE TABLE + RLS in a single migration is the "always safe"
-- additive path (see CLAUDE.md > Backward Compatibility). No existing shape is
-- altered, so older clients are unaffected.

CREATE TABLE IF NOT EXISTS public.recurring_invoices (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id         uuid NOT NULL,
  project_id         uuid REFERENCES public.projects(id) ON DELETE SET NULL,
  created_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  name               text NOT NULL,
  client_name        text,
  frequency          text NOT NULL DEFAULT 'monthly'
                       CHECK (frequency IN ('weekly', 'biweekly', 'monthly')),
  start_date         date NOT NULL,
  end_date           date,
  occurrence_limit   integer,
  occurrences_generated integer NOT NULL DEFAULT 0,
  next_run_date      date,
  status             text NOT NULL DEFAULT 'active'
                       CHECK (status IN ('active', 'paused', 'completed')),
  line_items         jsonb NOT NULL DEFAULT '[]'::jsonb,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_company
  ON public.recurring_invoices (company_id, status);

CREATE INDEX IF NOT EXISTS idx_recurring_invoices_next_run
  ON public.recurring_invoices (next_run_date)
  WHERE status = 'active';

ALTER TABLE public.recurring_invoices ENABLE ROW LEVEL SECURITY;

-- Company-scoped visibility for the same roles that manage invoices.
CREATE POLICY "Accounting and management can view recurring invoices"
  ON public.recurring_invoices
  FOR SELECT
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role, 'office_staff'::user_role]
    )
  );

CREATE POLICY "Accounting and management can create recurring invoices"
  ON public.recurring_invoices
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role, 'office_staff'::user_role]
    )
  );

CREATE POLICY "Accounting and management can update recurring invoices"
  ON public.recurring_invoices
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role, 'office_staff'::user_role]
    )
  );

CREATE POLICY "Accounting and management can delete recurring invoices"
  ON public.recurring_invoices
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role]
    )
  );

-- Keep updated_at fresh on writes (reuses the shared trigger fn if present).
DROP TRIGGER IF EXISTS set_recurring_invoices_updated_at ON public.recurring_invoices;
CREATE TRIGGER set_recurring_invoices_updated_at
  BEFORE UPDATE ON public.recurring_invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
