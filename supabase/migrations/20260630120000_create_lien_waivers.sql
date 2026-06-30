-- US-227: Lien waiver management — request/receipt workflow, conditional vs
-- unconditional (progress vs final) tracking, payment-hold-until-received, and
-- an append-only audit trail of status changes.
--
-- Backward-compat: new tables + RLS + an additive UNIQUE on contractors(id,
-- company_id) (id is already unique, so the constraint can never fail on
-- existing rows). This is the "always safe" additive path (see CLAUDE.md).

-- Composite-FK tenant scoping: bind child company_id to the parent's company_id
-- at the schema level so a waiver can never reference a project/contractor from
-- another tenant. projects already exposes projects_id_company_id_key.
ALTER TABLE public.contractors
  DROP CONSTRAINT IF EXISTS contractors_id_company_id_key;
ALTER TABLE public.contractors
  ADD CONSTRAINT contractors_id_company_id_key UNIQUE (id, company_id);

CREATE TABLE IF NOT EXISTS public.lien_waivers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL,
  project_id    uuid NOT NULL,
  contractor_id uuid NOT NULL,
  waiver_type   text NOT NULL CHECK (waiver_type IN (
                  'conditional-progress', 'unconditional-progress',
                  'conditional-final', 'unconditional-final')),
  status        text NOT NULL DEFAULT 'requested' CHECK (status IN (
                  'draft', 'requested', 'sent', 'signed', 'received', 'rejected')),
  amount        numeric(14,2) NOT NULL DEFAULT 0 CHECK (amount >= 0),
  through_date  date NOT NULL,
  -- When true, this waiver gates release of the related contractor payment.
  holds_payment boolean NOT NULL DEFAULT true,
  payment_id    uuid,
  -- Reused e-signature (US-041): base64 PNG data URL captured on signing.
  signature     text,
  signed_by     text,
  signed_at     timestamptz,
  received_at   timestamptz,
  notes         text,
  created_by    uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lien_waivers_project_company_fk
    FOREIGN KEY (project_id, company_id)
    REFERENCES public.projects (id, company_id) ON DELETE CASCADE,
  CONSTRAINT lien_waivers_contractor_company_fk
    FOREIGN KEY (contractor_id, company_id)
    REFERENCES public.contractors (id, company_id) ON DELETE CASCADE,
  CONSTRAINT lien_waivers_id_company_id_key UNIQUE (id, company_id)
);

-- Append-only audit trail of status changes (acceptance: "stored with audit trail").
CREATE TABLE IF NOT EXISTS public.lien_waiver_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL,
  waiver_id   uuid NOT NULL,
  from_status text,
  to_status   text NOT NULL,
  note        text,
  created_by  uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT lien_waiver_events_waiver_company_fk
    FOREIGN KEY (waiver_id, company_id)
    REFERENCES public.lien_waivers (id, company_id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_lien_waivers_company
  ON public.lien_waivers (company_id, status);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_contractor
  ON public.lien_waivers (company_id, contractor_id);
CREATE INDEX IF NOT EXISTS idx_lien_waivers_project
  ON public.lien_waivers (company_id, project_id);
CREATE INDEX IF NOT EXISTS idx_lien_waiver_events_waiver
  ON public.lien_waiver_events (company_id, waiver_id, created_at DESC);

ALTER TABLE public.lien_waivers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lien_waiver_events ENABLE ROW LEVEL SECURITY;

-- Company members read; builders (admin/pm/root_admin) manage waivers.
CREATE POLICY "Company members can view lien waivers"
  ON public.lien_waivers FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can manage lien waivers"
  ON public.lien_waivers FOR ALL TO authenticated
  USING (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  )
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Audit events: company members read; builders append (append-only — no update/delete policy).
CREATE POLICY "Company members can view lien waiver events"
  ON public.lien_waiver_events FOR SELECT TO authenticated
  USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Builders can record lien waiver events"
  ON public.lien_waiver_events FOR INSERT TO authenticated
  WITH CHECK (
    company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role, 'project_manager'::user_role])
  );

-- Keep updated_at fresh on lien_waivers writes.
DROP TRIGGER IF EXISTS set_lien_waivers_updated_at ON public.lien_waivers;
CREATE TRIGGER set_lien_waivers_updated_at
  BEFORE UPDATE ON public.lien_waivers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
