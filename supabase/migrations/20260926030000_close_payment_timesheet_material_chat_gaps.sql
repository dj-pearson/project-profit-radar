-- Server-side gaps found while bringing invoices, timesheet approval,
-- materials and team chat to the native iOS app. The first three are
-- security fixes; the rest make features work that could not.
--
-- Signatures, parameter names and return shapes of existing functions are
-- unchanged. New functions and policies are additive.
--
-- 1. record_invoice_payment is SECURITY DEFINER, granted to authenticated,
--    and never checked the caller: any signed-in user could post a payment
--    to any company's invoice, and p_processed_by was whatever they sent.
--    A signed-in caller must now be finance staff in the invoice's company,
--    and processed_by is the caller. Server callers (the Stripe webhook runs
--    as service_role, where auth.uid() is null) are unchanged.
--
-- 2. Timesheet approval.
--    a. bulk_approve_timesheets / bulk_reject_timesheets are SECURITY DEFINER
--       with no role or company check, and took the approver id from the
--       client. Now the approver is the caller, and the guard in (b) decides.
--    b. time_entries_update lets a worker update their own rows, including
--       approval_status, so anyone could approve their own time (which posts
--       labor cost through trg_post_labor_cost). A BEFORE UPDATE trigger now
--       requires admin, project_manager or accounting in the entry's company
--       (root_admin anywhere) to approve, reject, or move an entry out of
--       approved, and refuses self-approval except for admin. Submitting and
--       resubmitting stay open to the worker. Server callers are unchanged.
--       The approver roles are the ones src/lib/security/types.ts gives
--       time_entries.approve.
--    c. bulk_reject_timesheets wrote `rejection_reason = rejection_reason`;
--       the parameter shadows the column, PL/pgSQL raised "ambiguous", and the
--       EXCEPTION block counted every row as failed. Qualified now.
--    d. log_timesheet_approval_history wrote action = new status, and
--    'pending' is not an allowed action, so reopening an entry aborted the
--       whole UPDATE. Reopening is logged as 'reopened'.
--    e. Managers could only read history rows they performed. They can now
--       read their company's (additive policy).
--
--    Items 1 and 2a/2b tighten who may write. Done in one release because
--    what they remove is cross-tenant writes and self-approval of paid time;
--    no client is meant to rely on either.
--
-- 3. log_material_usage(): records usage and decrements stock in one
--    transaction. The web page inserts usage and then updates stock from the
--    client, which races, and for a field supervisor the stock update is
--    silently blocked by materials RLS, so stock never drops. The web page
--    is unchanged; iOS uses this.
--
-- 4. Team chat.
--    a. chat_channels / chat_messages / chat_channel_members were given a
--       NOT NULL site_id (20251130000001) with nothing to fill it, so every
--       insert failed wherever that constraint applies. A BEFORE INSERT
--       trigger fills it from the company, as trg_project_site_id does.
--    b. Anyone could see an open (non-private) channel but only a channel
--       admin could add members, so nobody could read or post in it. Users
--       may now add themselves, as a plain member, to an open channel in
--       their company.
--    c. mark_chat_channel_read(): members stamp their own last_read_at.
--       There was no UPDATE policy for members.
--    d. company_member_names(): display names of people in the caller's
--       company. user_profiles SELECT (20251006204552) hides coworkers from
--       non-managers, so a crew member's chat showed no names. Returns names
--       only, never email or phone.

-- ===========================================================================
-- 1. record_invoice_payment
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text DEFAULT 'stripe',
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_processed_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_existing uuid;
  v_id uuid;
  v_caller uuid := auth.uid();
  v_processed_by uuid := p_processed_by;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'A payment must be a positive amount' USING ERRCODE = '22023';
  END IF;

  SELECT company_id INTO v_company FROM public.invoices WHERE id = p_invoice_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
  END IF;

  -- A signed-in caller. Server-side callers (service_role) have no uid.
  IF v_caller IS NOT NULL THEN
    IF NOT COALESCE(
      get_user_role(v_caller)::text = 'root_admin'
      OR (
        get_user_company(v_caller) = v_company
        AND get_user_role(v_caller)::text IN ('admin', 'project_manager', 'accounting', 'office_staff')
      ),
      false
    ) THEN
      -- Same answer as a missing invoice for another company's id.
      RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
    END IF;
    v_processed_by := v_caller;
  END IF;

  -- Idempotency for the retried webhook. Returns the existing payment rather
  -- than raising, because a duplicate delivery is normal and must not put the
  -- event back in Stripe's retry queue.
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing
      FROM public.invoice_payments
     WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.invoice_payments (
    invoice_id, company_id, payment_amount, payment_date, payment_method,
    reference_number, notes, stripe_payment_intent_id, processed_by
  ) VALUES (
    p_invoice_id, v_company, p_amount, CURRENT_DATE, COALESCE(p_method, 'stripe'),
    p_reference_number, p_notes, p_stripe_payment_intent_id, v_processed_by
  )
  RETURNING id INTO v_id;

  -- No UPDATE of invoices here on purpose: the AFTER INSERT trigger owns
  -- amount_paid, amount_due, status and paid_at.
  RETURN v_id;
END;
$$;

REVOKE ALL ON FUNCTION public.record_invoice_payment(uuid, numeric, text, text, text, text, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment(uuid, numeric, text, text, text, text, uuid) TO authenticated, service_role;

-- ===========================================================================
-- 2b. Who may approve time
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.guard_time_entry_approval()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_role text;
  v_company uuid;
BEGIN
  IF v_caller IS NULL THEN
    RETURN NEW;   -- server-side job
  END IF;
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN
    RETURN NEW;
  END IF;
  -- Workers submit and resubmit their own time freely. Deciding, or undoing
  -- a decision that posted labor cost, is a manager's call.
  IF NOT (NEW.approval_status IN ('approved', 'rejected') OR OLD.approval_status = 'approved') THEN
    RETURN NEW;
  END IF;

  v_role := get_user_role(v_caller)::text;
  IF v_role = 'root_admin' THEN
    RETURN NEW;
  END IF;

  SELECT p.company_id INTO v_company FROM public.projects p WHERE p.id = NEW.project_id;

  IF v_role IS NULL
     OR v_role NOT IN ('admin', 'project_manager', 'accounting')
     OR v_company IS DISTINCT FROM get_user_company(v_caller) THEN
    RAISE EXCEPTION 'Only a manager in this company can approve or reject time'
      USING ERRCODE = '42501';
  END IF;

  IF NEW.user_id = v_caller AND v_role <> 'admin' THEN
    RAISE EXCEPTION 'You can''t approve or reject your own time'
      USING ERRCODE = '42501';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_guard_time_entry_approval ON public.time_entries;
CREATE TRIGGER trg_guard_time_entry_approval
  BEFORE UPDATE OF approval_status ON public.time_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.guard_time_entry_approval();

-- ===========================================================================
-- 2a + 2c. Bulk approve / reject
-- ===========================================================================
CREATE OR REPLACE FUNCTION bulk_approve_timesheets(
  timesheet_ids UUID[],
  approver_id UUID,
  notes TEXT DEFAULT NULL
)
RETURNS TABLE(success_count INT, failed_count INT) AS $$
DECLARE
  success INT := 0;
  failed INT := 0;
  timesheet_id UUID;
  -- The caller, not the client-supplied id. approver_id is kept so the
  -- signature doesn't change; it is used only by server-side callers.
  v_approver UUID := COALESCE(auth.uid(), approver_id);
BEGIN
  FOREACH timesheet_id IN ARRAY timesheet_ids
  LOOP
    BEGIN
      -- trg_guard_time_entry_approval raises for a caller who may not
      -- approve this entry; that lands in the EXCEPTION branch as a failure.
      UPDATE time_entries
      SET
        approval_status = 'approved',
        approved_by = v_approver,
        approved_at = now(),
        approval_notes = bulk_approve_timesheets.notes
      WHERE id = timesheet_id
        AND approval_status IN ('pending', 'submitted');

      IF FOUND THEN
        success := success + 1;
      ELSE
        failed := failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE OR REPLACE FUNCTION bulk_reject_timesheets(
  timesheet_ids UUID[],
  rejector_id UUID,
  rejection_reason TEXT
)
RETURNS TABLE(success_count INT, failed_count INT) AS $$
DECLARE
  success INT := 0;
  failed INT := 0;
  timesheet_id UUID;
  v_rejector UUID := COALESCE(auth.uid(), rejector_id);
BEGIN
  FOREACH timesheet_id IN ARRAY timesheet_ids
  LOOP
    BEGIN
      UPDATE time_entries
      SET
        approval_status = 'rejected',
        approved_by = v_rejector,
        approved_at = now(),
        -- Qualified: the bare name is ambiguous between parameter and column.
        rejection_reason = bulk_reject_timesheets.rejection_reason
      WHERE id = timesheet_id
        AND approval_status IN ('pending', 'submitted');

      IF FOUND THEN
        success := success + 1;
      ELSE
        failed := failed + 1;
      END IF;
    EXCEPTION WHEN OTHERS THEN
      failed := failed + 1;
    END;
  END LOOP;

  RETURN QUERY SELECT success, failed;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================================================
-- 2d. History: log a reopen as 'reopened'
-- ===========================================================================
CREATE OR REPLACE FUNCTION log_timesheet_approval_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.approval_status IS DISTINCT FROM NEW.approval_status THEN
    INSERT INTO timesheet_approval_history (
      time_entry_id,
      action,
      performed_by,
      notes,
      previous_status,
      new_status
    ) VALUES (
      NEW.id,
      CASE NEW.approval_status WHEN 'pending' THEN 'reopened' ELSE NEW.approval_status END,
      COALESCE(auth.uid(), NEW.approved_by),
      COALESCE(NEW.approval_notes, NEW.rejection_reason),
      OLD.approval_status,
      NEW.approval_status
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- ===========================================================================
-- 2e. Managers read their company's approval history
-- ===========================================================================
DROP POLICY IF EXISTS "Managers read company approval history" ON timesheet_approval_history;
CREATE POLICY "Managers read company approval history"
  ON timesheet_approval_history
  FOR SELECT
  TO authenticated
  USING (
    get_user_role(auth.uid())::text IN ('root_admin', 'admin', 'project_manager', 'accounting')
    AND time_entry_id IN (
      SELECT te.id
      FROM time_entries te
      JOIN projects p ON p.id = te.project_id
      WHERE p.company_id = get_user_company(auth.uid())
    )
  );

-- ===========================================================================
-- 3. log_material_usage
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.log_material_usage(
  p_material_id uuid,
  p_project_id uuid,
  p_quantity numeric,
  p_notes text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller uuid := auth.uid();
  v_material materials%ROWTYPE;
  v_usage_id uuid;
  v_left numeric;
  v_unit_cost numeric;
BEGIN
  IF v_caller IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Not signed in');
  END IF;
  IF p_quantity IS NULL OR p_quantity <= 0 THEN
    RETURN json_build_object('success', false, 'error', 'Quantity must be more than zero');
  END IF;

  -- Row lock: two crews logging the same material don't lose an update.
  SELECT * INTO v_material FROM materials WHERE id = p_material_id FOR UPDATE;
  IF NOT FOUND OR NOT COALESCE(
    v_material.company_id = get_user_company(v_caller)
    OR get_user_role(v_caller)::text = 'root_admin',
    false
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Material not found');
  END IF;

  -- The roles material_usage's own manage policy allows.
  IF NOT COALESCE(
    get_user_role(v_caller)::text IN ('root_admin', 'admin', 'project_manager', 'office_staff', 'field_supervisor'),
    false
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Your role can''t log material usage');
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM projects WHERE id = p_project_id AND company_id = v_material.company_id
  ) THEN
    RETURN json_build_object('success', false, 'error', 'Project not found');
  END IF;

  v_unit_cost := COALESCE(v_material.unit_cost, 0);

  INSERT INTO material_usage (
    material_id, project_id, quantity_used, unit_cost, total_cost, used_by, notes
  ) VALUES (
    p_material_id, p_project_id, p_quantity, v_unit_cost, p_quantity * v_unit_cost, v_caller, p_notes
  )
  RETURNING id INTO v_usage_id;

  UPDATE materials
     SET quantity_available = COALESCE(quantity_available, 0) - p_quantity
   WHERE id = p_material_id
  RETURNING quantity_available INTO v_left;

  RETURN json_build_object(
    'success', true,
    'usage_id', v_usage_id,
    'quantity_available', v_left,
    'total_cost', p_quantity * v_unit_cost
  );
END;
$$;

REVOKE ALL ON FUNCTION public.log_material_usage(uuid, uuid, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.log_material_usage(uuid, uuid, numeric, text) TO authenticated;

COMMENT ON FUNCTION public.log_material_usage(uuid, uuid, numeric, text) IS
  'Records material_usage and decrements materials.quantity_available in one transaction, for the caller''s company. Returns { success, usage_id, quantity_available, total_cost } or { success: false, error }.';

-- ===========================================================================
-- 4a. Chat site_id from the company
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.fill_site_id_from_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.site_id IS NULL AND NEW.company_id IS NOT NULL THEN
    SELECT c.site_id INTO NEW.site_id FROM public.companies c WHERE c.id = NEW.company_id;
  END IF;
  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.fill_site_id_from_company() IS
  'BEFORE INSERT: fills site_id from company_id when the caller omits it. A caller that sends site_id keeps it. For tables US-275 gave a NOT NULL site_id with no writer.';

DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['chat_channels', 'chat_messages', 'chat_channel_members'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'site_id'
    ) AND EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = t AND column_name = 'company_id'
    ) THEN
      EXECUTE format('DROP TRIGGER IF EXISTS trg_%s_site_id ON public.%I', t, t);
      EXECUTE format(
        'CREATE TRIGGER trg_%s_site_id BEFORE INSERT ON public.%I FOR EACH ROW EXECUTE FUNCTION public.fill_site_id_from_company()',
        t, t
      );
    END IF;
  END LOOP;
END $$;

-- ===========================================================================
-- 4b. Join an open channel
-- ===========================================================================
DROP POLICY IF EXISTS "Members join open company channels" ON public.chat_channel_members;
CREATE POLICY "Members join open company channels"
  ON public.chat_channel_members
  FOR INSERT
  TO authenticated
  WITH CHECK (
    user_id = auth.uid()
    AND role = 'member'
    AND company_id = get_user_company(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.chat_channels c
      WHERE c.id = channel_id
        AND c.company_id = get_user_company(auth.uid())
        AND NOT c.is_private
        AND c.archived_at IS NULL
    )
  );

-- ===========================================================================
-- 4c. Mark a channel read
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.mark_chat_channel_read(p_channel_id uuid)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  UPDATE public.chat_channel_members
     SET last_read_at = now()
   WHERE channel_id = p_channel_id
     AND user_id = auth.uid();
$$;

REVOKE ALL ON FUNCTION public.mark_chat_channel_read(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.mark_chat_channel_read(uuid) TO authenticated;

-- ===========================================================================
-- 4d. Coworker names
-- ===========================================================================
CREATE OR REPLACE FUNCTION public.company_member_names(p_user_ids uuid[])
RETURNS TABLE(user_id uuid, display_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT up.id,
         NULLIF(btrim(CONCAT(up.first_name, ' ', up.last_name)), '')
    FROM public.user_profiles up
   WHERE up.id = ANY (p_user_ids)
     AND up.company_id = get_user_company(auth.uid());
$$;

REVOKE ALL ON FUNCTION public.company_member_names(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.company_member_names(uuid[]) TO authenticated;
