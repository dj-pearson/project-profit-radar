-- US-096: Estimate version history.
--
-- Each significant save of an estimate writes an immutable snapshot here so users
-- can view prior versions and compare them. The snapshot captures the estimate
-- header fields and its line items as JSON at that point in time.
--
-- Backward-compat: CREATE TABLE + RLS in a single migration is the "always safe"
-- additive path (see CLAUDE.md). No existing shape is altered.

CREATE TABLE IF NOT EXISTS public.estimate_versions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id    uuid NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  company_id     uuid NOT NULL,
  version_number integer NOT NULL,
  snapshot       jsonb NOT NULL,
  created_by     uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at     timestamptz NOT NULL DEFAULT now(),
  UNIQUE (estimate_id, version_number)
);

CREATE INDEX IF NOT EXISTS idx_estimate_versions_estimate
  ON public.estimate_versions (estimate_id, version_number DESC);

ALTER TABLE public.estimate_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Company members can view estimate versions"
  ON public.estimate_versions
  FOR SELECT
  TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can create estimate versions"
  ON public.estimate_versions
  FOR INSERT
  TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (
      ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'accounting'::user_role]
    )
  );
