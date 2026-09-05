-- Approved change orders change nothing (US-323).
--
-- change-orders/index.ts handles approval by flipping internal_approved and
-- client_approved and closing an approval row in tasks that it finds by ilike
-- on the change order number. It never touches the project's contract value,
-- its budget lines, or any date. So budget vs actual is measured against the
-- original contract forever, on a platform whose own marketing says 85% of
-- jobs carry changes. A contractor who has approved $40,000 of extras is
-- reading a job that looks $40,000 over budget.
--
-- Three things this fixes and one it deliberately does not.
--
-- 1. CONTRACT VALUE. projects.budget is the original. Adding change orders to
--    it would destroy the only record of what was originally agreed, which is
--    the number a dispute turns on. Two additive columns instead:
--    original_contract_value (frozen) and current_contract_value (moves with
--    approved change orders). US-327 builds the schedule of values on these
--    rather than defining its own.
--
-- 2. BUDGET LINES. A change order with a cost code updates that line in
--    project_budgets, so the job-costing screens compare actuals against a
--    budget that includes the change. Deductive change orders reduce it.
--
-- 3. DATES. impact_days pushes the project end date. Task-level rescheduling
--    is deliberately NOT done here - scheduleService already implements
--    dependency cascade in the app, and a blunt SQL shift of every task would
--    wreck a sequenced schedule to save a PM one drag. The revised completion
--    date is recorded on the change order so the PM can see what they agreed.
--
-- The two change_orders definitions (20250702225057 with change_order_number,
-- 20250805010803 with number plus a cost breakdown and impact columns) are
-- reconciled by adding the missing columns to the live table rather than
-- rewriting either migration.

-- ---------------------------------------------------------------------------
-- 1. Contract value that can move without losing the original
-- ---------------------------------------------------------------------------
ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS original_contract_value NUMERIC(14,2),
  ADD COLUMN IF NOT EXISTS current_contract_value  NUMERIC(14,2);

COMMENT ON COLUMN public.projects.original_contract_value IS
  'What was agreed at the start. Never moves. US-323.';
COMMENT ON COLUMN public.projects.current_contract_value IS
  'Original plus approved change orders. What budget vs actual should measure against. US-323.';

-- Backfill from whichever budget column this database actually populated, and
-- add the change orders already approved, so an existing job does not have to
-- wait for its next change order to get a correct contract value.
UPDATE public.projects p
   SET original_contract_value = COALESCE(p.original_contract_value, p.budget, p.total_budget, 0)
 WHERE p.original_contract_value IS NULL;

UPDATE public.projects p
   SET current_contract_value = COALESCE(p.original_contract_value, 0) + COALESCE((
         SELECT SUM(co.amount)
           FROM public.change_orders co
          WHERE co.project_id = p.id
            AND COALESCE(co.internal_approved, false)
            AND COALESCE(co.client_approved, false)
       ), 0)
 WHERE p.current_contract_value IS NULL;

-- ---------------------------------------------------------------------------
-- 2. The columns the second change_orders definition had and the live one lacks
-- ---------------------------------------------------------------------------
ALTER TABLE public.change_orders
  ADD COLUMN IF NOT EXISTS impact_days INTEGER,
  ADD COLUMN IF NOT EXISTS revised_completion_date DATE,
  ADD COLUMN IF NOT EXISTS cost_code_id UUID REFERENCES public.cost_codes(id) ON DELETE SET NULL,
  -- The approval task, by foreign key. It was matched with
  -- `ilike('name', '%' || change_order_number || '%')`, so CO-1 also matched
  -- CO-10 and CO-100.
  ADD COLUMN IF NOT EXISTS approval_task_id UUID REFERENCES public.tasks(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.change_orders.impact_days IS
  'Calendar days this change adds to the project. Pushes projects.end_date on approval. US-323.';
COMMENT ON COLUMN public.change_orders.cost_code_id IS
  'Which budget line this change belongs to. Without one the contract value still moves, but no budget line does. US-323.';

-- ---------------------------------------------------------------------------
-- 3. Approval does something
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.apply_change_order_effects()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_was_approved boolean;
  v_is_approved  boolean;
  v_delta        numeric;
  v_days         integer;
BEGIN
  v_was_approved := COALESCE(OLD.internal_approved, false) AND COALESCE(OLD.client_approved, false)
                    AND COALESCE(OLD.status, '') <> 'rejected';
  v_is_approved  := COALESCE(NEW.internal_approved, false) AND COALESCE(NEW.client_approved, false)
                    AND COALESCE(NEW.status, '') <> 'rejected';

  -- Status is persisted, not derived on the client. ChangeOrders.tsx computed
  -- a badge from the two flags and only ever wrote 'rejected', so nothing
  -- server-side could tell an approved change order from a pending one.
  IF v_is_approved AND COALESCE(NEW.status, '') <> 'approved' THEN
    NEW.status := 'approved';
  ELSIF NOT v_is_approved AND COALESCE(NEW.status, '') = 'approved' THEN
    NEW.status := 'pending';
  END IF;

  IF v_is_approved = v_was_approved THEN
    RETURN NEW;
  END IF;

  -- +amount on approval, -amount on withdrawal. Deductive change orders carry
  -- a negative amount and therefore reduce the contract on approval, which is
  -- the same arithmetic.
  v_delta := CASE WHEN v_is_approved THEN COALESCE(NEW.amount, 0) ELSE -COALESCE(NEW.amount, 0) END;
  v_days  := CASE WHEN v_is_approved THEN COALESCE(NEW.impact_days, 0) ELSE -COALESCE(NEW.impact_days, 0) END;

  UPDATE public.projects
     SET current_contract_value = COALESCE(current_contract_value, COALESCE(original_contract_value, budget, 0)) + v_delta,
         end_date = CASE
           WHEN v_days <> 0 AND end_date IS NOT NULL THEN end_date + v_days
           ELSE end_date
         END,
         updated_at = now()
   WHERE id = NEW.project_id;

  IF v_is_approved AND COALESCE(NEW.impact_days, 0) <> 0 THEN
    SELECT p.end_date INTO NEW.revised_completion_date
      FROM public.projects p WHERE p.id = NEW.project_id;
  END IF;

  -- The budget line. Without a cost code the contract still moves - the change
  -- is real money - but there is no line to put it on, so say so rather than
  -- picking one.
  IF NEW.cost_code_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.project_budgets
       WHERE project_id = NEW.project_id AND cost_code_id = NEW.cost_code_id
    ) THEN
      UPDATE public.project_budgets
         SET budgeted_amount = COALESCE(budgeted_amount, 0) + v_delta,
             updated_at = now()
       WHERE project_id = NEW.project_id AND cost_code_id = NEW.cost_code_id;
    ELSIF v_is_approved THEN
      INSERT INTO public.project_budgets (project_id, cost_code_id, budgeted_amount, notes)
      VALUES (
        NEW.project_id, NEW.cost_code_id, v_delta,
        'From change order ' || COALESCE(NEW.change_order_number, NEW.id::text)
      );
    END IF;
  ELSIF v_is_approved THEN
    RAISE WARNING 'change order % approved with no cost code; contract value moved but no budget line did',
      NEW.id;
  END IF;

  -- Close or reopen the approval task by its foreign key.
  IF NEW.approval_task_id IS NOT NULL THEN
    UPDATE public.tasks
       SET status = CASE WHEN v_is_approved THEN 'completed' ELSE 'in_progress' END,
           completion_percentage = CASE WHEN v_is_approved THEN 100 ELSE 0 END,
           updated_at = now()
     WHERE id = NEW.approval_task_id;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.apply_change_order_effects() IS
  'Moves contract value, the budget line and the end date when a change order becomes fully approved, and reverses all three if approval is withdrawn. US-323.';

DROP TRIGGER IF EXISTS trg_change_order_effects ON public.change_orders;
CREATE TRIGGER trg_change_order_effects
  BEFORE UPDATE OF internal_approved, client_approved, status, amount, impact_days, cost_code_id
  ON public.change_orders
  FOR EACH ROW EXECUTE FUNCTION public.apply_change_order_effects();
