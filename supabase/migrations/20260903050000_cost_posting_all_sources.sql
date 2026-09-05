-- Committed and incurred costs never reach job costing (US-322).
--
-- The capture side is fine. PurchaseOrderForm writes cost_code_id on every
-- purchase order line, ExpenseTracker writes expenses.cost_code_id, bills carry
-- project_id and their lines carry both, and subcontractor_payments carries the
-- project. Every one of those is a cost on a job, and not one of them reaches
-- job_costs: grepping the purchasing components, the expense tracker and the
-- AP pages for job_costs returns nothing.
--
-- So /job-costing, LiveBudgetTracker and the WIP report see labor only - and
-- until US-321 they did not really see that either. A contractor looking at
-- budget vs actual on a job halfway through was reading a number that excluded
-- every material delivery, every receipt and every subcontractor payment.
--
-- One posting path, reusing the (source_type, source_id) key US-321 introduced:
-- delete by that key, then insert. Posting twice posts once; voiding the source
-- removes the row. Five sources, one shape.
--
-- WHAT IS DELIBERATELY NOT POSTED HERE: an open purchase order. That is
-- committed cost, not incurred cost, and mixing the two is how a job appears
-- over budget the day it orders lumber and under budget the day it arrives.
-- Committed cost is derived from open purchase orders at read time - see
-- project_committed_costs below - and shown beside actuals rather than inside
-- them.

-- ---------------------------------------------------------------------------
-- 1. Somewhere for subcontractor cost to land
-- ---------------------------------------------------------------------------
-- project_budgets already has subcontractor_budget. job_costs had no matching
-- column, so a subcontractor's cost had nowhere to go that budget vs actual
-- could compare like with like.
ALTER TABLE public.job_costs
  ADD COLUMN IF NOT EXISTS subcontractor_cost NUMERIC(14,2);

COMMENT ON COLUMN public.job_costs.subcontractor_cost IS
  'Subcontractor cost, so it can be compared against project_budgets.subcontractor_budget. US-322.';

-- ---------------------------------------------------------------------------
-- 2. The one posting helper
-- ---------------------------------------------------------------------------
-- Every source calls this, so "what does posting a cost mean" has one answer.
-- SECURITY DEFINER because it is called from triggers on tables whose writers
-- have no reason to hold write access to the ledger directly.
CREATE OR REPLACE FUNCTION public.post_job_cost(
  p_source_type text,
  p_source_id uuid,
  p_project_id uuid,
  p_cost_code_id uuid,
  p_date date,
  p_description text,
  p_labor numeric DEFAULT NULL,
  p_material numeric DEFAULT NULL,
  p_equipment numeric DEFAULT NULL,
  p_subcontractor numeric DEFAULT NULL,
  p_other numeric DEFAULT NULL,
  p_created_by uuid DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_total numeric;
BEGIN
  -- Withdrawing a posting is the same call with nothing to post.
  DELETE FROM public.job_costs
   WHERE source_type = p_source_type AND source_id = p_source_id;

  IF p_project_id IS NULL OR p_cost_code_id IS NULL THEN
    -- A cost with no code cannot be compared against a budget line, and a cost
    -- with no project is not a job cost. Warn rather than invent a home for it.
    RAISE WARNING 'post_job_cost: % % has no project or cost code; not posted',
      p_source_type, p_source_id;
    RETURN;
  END IF;

  v_total := COALESCE(p_labor, 0) + COALESCE(p_material, 0) + COALESCE(p_equipment, 0)
           + COALESCE(p_subcontractor, 0) + COALESCE(p_other, 0);

  IF v_total = 0 THEN
    RETURN;
  END IF;

  SELECT p.company_id INTO v_company FROM public.projects p WHERE p.id = p_project_id;

  INSERT INTO public.job_costs (
    project_id, company_id, cost_code_id, date, description,
    labor_cost, material_cost, equipment_cost, subcontractor_cost, other_cost,
    total_cost, source_type, source_id, created_by
  ) VALUES (
    p_project_id, v_company, p_cost_code_id, COALESCE(p_date, CURRENT_DATE), p_description,
    p_labor, p_material, p_equipment, p_subcontractor, p_other,
    v_total, p_source_type, p_source_id, p_created_by
  );
END;
$$;

COMMENT ON FUNCTION public.post_job_cost IS
  'The one way a cost reaches job_costs. Idempotent on (source_type, source_id); called with nothing to post, it withdraws the posting. US-322.';

REVOKE ALL ON FUNCTION public.post_job_cost FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.post_job_cost TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Expenses
-- ---------------------------------------------------------------------------
-- Posted when approved_at is set, withdrawn when it is cleared. An unapproved
-- receipt is a claim, not a cost.
CREATE OR REPLACE FUNCTION public.post_expense_to_job_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.job_costs WHERE source_type = 'expense' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.approved_at IS NULL THEN
    DELETE FROM public.job_costs WHERE source_type = 'expense' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  -- Material rather than other: an expense on a construction job is
  -- overwhelmingly something bought for it. A finer split needs the expense
  -- category mapping, which does not exist yet.
  PERFORM public.post_job_cost(
    'expense', NEW.id, NEW.project_id, NEW.cost_code_id,
    NEW.expense_date::date,
    COALESCE('Expense: ' || NULLIF(NEW.description, ''), 'Approved expense'),
    NULL, NEW.amount, NULL, NULL, NULL, NEW.approved_by
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_expense_cost ON public.expenses;
CREATE TRIGGER trg_post_expense_cost
  AFTER INSERT OR UPDATE OF approved_at, amount, cost_code_id, project_id, expense_date
  OR DELETE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.post_expense_to_job_costs();

-- ---------------------------------------------------------------------------
-- 4. Purchase orders, on receipt
-- ---------------------------------------------------------------------------
-- Receiving is what turns a commitment into a cost. Each LINE posts, because
-- lines are where the cost codes are.
CREATE OR REPLACE FUNCTION public.post_purchase_order_to_job_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line record;
  v_received boolean;
BEGIN
  v_received := NEW.received_at IS NOT NULL OR NEW.status IN ('received', 'closed');

  FOR v_line IN
    SELECT id, cost_code_id, total_price, description
      FROM public.purchase_order_line_items
     WHERE purchase_order_id = NEW.id
  LOOP
    IF v_received THEN
      PERFORM public.post_job_cost(
        'purchase_order_line', v_line.id, NEW.project_id, v_line.cost_code_id,
        COALESCE(NEW.received_at::date, NEW.po_date::date),
        COALESCE('PO ' || NEW.po_number || ': ' || NULLIF(v_line.description, ''), 'Received purchase order'),
        NULL, v_line.total_price, NULL, NULL, NULL, NEW.approved_by
      );
    ELSE
      -- Un-receiving a PO takes the cost back off the job.
      DELETE FROM public.job_costs
       WHERE source_type = 'purchase_order_line' AND source_id = v_line.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_purchase_order_cost ON public.purchase_orders;
CREATE TRIGGER trg_post_purchase_order_cost
  AFTER UPDATE OF received_at, status ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.post_purchase_order_to_job_costs();

-- ---------------------------------------------------------------------------
-- 5. Vendor bills
-- ---------------------------------------------------------------------------
-- A bill line carries its own project_id and cost_code_id, so it posts
-- independently of the bill's own project.
CREATE OR REPLACE FUNCTION public.post_bill_lines_to_job_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_line record;
  v_posted boolean;
  v_bill record;
BEGIN
  SELECT * INTO v_bill FROM public.bills WHERE id = NEW.id;
  v_posted := v_bill.status IN ('approved', 'posted', 'partial', 'paid');

  FOR v_line IN
    SELECT id, project_id, cost_code_id, amount, description
      FROM public.bill_line_items
     WHERE bill_id = NEW.id
  LOOP
    IF v_posted THEN
      PERFORM public.post_job_cost(
        'bill_line', v_line.id,
        COALESCE(v_line.project_id, v_bill.project_id), v_line.cost_code_id,
        v_bill.bill_date::date,
        COALESCE('Bill ' || v_bill.bill_number || ': ' || NULLIF(v_line.description, ''), 'Vendor bill'),
        -- other_cost: a vendor bill can be anything, and guessing a discipline
        -- from a free-text description would be a worse answer than "other".
        NULL, NULL, NULL, NULL, v_line.amount, v_bill.created_by
      );
    ELSE
      DELETE FROM public.job_costs
       WHERE source_type = 'bill_line' AND source_id = v_line.id;
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_bill_cost ON public.bills;
CREATE TRIGGER trg_post_bill_cost
  AFTER UPDATE OF status ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_lines_to_job_costs();

-- ---------------------------------------------------------------------------
-- 6. Subcontractor payments
-- ---------------------------------------------------------------------------
-- subcontractor_payments has no cost_code_id, so the cost is attributed to the
-- project's cost code for that trade where one matches by name, and otherwise
-- warns rather than picking arbitrarily. Giving this table a cost_code_id is
-- follow-up work; inventing an attribution here would be worse than saying so.
CREATE OR REPLACE FUNCTION public.post_subcontractor_payment_to_job_costs()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost_code uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN
    DELETE FROM public.job_costs
     WHERE source_type = 'subcontractor_payment' AND source_id = OLD.id;
    RETURN OLD;
  END IF;

  IF NEW.status NOT IN ('paid', 'approved') OR NEW.project_id IS NULL THEN
    DELETE FROM public.job_costs
     WHERE source_type = 'subcontractor_payment' AND source_id = NEW.id;
    RETURN NEW;
  END IF;

  SELECT cc.id INTO v_cost_code
    FROM public.cost_codes cc
   WHERE cc.company_id = NEW.company_id
     AND (lower(cc.name) = lower(NEW.trade) OR lower(COALESCE(cc.category, '')) = lower(NEW.trade))
   ORDER BY cc.code
   LIMIT 1;

  PERFORM public.post_job_cost(
    'subcontractor_payment', NEW.id, NEW.project_id, v_cost_code,
    COALESCE(NEW.paid_date::date, NEW.invoice_date::date),
    COALESCE('Subcontractor: ' || NULLIF(NEW.subcontractor_name, ''), 'Subcontractor payment'),
    NULL, NULL, NULL, COALESCE(NEW.net_amount, NEW.amount), NULL, NULL
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_subcontractor_payment_cost ON public.subcontractor_payments;
CREATE TRIGGER trg_post_subcontractor_payment_cost
  AFTER INSERT OR UPDATE OF status, amount, net_amount, project_id
  OR DELETE ON public.subcontractor_payments
  FOR EACH ROW EXECUTE FUNCTION public.post_subcontractor_payment_to_job_costs();

-- ---------------------------------------------------------------------------
-- 7. Committed cost, kept out of the ledger
-- ---------------------------------------------------------------------------
-- Open purchase orders are money promised, not money spent. A view rather than
-- rows, so it cannot drift from the purchase orders it summarises and cannot be
-- confused with an actual.
CREATE OR REPLACE VIEW public.project_committed_costs AS
SELECT
  po.project_id,
  po.company_id,
  poli.cost_code_id,
  SUM(poli.total_price)::numeric AS committed_amount,
  COUNT(DISTINCT po.id)          AS open_purchase_orders
FROM public.purchase_orders po
JOIN public.purchase_order_line_items poli ON poli.purchase_order_id = po.id
WHERE po.received_at IS NULL
  AND po.status NOT IN ('received', 'closed', 'cancelled', 'draft')
  AND po.project_id IS NOT NULL
GROUP BY po.project_id, po.company_id, poli.cost_code_id;

COMMENT ON VIEW public.project_committed_costs IS
  'Open purchase order value by project and cost code. Committed, not incurred - shown beside actuals, never inside them. US-322.';

GRANT SELECT ON public.project_committed_costs TO authenticated;
