-- One contract value, a schedule of values, and retainage that is real (US-327).
--
-- WHAT WAS THERE. Two screens invented the contract:
--
--   ProgressBillingManager.tsx:67   const totalBudget = 100000;
--   RetentionManager.tsx:71         const totalInvoiceValue = 100000;
--
-- Both then found their prior invoices by text search on the notes field
-- (.ilike('notes','%progress%') and '%retention%'), so an invoice whose note
-- happened to say "progress photos attached" was counted as a progress
-- billing. RetentionManager never wrote invoices.retention_percentage or
-- retention_amount, though both columns exist, so the withheld balance lived
-- nowhere.
--
-- Retention was modelled three times - invoice columns, retention_items,
-- retention_tracking - and none of the three was written by anything.
--
-- payment_applications was declared twice. The AIA G702 version in
-- 20250912192312 cannot have applied: its current_payment_due generates from
-- work_completed_and_stored, a column that does not exist (the column above it
-- is named total_completed_and_stored), and net_amount generates from
-- current_payment_due, which Postgres rejects because a generated column may
-- not reference another generated column. Everything after that CREATE TABLE
-- in that file, retention_items included, is therefore suspect on any database
-- where the file was run as written.
--
-- WHAT THIS DOES. One schedule of values per project, one retainage model on
-- the invoice, and both driven by projects.current_contract_value, which
-- 20260903060000 already added and change-order approval already moves.
--
-- The payment application IS the progress invoice here. A fourth table holding
-- the same G702 numbers is what produced three retention models, so instead
-- the SOV lines carry the G703 detail and the invoice carries the G702 header
-- (progress_percentage, previous_amount_billed, retention_amount, amount_due,
-- all existing columns). payment_applications is left in place, untouched and
-- commented as deprecated, per the append-only rule.
--
-- Additive throughout: new tables, new nullable columns, no drops, no
-- tightening. iOS at MIN_SUPPORTED_IOS_VERSION reads invoices and is
-- unaffected.

-- ---------------------------------------------------------------------------
-- 1. Retainage and billing terms live on the project
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS retainage_percentage NUMERIC(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS default_billing_rate NUMERIC(10,2),
  ADD COLUMN IF NOT EXISTS expense_markup_percentage NUMERIC(5,2) NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.projects.retainage_percentage IS
  'Percent of each progress billing the owner withholds until closeout. The one place retainage terms are set. US-327.';
COMMENT ON COLUMN public.projects.default_billing_rate IS
  'What an hour is billed at on this job when no per-employee billing rate is set. Distinct from cost, which resolve_labor_rate answers. US-327.';
COMMENT ON COLUMN public.projects.expense_markup_percentage IS
  'Markup applied to billable expenses pulled onto a time-and-materials invoice. US-327.';

-- Billing rate is not cost rate. labor_burden_rates already holds what an
-- employee costs; this is what the customer pays for their hour.
ALTER TABLE public.labor_burden_rates
  ADD COLUMN IF NOT EXISTS billing_rate NUMERIC(10,2);

COMMENT ON COLUMN public.labor_burden_rates.billing_rate IS
  'What this employee is billed out at. NULL falls back to the project default. US-327.';

-- ---------------------------------------------------------------------------
-- 2. The schedule of values
-- ---------------------------------------------------------------------------
-- The G703 continuation sheet: the contract broken into lines the owner and
-- the contractor both agreed to, each one billed by percent complete.
CREATE TABLE IF NOT EXISTS public.project_sov_lines (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  line_number INTEGER NOT NULL DEFAULT 1,
  description TEXT NOT NULL,
  scheduled_value NUMERIC(14,2) NOT NULL DEFAULT 0,
  -- Where the line came from, so a change order's line is distinguishable from
  -- the original contract and the SOV can be reconciled against
  -- original_contract_value + approved change orders.
  source TEXT NOT NULL DEFAULT 'manual'
    CHECK (source IN ('budget', 'estimate', 'change_order', 'manual')),
  change_order_id UUID REFERENCES public.change_orders(id) ON DELETE SET NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.project_sov_lines IS
  'The schedule of values: the contract split into billable lines. Progress invoices are generated from these, not from a constant. US-327.';

ALTER TABLE public.project_sov_lines ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'project_sov_lines' AND policyname = 'Staff manage their company SOV lines'
  ) THEN
    CREATE POLICY "Staff manage their company SOV lines"
      ON public.project_sov_lines FOR ALL
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- A progress invoice line names the SOV line it bills, so previously-billed is
-- a sum over rows rather than a text search on notes.
ALTER TABLE public.invoice_line_items
  ADD COLUMN IF NOT EXISTS sov_line_id UUID REFERENCES public.project_sov_lines(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.invoice_line_items.sov_line_id IS
  'The schedule-of-values line this bills. How previously-billed is computed. US-327.';

-- ---------------------------------------------------------------------------
-- 3. Seed the SOV from the budget
-- ---------------------------------------------------------------------------
-- project_budgets already holds the job broken down by cost code (US-318 seeds
-- it at conversion). That is the schedule of values, so do not make the
-- contractor type it a second time.
CREATE OR REPLACE FUNCTION public.seed_project_sov(p_project_id uuid)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_existing   integer;
  v_inserted   integer := 0;
BEGIN
  SELECT company_id INTO v_company_id
    FROM public.projects WHERE id = p_project_id;

  IF v_company_id IS NULL THEN
    RAISE EXCEPTION 'Project % does not exist', p_project_id;
  END IF;

  IF v_company_id <> public.get_user_company(auth.uid()) THEN
    RAISE EXCEPTION 'Not your project';
  END IF;

  -- Never overwrite an SOV somebody has already agreed to with the owner.
  SELECT count(*) INTO v_existing
    FROM public.project_sov_lines WHERE project_id = p_project_id;
  IF v_existing > 0 THEN
    RETURN 0;
  END IF;

  INSERT INTO public.project_sov_lines
    (project_id, company_id, cost_code_id, line_number, description,
     scheduled_value, source, sort_order)
  SELECT pb.project_id,
         v_company_id,
         pb.cost_code_id,
         row_number() OVER (ORDER BY cc.code NULLS LAST, cc.name NULLS LAST),
         COALESCE(cc.code || ' - ' || cc.name, cc.name, 'Contract work'),
         pb.budgeted_amount,
         'budget',
         (row_number() OVER (ORDER BY cc.code NULLS LAST, cc.name NULLS LAST))::int * 10
    FROM public.project_budgets pb
    LEFT JOIN public.cost_codes cc ON cc.id = pb.cost_code_id
   WHERE pb.project_id = p_project_id
     AND COALESCE(pb.budgeted_amount, 0) <> 0;

  GET DIAGNOSTICS v_inserted = ROW_COUNT;

  -- No budget breakdown: one line for the whole contract is still better than
  -- a screen that cannot bill at all.
  IF v_inserted = 0 THEN
    INSERT INTO public.project_sov_lines
      (project_id, company_id, line_number, description, scheduled_value, source, sort_order)
    SELECT p.id, v_company_id, 1, 'Contract',
           COALESCE(p.current_contract_value, p.original_contract_value, p.budget, 0),
           'manual', 10
      FROM public.projects p
     WHERE p.id = p_project_id
       AND COALESCE(p.current_contract_value, p.original_contract_value, p.budget, 0) > 0;
    GET DIAGNOSTICS v_inserted = ROW_COUNT;
  END IF;

  RETURN v_inserted;
END;
$$;

COMMENT ON FUNCTION public.seed_project_sov(uuid) IS
  'Builds a project schedule of values from its cost-code budget. Idempotent: does nothing once lines exist. US-327.';

REVOKE ALL ON FUNCTION public.seed_project_sov(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.seed_project_sov(uuid) TO authenticated;

-- ---------------------------------------------------------------------------
-- 4. An approved change order becomes an SOV line
-- ---------------------------------------------------------------------------
-- 20260903060000 already moves current_contract_value on approval. The SOV has
-- to move with it or the two disagree the moment a change order lands, which
-- is the same class of bug this story is closing.
CREATE OR REPLACE FUNCTION public.add_change_order_sov_line()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company_id uuid;
  v_next       integer;
BEGIN
  IF NEW.status <> 'approved' OR COALESCE(OLD.status, '') = 'approved' THEN
    RETURN NEW;
  END IF;

  IF COALESCE(NEW.amount, 0) = 0 OR NEW.project_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Only extend an SOV that exists. Creating one here would invent a schedule
  -- the owner never agreed to.
  IF NOT EXISTS (SELECT 1 FROM public.project_sov_lines WHERE project_id = NEW.project_id) THEN
    RETURN NEW;
  END IF;

  IF EXISTS (SELECT 1 FROM public.project_sov_lines WHERE change_order_id = NEW.id) THEN
    RETURN NEW;
  END IF;

  SELECT company_id INTO v_company_id FROM public.projects WHERE id = NEW.project_id;

  SELECT COALESCE(max(line_number), 0) + 1 INTO v_next
    FROM public.project_sov_lines WHERE project_id = NEW.project_id;

  INSERT INTO public.project_sov_lines
    (project_id, company_id, cost_code_id, line_number, description,
     scheduled_value, source, change_order_id, sort_order)
  VALUES
    (NEW.project_id, v_company_id, NEW.cost_code_id, v_next,
     COALESCE('CO ' || NEW.change_order_number || ' - ' || NEW.title, NEW.title, 'Change order'),
     NEW.amount, 'change_order', NEW.id, v_next * 10);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_change_order_sov_line ON public.change_orders;
CREATE TRIGGER trg_change_order_sov_line
  AFTER UPDATE OF status ON public.change_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.add_change_order_sov_line();

COMMENT ON FUNCTION public.add_change_order_sov_line() IS
  'Approved change orders extend the schedule of values, so the SOV total and current_contract_value stay equal. US-327.';

-- ---------------------------------------------------------------------------
-- 5. Off the notes hack
-- ---------------------------------------------------------------------------
-- invoices.invoice_type already exists and was never populated. These are the
-- values the billing screens now filter on. The backfill reads the same notes
-- text the old .ilike() queries did, once, so history is preserved rather than
-- reinterpreted, and nothing has to keep searching prose afterwards.
COMMENT ON COLUMN public.invoices.invoice_type IS
  'standard | progress | retention_release | time_and_materials | deposit. Replaces filtering invoices by notes text. US-327.';

UPDATE public.invoices
   SET invoice_type = 'retention_release'
 WHERE invoice_type IS NULL
   AND notes ILIKE '%retention%';

UPDATE public.invoices
   SET invoice_type = 'progress'
 WHERE invoice_type IS NULL
   AND notes ILIKE '%progress billing%';

UPDATE public.invoices
   SET invoice_type = 'standard'
 WHERE invoice_type IS NULL;

-- ---------------------------------------------------------------------------
-- 6. What has been billed, per SOV line
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.project_sov_status AS
SELECT
  l.id                AS sov_line_id,
  l.project_id,
  l.company_id,
  l.cost_code_id,
  l.line_number,
  l.description,
  l.scheduled_value,
  l.source,
  l.sort_order,
  COALESCE(billed.amount, 0)   AS previously_billed,
  CASE WHEN l.scheduled_value > 0
       THEN round(COALESCE(billed.amount, 0) / l.scheduled_value * 100, 2)
       ELSE 0 END              AS percent_billed,
  l.scheduled_value - COALESCE(billed.amount, 0) AS remaining_to_bill
FROM public.project_sov_lines l
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(li.total_price), 0) AS amount
    FROM public.invoice_line_items li
    JOIN public.invoices i ON i.id = li.invoice_id
   WHERE li.sov_line_id = l.id
     AND i.status <> 'cancelled'
) billed ON true;

COMMENT ON VIEW public.project_sov_status IS
  'Each schedule-of-values line with what has actually been invoiced against it. One definition of previously-billed. US-327.';

GRANT SELECT ON public.project_sov_status TO authenticated;

-- ---------------------------------------------------------------------------
-- 7. Retainage, once
-- ---------------------------------------------------------------------------
-- Withheld is the sum of what the progress invoices recorded withholding.
-- Released is the sum of the release invoices. Both come from invoices, which
-- is the model that already has the columns; retention_items and
-- retention_tracking are deprecated below rather than becoming a fourth
-- opinion.
CREATE OR REPLACE VIEW public.project_retainage AS
SELECT
  p.id                                   AS project_id,
  p.company_id,
  p.name                                 AS project_name,
  COALESCE(p.retainage_percentage, 0)    AS retainage_percentage,
  COALESCE(p.current_contract_value, p.original_contract_value, p.budget, 0) AS contract_value,
  COALESCE(withheld.amount, 0)           AS withheld_to_date,
  COALESCE(released.amount, 0)           AS released_to_date,
  COALESCE(withheld.amount, 0) - COALESCE(released.amount, 0) AS retainage_balance
FROM public.projects p
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(i.retention_amount), 0) AS amount
    FROM public.invoices i
   WHERE i.project_id = p.id
     AND i.status <> 'cancelled'
     AND COALESCE(i.invoice_type, 'standard') <> 'retention_release'
) withheld ON true
LEFT JOIN LATERAL (
  SELECT COALESCE(sum(i.total_amount), 0) AS amount
    FROM public.invoices i
   WHERE i.project_id = p.id
     AND i.status <> 'cancelled'
     AND i.invoice_type = 'retention_release'
) released ON true;

COMMENT ON VIEW public.project_retainage IS
  'Retainage withheld, released and outstanding per project, from the invoices themselves. The one retainage model. US-327.';

GRANT SELECT ON public.project_retainage TO authenticated;

COMMENT ON TABLE public.retention_items IS
  'DEPRECATED (US-327): retainage is tracked on invoices and read through project_retainage. No writer; scheduled for removal a release after clients stop reading it.';
COMMENT ON TABLE public.payment_applications IS
  'DEPRECATED (US-327): the payment application is the progress invoice plus its project_sov_lines. Left in place because migrations are append-only. Note that 20250912192312 declared this table with generated columns Postgres rejects, so its live shape may differ from that file.';

-- ---------------------------------------------------------------------------
-- 8. Time and materials
-- ---------------------------------------------------------------------------
-- An hour or a receipt must not be billable twice. Stamping the invoice on the
-- source row is the only thing that makes a second pull for the same period
-- safe, which is why it is a column and not a query.
ALTER TABLE public.time_entries
  ADD COLUMN IF NOT EXISTS billed_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS billed_invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.time_entries.billed_invoice_id IS
  'The T&M invoice this hour was billed on. Set once; prevents billing the same hour twice. US-327.';

CREATE OR REPLACE FUNCTION public.resolve_billing_rate(
  p_user_id uuid,
  p_company_id uuid,
  p_project_id uuid,
  p_on_date date DEFAULT CURRENT_DATE
)
RETURNS numeric
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_rate numeric;
BEGIN
  -- 1. What this employee is billed out at.
  SELECT lbr.billing_rate
    INTO v_rate
    FROM public.labor_burden_rates lbr
   WHERE lbr.employee_id = p_user_id
     AND lbr.company_id = p_company_id
     AND COALESCE(lbr.is_active, true)
     AND lbr.effective_date <= p_on_date
     AND lbr.billing_rate IS NOT NULL
   ORDER BY lbr.effective_date DESC
   LIMIT 1;

  IF v_rate IS NOT NULL AND v_rate > 0 THEN
    RETURN v_rate;
  END IF;

  -- 2. The job's default billing rate.
  SELECT p.default_billing_rate INTO v_rate
    FROM public.projects p WHERE p.id = p_project_id;

  IF v_rate IS NOT NULL AND v_rate > 0 THEN
    RETURN v_rate;
  END IF;

  -- 3. Nothing. NULL rather than a guess: billing a customer at an invented
  --    rate is worse than telling the estimator to set one.
  RETURN NULL;
END;
$$;

COMMENT ON FUNCTION public.resolve_billing_rate(uuid, uuid, uuid, date) IS
  'What an hour is billed at: the employee billing rate, else the project default, else NULL. Never a guess. US-327.';

REVOKE ALL ON FUNCTION public.resolve_billing_rate(uuid, uuid, uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.resolve_billing_rate(uuid, uuid, uuid, date) TO authenticated, service_role;

-- Unbilled approved work, ready to pull onto an invoice.
CREATE OR REPLACE VIEW public.project_unbilled_work AS
SELECT
  'time'::text                       AS source_type,
  t.id                               AS source_id,
  t.project_id,
  t.company_id,
  t.cost_code_id,
  t.start_time::date                 AS work_date,
  COALESCE(t.description, 'Labor')   AS description,
  COALESCE(t.total_hours, 0)         AS quantity,
  public.resolve_billing_rate(t.user_id, t.company_id, t.project_id, t.start_time::date) AS unit_price
FROM public.time_entries t
WHERE t.approval_status = 'approved'
  AND t.billed_invoice_id IS NULL
  AND COALESCE(t.total_hours, 0) > 0
UNION ALL
SELECT
  'expense',
  e.id,
  e.project_id,
  e.company_id,
  e.cost_code_id,
  e.expense_date,
  COALESCE(e.description, e.vendor_name, 'Expense'),
  1,
  round(e.amount * (1 + COALESCE(p.expense_markup_percentage, 0) / 100.0), 2)
FROM public.expenses e
JOIN public.projects p ON p.id = e.project_id
WHERE COALESCE(e.is_billable, false)
  AND e.billed_invoice_id IS NULL
  AND e.approved_at IS NOT NULL;

COMMENT ON VIEW public.project_unbilled_work IS
  'Approved hours and billable expenses not yet on an invoice, priced for the customer. The source for a time-and-materials invoice. US-327.';

GRANT SELECT ON public.project_unbilled_work TO authenticated;
