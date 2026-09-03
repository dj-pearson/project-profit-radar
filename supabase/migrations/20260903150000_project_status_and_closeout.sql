-- Projects never leave planning, and closeout is a mock page (US-328).
--
-- WHAT WAS THERE. projectService.ts:288 hardcodes status 'planning' at
-- creation and nothing anywhere moves it. The one piece of code that looks
-- like it does cannot:
--
--   projectService.ts:213  updateProjectCompletion()
--     const updates: Partial<Project> = { completion_percentage, updated_at };
--     if (percentage === 100) updates.status = 'completed';
--     else if (percentage > 0 && updates.status === 'planning') ...
--
-- `updates` is a fresh local object that never carries a status, so the
-- planning-to-active branch reads a field it just failed to set and is dead.
-- The whole function has no callers either way.
--
-- So every project in the product is in planning forever. The dashboard's
-- "active projects" count papers over it by counting every project
-- (useDashboardData.tsx:137 returns projects.length), and two screens filter
-- on 'in_progress', a value the web app never writes.
--
-- projects.status also has no CHECK on any table anybody uses: only
-- 20250804010126 constrained it, and three migrations disagree about the
-- column set (the same thrash US-275 records for site_id).
--
-- WHAT THIS DOES. One status set with the transitions enforced in the
-- database, so it holds whichever client asks - the web app, iOS, or an edge
-- function - and a closeout checklist that persists.
--
-- BACKWARD COMPATIBILITY. The CHECK is additive in the sense that matters:
-- every value in use is admitted, anything unexpected is normalised first, and
-- no client can be rejected for writing a status it used to write. iOS at
-- MIN_SUPPORTED_IOS_VERSION only READS projects.status (Project.swift:35 maps
-- it through a ProjectStatus enum with an `.unknown` fallback and never sends
-- one), and its enum already covers active, completed, on_hold, planning and
-- cancelled. The one new value, 'closed', lands in that fallback and displays
-- as "Other" on an old build rather than breaking it.

-- ---------------------------------------------------------------------------
-- 1. Status timestamps
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS status_changed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS activated_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS completed_at      TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_at         TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS handover_sent_at  TIMESTAMPTZ;

COMMENT ON COLUMN public.projects.completed_at IS
  'When the work finished. Distinct from closed_at, which is when the money and the paperwork finished. US-328.';

-- ---------------------------------------------------------------------------
-- 2. One status set
-- ---------------------------------------------------------------------------
-- 'in_progress' is normalised to 'active': ProjectPipeline.tsx:58 and
-- CashFlowSnapshot.tsx:49 filter on it, but nothing in the product ever wrote
-- it, so any row carrying it came from a hand edit or an import.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'projects_status_check'
  ) THEN
    UPDATE public.projects SET status = 'active'
     WHERE status IN ('in_progress', 'in-progress', 'started');

    UPDATE public.projects SET status = 'planning'
     WHERE status IS NULL
        OR status NOT IN ('planning','active','on_hold','completed','closed','cancelled');

    ALTER TABLE public.projects
      ADD CONSTRAINT projects_status_check
      CHECK (status IN ('planning','active','on_hold','completed','closed','cancelled'));
  END IF;
END $$;

COMMENT ON COLUMN public.projects.status IS
  'planning | active | on_hold | completed | closed | cancelled. Moved only through set_project_status(), which enforces the transitions. US-328.';

-- ---------------------------------------------------------------------------
-- 3. The closeout checklist, persisted
-- ---------------------------------------------------------------------------
-- ProjectCloseout.tsx was a hardcoded array with dates like 2026-02-20 baked
-- in, no Supabase import and no route. Every contractor's closeout list
-- differs, so the rows are per project and editable rather than a fixed enum.
CREATE TABLE IF NOT EXISTS public.project_closeout_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category TEXT NOT NULL,
  name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending','in_progress','completed','not_applicable')),
  -- Whether the project can be marked complete with this outstanding. A final
  -- inspection is; a thank-you letter is not.
  is_required BOOLEAN NOT NULL DEFAULT true,
  completed_at TIMESTAMPTZ,
  completed_by UUID REFERENCES auth.users(id),
  due_date DATE,
  notes TEXT,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_closeout_items IS
  'The closeout checklist for one project. Replaces the hardcoded array in ProjectCloseout.tsx. US-328.';

ALTER TABLE public.project_closeout_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_closeout_items'
      AND policyname = 'Staff manage their company closeout items'
  ) THEN
    CREATE POLICY "Staff manage their company closeout items"
      ON public.project_closeout_items FOR ALL
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- Stamp completed_at from the status rather than trusting the caller to send
-- both, so "when was this signed off" is answerable.
CREATE OR REPLACE FUNCTION public.stamp_closeout_item_completion()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.status = 'completed' AND COALESCE(OLD.status, '') <> 'completed' THEN
    NEW.completed_at := now();
    NEW.completed_by := COALESCE(NEW.completed_by, auth.uid());
  ELSIF NEW.status <> 'completed' THEN
    NEW.completed_at := NULL;
    NEW.completed_by := NULL;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_closeout_item_completion ON public.project_closeout_items;
CREATE TRIGGER trg_closeout_item_completion
  BEFORE INSERT OR UPDATE ON public.project_closeout_items
  FOR EACH ROW
  EXECUTE FUNCTION public.stamp_closeout_item_completion();

-- ---------------------------------------------------------------------------
-- 4. Seed a standard checklist
-- ---------------------------------------------------------------------------
-- The categories from the old mock page, which were a reasonable list; the
-- fiction was the baked-in dates and completion states, not the items.
CREATE OR REPLACE FUNCTION public.seed_project_closeout(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_inserted   integer := 0;
BEGIN
  SELECT company_id INTO v_company_id FROM public.projects WHERE id = p_project_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Project % does not exist', p_project_id;
  END IF;
  IF v_company_id <> public.get_user_company(auth.uid()) THEN
    RAISE EXCEPTION 'Not your project';
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_closeout_items WHERE project_id = p_project_id) THEN
    RETURN 0;
  END IF;

  INSERT INTO public.project_closeout_items
    (project_id, company_id, category, name, is_required, sort_order)
  VALUES
    (p_project_id, v_company_id, 'Final inspections', 'Building department final inspection', true, 10),
    (p_project_id, v_company_id, 'Final inspections', 'Electrical final inspection', true, 20),
    (p_project_id, v_company_id, 'Final inspections', 'Plumbing final inspection', true, 30),
    (p_project_id, v_company_id, 'Final inspections', 'Mechanical inspection', false, 40),
    (p_project_id, v_company_id, 'Final inspections', 'Fire marshal inspection', false, 50),
    (p_project_id, v_company_id, 'Documentation', 'As-built drawings', true, 60),
    (p_project_id, v_company_id, 'Documentation', 'Operation and maintenance manuals', false, 70),
    (p_project_id, v_company_id, 'Documentation', 'Warranty documents collected', true, 80),
    (p_project_id, v_company_id, 'Documentation', 'Lien waivers from subcontractors', true, 90),
    (p_project_id, v_company_id, 'Closeout', 'Punch list complete', true, 100),
    (p_project_id, v_company_id, 'Closeout', 'Final cleaning', false, 110),
    (p_project_id, v_company_id, 'Closeout', 'Keys and access handed over', true, 120),
    (p_project_id, v_company_id, 'Closeout', 'Owner walkthrough and sign-off', true, 130),
    (p_project_id, v_company_id, 'Financial', 'Final invoice issued', true, 140),
    (p_project_id, v_company_id, 'Financial', 'Retainage released', false, 150);

  GET DIAGNOSTICS v_inserted = ROW_COUNT;
  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.seed_project_closeout(uuid) IS
  'Creates a standard closeout checklist for a project. Idempotent. US-328.';

REVOKE ALL ON FUNCTION public.seed_project_closeout(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_project_closeout(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 5. What closeout is waiting on
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.project_closeout_status AS
SELECT
  p.id                                    AS project_id,
  p.company_id,
  p.name                                  AS project_name,
  p.status,
  COALESCE(punch.open_items, 0)           AS open_punch_items,
  COALESCE(punch.total_items, 0)          AS total_punch_items,
  COALESCE(checklist.required_open, 0)    AS required_checklist_open,
  COALESCE(checklist.total_items, 0)      AS total_checklist_items,
  COALESCE(checklist.completed_items, 0)  AS completed_checklist_items,
  COALESCE(money.unpaid_total, 0)         AS unpaid_invoice_total,
  COALESCE(money.invoice_count, 0)        AS invoice_count,
  COALESCE(warranty.registered, 0)        AS warranties_registered,
  p.handover_sent_at
FROM public.projects p
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE COALESCE(pli.status, 'open') NOT IN ('completed','closed','verified')) AS open_items,
         count(*) AS total_items
    FROM public.punch_list_items pli
   WHERE pli.project_id = p.id
) punch ON true
LEFT JOIN LATERAL (
  SELECT count(*) FILTER (WHERE ci.is_required AND ci.status NOT IN ('completed','not_applicable')) AS required_open,
         count(*) AS total_items,
         count(*) FILTER (WHERE ci.status = 'completed') AS completed_items
    FROM public.project_closeout_items ci
   WHERE ci.project_id = p.id
) checklist ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(i.amount_due), 0) AS unpaid_total,
         count(*) AS invoice_count
    FROM public.invoices i
   WHERE i.project_id = p.id
     AND i.status NOT IN ('cancelled', 'paid')
) money ON true
LEFT JOIN LATERAL (
  SELECT count(*) AS registered
    FROM public.warranties w
   WHERE w.project_id = p.id
) warranty ON true;

COMMENT ON VIEW public.project_closeout_status IS
  'Everything blocking a project from being completed or closed: open punch items, required checklist items, unpaid invoices. US-328.';

GRANT SELECT ON public.project_closeout_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. The transition, enforced
-- ---------------------------------------------------------------------------
-- In the database rather than in the screen, because the rules have to hold
-- for whichever client asks. An override is allowed - a contractor who cannot
-- close a job because of a $12 disputed invoice will simply stop using the
-- status - but it must be given a reason, and the reason is audited.
CREATE OR REPLACE FUNCTION public.set_project_status(
  p_project_id uuid,
  p_status text,
  p_override_reason text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project   public.projects;
  v_open_punch    integer;
  v_required_open integer;
  v_unpaid        numeric;
  v_override  boolean := p_override_reason IS NOT NULL AND btrim(p_override_reason) <> '';
BEGIN
  IF p_status NOT IN ('planning','active','on_hold','completed','closed','cancelled') THEN
    RAISE EXCEPTION 'Unknown project status: %', p_status;
  END IF;

  SELECT * INTO v_project FROM public.projects WHERE id = p_project_id;
  IF v_project.id IS NULL THEN
    RAISE EXCEPTION 'Project % does not exist', p_project_id;
  END IF;
  IF v_project.company_id <> public.get_user_company(auth.uid()) THEN
    RAISE EXCEPTION 'Not your project';
  END IF;

  IF v_project.status = p_status THEN
    RETURN p_status;
  END IF;

  -- Cancelled is always reachable. A job that fell through must not be stuck
  -- open because its punch list was never started.
  IF p_status = 'active' AND v_project.start_date IS NULL AND NOT v_override THEN
    RAISE EXCEPTION 'A project needs a start date before it goes active';
  END IF;

  IF p_status = 'completed' THEN
    SELECT open_punch_items, required_checklist_open
      INTO v_open_punch, v_required_open
      FROM public.project_closeout_status WHERE project_id = p_project_id;

    IF NOT v_override AND COALESCE(v_open_punch, 0) > 0 THEN
      RAISE EXCEPTION 'Cannot complete: % punch list item(s) are still open', v_open_punch;
    END IF;
    IF NOT v_override AND COALESCE(v_required_open, 0) > 0 THEN
      RAISE EXCEPTION 'Cannot complete: % required closeout item(s) are outstanding', v_required_open;
    END IF;
  END IF;

  IF p_status = 'closed' THEN
    SELECT unpaid_invoice_total INTO v_unpaid
      FROM public.project_closeout_status WHERE project_id = p_project_id;

    IF NOT v_override AND COALESCE(v_unpaid, 0) > 0 THEN
      RAISE EXCEPTION 'Cannot close: % is still outstanding on this job', to_char(v_unpaid, 'FM999999990.00');
    END IF;
  END IF;

  UPDATE public.projects
     SET status            = p_status,
         status_changed_at = now(),
         activated_at      = CASE WHEN p_status = 'active'    THEN COALESCE(activated_at, now()) ELSE activated_at END,
         completed_at      = CASE WHEN p_status = 'completed'  THEN COALESCE(completed_at, now())
                                  WHEN p_status IN ('planning','active','on_hold') THEN NULL
                                  ELSE completed_at END,
         closed_at         = CASE WHEN p_status = 'closed'     THEN COALESCE(closed_at, now())
                                  WHEN p_status <> 'closed'    THEN NULL
                                  ELSE closed_at END,
         updated_at        = now()
   WHERE id = p_project_id;

  -- The audit trail. Written directly rather than through log_audit_event(),
  -- which inserts into table_name/operation/record_id - columns audit_logs
  -- does not have. That function is broken; fixing it is not this story.
  INSERT INTO public.audit_logs
    (company_id, site_id, user_id, action, action_type, resource_type, resource_id,
     resource_name, old_values, new_values, description, is_sensitive)
  VALUES
    (v_project.company_id, v_project.site_id, auth.uid(),
     'project.status_changed', 'update', 'project', p_project_id,
     v_project.name,
     jsonb_build_object('status', v_project.status),
     jsonb_build_object('status', p_status),
     CASE WHEN v_override
          THEN 'Status changed with override: ' || p_override_reason
          ELSE 'Status changed' END,
     v_override);

  RETURN p_status;
END;
$$;

COMMENT ON FUNCTION public.set_project_status(uuid, text, text) IS
  'The one way a project changes status. Enforces: active needs a start date, completed needs the punch list and required closeout items done, closed needs the money in. An override needs a reason and is audited. US-328.';

REVOKE ALL ON FUNCTION public.set_project_status(uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_project_status(uuid, text, text) TO authenticated;
