-- US-087: Configurable approval workflow builder.
--
-- Stores company-defined approval workflows for timesheets, change orders,
-- invoices, and expenses. Each workflow holds an ordered chain of approval
-- steps and optional conditional rules (e.g. amount > $5000) as JSONB so the
-- builder UI can evolve the rule shape without further migrations.
--
-- Backward-compat: CREATE TABLE + RLS in a single migration is the "always
-- safe" additive path (see CLAUDE.md). No existing shape is altered.

CREATE TABLE IF NOT EXISTS public.approval_workflows (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  name        text NOT NULL,
  description text,
  entity_type text NOT NULL CHECK (entity_type IN ('timesheet', 'change_order', 'invoice', 'expense')),
  steps       jsonb NOT NULL DEFAULT '[]'::jsonb,
  conditions  jsonb NOT NULL DEFAULT '[]'::jsonb,
  is_active   boolean NOT NULL DEFAULT true,
  created_by  uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_approval_workflows_company
  ON public.approval_workflows (company_id, entity_type, is_active);

ALTER TABLE public.approval_workflows ENABLE ROW LEVEL SECURITY;

-- Company members can read their company's workflows (the configured chain is
-- needed wherever approvals are surfaced).
CREATE POLICY "Company members can view approval workflows"
  ON public.approval_workflows
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company(auth.uid()));

-- Only admins configure workflows.
CREATE POLICY "Admins can create approval workflows"
  ON public.approval_workflows
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Admins can update approval workflows"
  ON public.approval_workflows
  FOR UPDATE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Admins can delete approval workflows"
  ON public.approval_workflows
  FOR DELETE
  TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

-- Keep updated_at fresh on writes (shared trigger function).
DROP TRIGGER IF EXISTS set_approval_workflows_updated_at ON public.approval_workflows;
CREATE TRIGGER set_approval_workflows_updated_at
  BEFORE UPDATE ON public.approval_workflows
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
