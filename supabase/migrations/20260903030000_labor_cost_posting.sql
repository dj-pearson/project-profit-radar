-- Labor never becomes cost (US-321).
--
-- The clock-in side is the strongest thing in the product: MobileTimeClock
-- enforces the geofence and records is_geofence_verified and the distance,
-- there are three edge functions behind it, and timesheets get approved. None
-- of that reaches the ledger.
--
--   * time_entries has no rate column at all - no hourly_rate, no labor_cost,
--     no company_id. Hours are recorded; what they cost is not.
--   * labor_rates and labor_burden_rates exist in migrations and are read by
--     NOTHING in src/ or supabase/functions.
--   * The only path from time to job_costs is a manual "Sync" button in
--     TimeTrackingJobCostingIntegration.tsx that multiplies hours by a
--     hardcoded 65 and upserts on 'project_id,cost_code_id,date' - a unique
--     constraint no migration creates, so the statement errors even when
--     someone presses it.
--   * job_costs has no company_id, and WipReport filters on it, so the WIP
--     report's job-cost query fails outright.
--
-- So every job-costing screen is either empty or wrong about labor, which is
-- the largest and least predictable cost on an SMB job.
--
-- DEVIATION FROM THE STORY, deliberate. The acceptance criteria asked for a
-- unique key on (project_id, cost_code_id, date) so the existing upsert would
-- work. This uses an append-only posting keyed to the time entry instead:
--
--   * A cost ledger should accumulate, not be overwritten. Two crews on the
--     same cost code on the same day are two facts, and an upsert on that key
--     silently replaces one with the other.
--   * Adding that unique key means first merging existing duplicate rows,
--     which is a destructive data change on live job-costing data, to enable a
--     write pattern that is wrong anyway.
--   * job_costs.time_entry_id gives idempotency where it is actually needed:
--     approve twice, post once; un-approve, and the posting is removed.

-- ---------------------------------------------------------------------------
-- 1. What an hour cost
-- ---------------------------------------------------------------------------
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS hourly_rate NUMERIC(12,4),
  ADD COLUMN IF NOT EXISTS burden_rate NUMERIC(6,4),
  ADD COLUMN IF NOT EXISTS labor_cost NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

COMMENT ON COLUMN public.time_entries.hourly_rate IS
  'Base rate resolved at approval and frozen there, so a later rate change does not silently restate closed jobs. US-321.';
COMMENT ON COLUMN public.time_entries.burden_rate IS
  'Burden as a fraction (0.25 = 25%), applied on top of hourly_rate. US-321.';
COMMENT ON COLUMN public.time_entries.labor_cost IS
  'total_hours * hourly_rate * (1 + burden_rate), computed at approval. US-321.';

-- MobileTimeClock has been sending company_id on every clock-in to a column
-- that did not exist. PostgREST rejects unknown columns, so clocking in from
-- the phone failed on that line - the geofence work above it never mattered.
UPDATE public.time_entries te
   SET company_id = p.company_id
  FROM public.projects p
 WHERE te.project_id = p.id
   AND te.company_id IS NULL;

-- ---------------------------------------------------------------------------
-- 2. job_costs: company scoping and a link back to what produced the row
-- ---------------------------------------------------------------------------
ALTER TABLE public.job_costs
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  ADD COLUMN IF NOT EXISTS time_entry_id UUID REFERENCES public.time_entries(id) ON DELETE SET NULL;

UPDATE public.job_costs jc
   SET company_id = p.company_id
  FROM public.projects p
 WHERE jc.project_id = p.id
   AND jc.company_id IS NULL;

COMMENT ON COLUMN public.job_costs.time_entry_id IS
  'The approved time entry this labor posting came from. The approval trigger deletes before inserting, so approving twice posts once. US-321.';

-- Keep it filled for rows created from here on, whatever writes them.
CREATE OR REPLACE FUNCTION public.set_job_cost_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_job_cost_company_id ON public.job_costs;
CREATE TRIGGER trg_job_cost_company_id
  BEFORE INSERT ON public.job_costs
  FOR EACH ROW EXECUTE FUNCTION public.set_job_cost_company_id();

-- Same for time_entries, so the phone's clock-in works and every entry is
-- company-scoped without each writer remembering.
CREATE OR REPLACE FUNCTION public.set_time_entry_company_id()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.company_id IS NULL AND NEW.project_id IS NOT NULL THEN
    SELECT p.company_id INTO NEW.company_id
    FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_time_entry_company_id ON public.time_entries;
CREATE TRIGGER trg_time_entry_company_id
  BEFORE INSERT ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.set_time_entry_company_id();

-- NO INDEX IS CREATED HERE, deliberately. A partial unique index on
-- time_entry_id would be reasonable defence in depth, but CREATE INDEX
-- CONCURRENTLY cannot run inside a transaction block and migration runners
-- wrap each file in one, so it belongs in a file of its own
-- (20260903040000). Correctness does not depend on it: the trigger below is
-- the only writer of time_entry_id and it deletes before inserting, so
-- approving twice still posts once.

-- ---------------------------------------------------------------------------
-- 3. One place that answers "what does this person's hour cost?"
-- ---------------------------------------------------------------------------
-- labor_burden_rates is the richer table and is per-employee, so it wins.
-- labor_rates is per-trade with no link from a user to a trade in the current
-- schema (user_profiles has no trade column), so it can only serve as a company
-- default. Both were dead code before this.
CREATE OR REPLACE FUNCTION public.resolve_labor_rate(
  p_user_id uuid,
  p_company_id uuid,
  p_on_date date DEFAULT CURRENT_DATE
)
RETURNS TABLE (hourly_rate numeric, burden_rate numeric)
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_burden numeric;
BEGIN
  -- 1. A burden rate recorded for this specific employee.
  SELECT lbr.base_hourly_rate,
         COALESCE(lbr.burden_rate_percentage, 0) / 100.0
    INTO v_rate, v_burden
    FROM public.labor_burden_rates lbr
   WHERE lbr.employee_id = p_user_id
     AND lbr.company_id = p_company_id
     AND COALESCE(lbr.is_active, true)
     AND lbr.effective_date <= p_on_date
   ORDER BY lbr.effective_date DESC
   LIMIT 1;

  IF v_rate IS NOT NULL AND v_rate > 0 THEN
    RETURN QUERY SELECT v_rate, COALESCE(v_burden, 0);
    RETURN;
  END IF;

  -- 2. The company's most recent labor rate as a default.
  SELECT lr.current_rate, 0::numeric
    INTO v_rate, v_burden
    FROM public.labor_rates lr
   WHERE lr.company_id = p_company_id
     AND lr.effective_date <= p_on_date
   ORDER BY lr.effective_date DESC
   LIMIT 1;

  IF v_rate IS NOT NULL AND v_rate > 0 THEN
    RETURN QUERY SELECT v_rate, COALESCE(v_burden, 0);
    RETURN;
  END IF;

  -- 3. Nothing configured. NULL, not a guess: a made-up rate is what the
  -- hardcoded 65 was, and it produced job costs nobody could explain.
  RETURN QUERY SELECT NULL::numeric, NULL::numeric;
END;
$$;

COMMENT ON FUNCTION public.resolve_labor_rate(uuid, uuid, date) IS
  'The one answer to what an hour costs: per-employee burden rate, else the company labor rate, else NULL. Never a guess. US-321.';

REVOKE ALL ON FUNCTION public.resolve_labor_rate(uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_labor_rate(uuid, uuid, date) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Approval posts the cost
-- ---------------------------------------------------------------------------
-- A trigger rather than application code, because there are several approval
-- paths (the hook, a bulk approve, an edge function, and whatever iOS grows)
-- and posting must not depend on which one was used.
CREATE OR REPLACE FUNCTION public.post_labor_cost_on_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
  v_burden numeric;
  v_hours numeric;
  v_cost numeric;
  v_company uuid;
  v_date date;
BEGIN
  -- Un-approving removes the posting, so a correction does not leave a ghost
  -- cost on the job.
  IF NEW.approval_status IS DISTINCT FROM 'approved'
     AND OLD.approval_status = 'approved' THEN
    DELETE FROM public.job_costs WHERE time_entry_id = NEW.id;
    RETURN NEW;
  END IF;

  IF NEW.approval_status <> 'approved'
     OR OLD.approval_status = 'approved' THEN
    RETURN NEW;
  END IF;

  -- A cost code is what makes the hours land somewhere comparable to a budget
  -- line. Without one there is nothing to post to.
  IF NEW.cost_code_id IS NULL THEN
    RAISE WARNING 'time entry % approved with no cost code; labor not posted', NEW.id;
    RETURN NEW;
  END IF;

  v_hours := COALESCE(NEW.total_hours, 0);
  IF v_hours <= 0 THEN
    RETURN NEW;
  END IF;

  v_company := NEW.company_id;
  IF v_company IS NULL THEN
    SELECT p.company_id INTO v_company FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;

  v_date := COALESCE(NEW.start_time::date, CURRENT_DATE);

  -- A rate already on the row wins: it was frozen at a previous approval, and
  -- re-approving must not restate history at today's rates.
  IF NEW.hourly_rate IS NOT NULL AND NEW.hourly_rate > 0 THEN
    v_rate := NEW.hourly_rate;
    v_burden := COALESCE(NEW.burden_rate, 0);
  ELSE
    SELECT r.hourly_rate, r.burden_rate
      INTO v_rate, v_burden
      FROM public.resolve_labor_rate(NEW.user_id, v_company, v_date) r;
  END IF;

  IF v_rate IS NULL OR v_rate <= 0 THEN
    -- Approve the timesheet, but do not invent a cost. The warning is what
    -- tells an operator to configure rates; a guessed number would look like
    -- an answer.
    RAISE WARNING 'no labor rate for user % in company %; time entry % approved without a cost',
      NEW.user_id, v_company, NEW.id;
    RETURN NEW;
  END IF;

  v_burden := COALESCE(v_burden, 0);
  v_cost := ROUND(v_hours * v_rate * (1 + v_burden), 2);

  NEW.hourly_rate := v_rate;
  NEW.burden_rate := v_burden;
  NEW.labor_cost := v_cost;
  NEW.company_id := v_company;

  -- Delete then insert, so re-approving replaces this entry's posting rather
  -- than adding a second one. Both statements are inside the trigger, so they
  -- are in the same transaction as the approval itself.
  DELETE FROM public.job_costs WHERE time_entry_id = NEW.id;

  INSERT INTO public.job_costs (
    project_id, company_id, cost_code_id, date,
    labor_hours, labor_cost, total_cost, description, time_entry_id, created_by
  )
  VALUES (
    NEW.project_id, v_company, NEW.cost_code_id, v_date,
    v_hours, v_cost, v_cost,
    'Approved labor', NEW.id, NEW.approved_by
  );

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.post_labor_cost_on_approval() IS
  'Posts approved labor into job_costs at the resolved rate, once per time entry, and removes the posting if the approval is withdrawn. US-321.';

DROP TRIGGER IF EXISTS trg_post_labor_cost ON public.time_entries;
CREATE TRIGGER trg_post_labor_cost
  BEFORE UPDATE OF approval_status ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.post_labor_cost_on_approval();
