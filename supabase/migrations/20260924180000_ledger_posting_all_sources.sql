-- Every money document posts to the general ledger, and corrections reverse
-- rather than delete (US-334, second pass).
--
-- WHAT 20260903250000 LEFT OPEN
--
--   * Bills and bill payments never posted, so accounts payable was always
--     zero and every vendor cost was missing from the P&L unless it went
--     through the expenses table. bills.journal_entry_id was never written.
--   * Approved labour (US-321 freezes time_entries.labor_cost) never reached
--     the ledger, so the biggest cost on a job was absent from the statements.
--   * Posting was insert-only. Voiding an invoice, deleting a payment,
--     correcting an amount or un-approving a timesheet left the original entry
--     in place, so the ledger drifted from the documents the first time
--     anyone fixed a mistake.
--   * Invoices credited revenue with total_amount, which includes sales tax
--     and excludes retainage. Tax collected is a liability, not income, and
--     retainage withheld is earned revenue sitting in a separate receivable.
--     A retainage release then booked the same revenue a second time.
--   * post_ledger_entry inserted the header as 'posted' before its lines
--     existed. trg_update_account_balances runs on that INSERT and sums the
--     lines of the new entry, which are not there yet, so
--     chart_of_accounts.current_balance never moved for an automatic entry.
--   * post_ledger_entry, ledger_account and ledger_posting_enabled are
--     SECURITY DEFINER and were left executable by every role, so any
--     signed-in user could write a journal entry into any company's books by
--     calling /rest/v1/rpc/post_ledger_entry with that company's id.
--     backfill_ledger compared p_company_id to get_user_company(auth.uid()),
--     which is NULL for an anonymous caller, and `x <> NULL` is not true, so
--     the check let anon through.
--
-- THE MODEL
--
--   For each source document there is a set of lines it should have in the
--   ledger right now (possibly none: a draft, a void, a deleted row). The
--   ledger holds whatever was posted for it before. ledger_sync compares the
--   two, and when they differ it posts a reversing entry for what is there and
--   a new entry for what should be. Nothing is updated or deleted, so the
--   history of every correction stays readable. When the two match it does
--   nothing, which is what makes a retry, a re-save or the backfill safe to
--   repeat.
--
--   Entries are keyed on (company_id, reference_type, reference_id) and
--   numbered AUTO-<code>-<source uuid>-<n>. The existing
--   UNIQUE (company_id, entry_number) is the backstop against a race posting
--   the same generation twice; an advisory lock per source is the front door.
--
--   A reversal is dated like the entry it reverses, so a voided January
--   invoice leaves January's revenue at zero, as QuickBooks does. When that
--   date falls in a closed fiscal period the entry is dated today instead.
--
-- STILL OFF BY DEFAULT. Nothing here changes company_settings.auto_post_to_ledger.
-- A company that keeps its books in QuickBooks sees no entries at all.
--
-- SKIP, NEVER GUESS. A rule that needs an account the company's chart does
-- not have posts nothing and raises a NOTICE. The accounts are looked up by
-- the numbers create_default_chart_of_accounts seeds (20250707000001), then by
-- subtype, so a seeded chart posts out of the box and a custom chart posts to
-- the nearest match or not at all.

-- ---------------------------------------------------------------------------
-- 1. Which account plays which role
-- ---------------------------------------------------------------------------
-- The seeded number wins, then the lowest-numbered active account of the
-- subtype whose name fits. Subtypes are compared as text so a typo here is a
-- rule that finds nothing rather than an enum cast that fails the migration.
CREATE OR REPLACE FUNCTION public.ledger_role_account(p_company_id uuid, p_role text)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH spec(role, priority, number, subtype, include_re, exclude_re) AS (
    VALUES
      ('receivable',           1, '1100', 'accounts_receivable',     NULL::text,                         '(retain|allowance|doubtful|unbilled)'),
      ('retainage_receivable', 1, '1110', 'accounts_receivable',     'retain',                           NULL),
      ('bank',                 1, '1010', 'bank',                    NULL,                               'payroll'),
      ('bank',                 2, '1000', 'cash',                    NULL,                               NULL),
      ('credit_card',          1, '2100', 'credit_card',             NULL,                               NULL),
      ('payable',              1, '2000', 'accounts_payable',        NULL,                               'retain'),
      ('sales_tax_payable',    1, '2200', 'other_current_liability', 'sales tax',                        NULL),
      ('accrued_wages',        1, '2300', 'other_current_liability', '(accrued wage|wages payable|accrued payroll)', NULL),
      ('revenue',              1, '4000', 'service_revenue',         NULL,                               NULL),
      ('revenue',              2, '4000', 'sales_revenue',           NULL,                               NULL),
      ('direct_labor',         1, '5000', 'direct_labor',            NULL,                               NULL),
      ('direct_materials',     1, '5100', 'direct_materials',        NULL,                               NULL),
      ('subcontractors',       1, '5200', 'subcontractors',          NULL,                               NULL),
      ('equipment_costs',      1, '5300', 'equipment_costs',         NULL,                               NULL),
      ('other_cogs',           1, '5400', 'other_cogs',              NULL,                               NULL),
      ('overhead_expense',     1, '6920', 'operating_expense',       'misc',                             NULL),
      ('overhead_expense',     2, '6920', 'operating_expense',       NULL,                               NULL)
  )
  SELECT a.id
    FROM spec s
    JOIN public.chart_of_accounts a
      ON a.account_subtype::text = s.subtype
   WHERE s.role = p_role
     AND a.company_id = p_company_id
     AND COALESCE(a.is_active, true)
     AND (s.include_re IS NULL OR a.account_number = s.number OR a.account_name ~* s.include_re)
     AND (s.exclude_re IS NULL OR a.account_number = s.number OR a.account_name !~* s.exclude_re)
   ORDER BY s.priority, (a.account_number = s.number) DESC, a.account_number
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.ledger_role_account(uuid, text) IS
  'The account a posting rule uses for a role (receivable, bank, payable, ...): the seeded account number first, then the nearest subtype match, else NULL so the rule skips. US-334.';

-- A job cost's account from whatever names it: an expense category or a cost
-- code category. Materials is the default for the same reason US-322 posts
-- job expenses as material cost: that is what most of them are.
CREATE OR REPLACE FUNCTION public.ledger_job_cost_role(p_category text)
RETURNS text
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN p_category ~* 'subcontract'                        THEN 'subcontractors'
    WHEN p_category ~* 'labou?r'                            THEN 'direct_labor'
    WHEN p_category ~* '(equip|rental|fuel)'                THEN 'equipment_costs'
    WHEN p_category ~* '(permit|fee|dump|disposal|utilit)' THEN 'other_cogs'
    ELSE 'direct_materials'
  END;
$$;

-- ---------------------------------------------------------------------------
-- 2. Lines, and the one place that writes an entry
-- ---------------------------------------------------------------------------
-- A line is {a: account, p: project, c: cost code, amt: signed amount}, with a
-- debit positive and a credit negative. Normalising nets lines that share an
-- account, project and cost code, drops the zeros and sorts, so two sets of
-- lines can be compared for equality as jsonb.
CREATE OR REPLACE FUNCTION public.ledger_normalize_lines(p_lines jsonb)
RETURNS jsonb
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    jsonb_agg(jsonb_build_object('a', s.a, 'p', s.p, 'c', s.c, 'amt', s.amt)
              ORDER BY s.a NULLS FIRST, s.p NULLS FIRST, s.c NULLS FIRST),
    '[]'::jsonb)
  FROM (
    SELECT x.a, x.p, x.c, round(sum(COALESCE(x.amt, 0)), 2) AS amt
      FROM jsonb_to_recordset(COALESCE(p_lines, '[]'::jsonb)) AS x(a uuid, p uuid, c uuid, amt numeric)
     GROUP BY x.a, x.p, x.c
    HAVING round(sum(COALESCE(x.amt, 0)), 2) <> 0
  ) s;
$$;

CREATE OR REPLACE FUNCTION public.ledger_write_entry(
  p_company_id uuid,
  p_reference_type text,
  p_reference_id uuid,
  p_transaction_type transaction_type,
  p_entry_date date,
  p_description text,
  p_project_id uuid,
  p_lines jsonb,
  p_reverses uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_id   uuid;
  v_seq  integer;
  v_date date := COALESCE(p_entry_date, CURRENT_DATE);
  v_code text := CASE p_reference_type
    WHEN 'invoice' THEN 'INV'
    WHEN 'invoice_payment' THEN 'PMT'
    WHEN 'expense' THEN 'EXP'
    WHEN 'bill' THEN 'BILL'
    WHEN 'bill_payment' THEN 'BPMT'
    WHEN 'time_entry' THEN 'TIME'
    ELSE 'SRC' END;
BEGIN
  -- A closed period stays closed: the entry lands today instead.
  IF EXISTS (
    SELECT 1 FROM public.fiscal_periods fp
     WHERE fp.company_id = p_company_id
       AND COALESCE(fp.is_closed, false)
       AND v_date BETWEEN fp.start_date AND fp.end_date
  ) THEN
    v_date := GREATEST(CURRENT_DATE, v_date);
  END IF;

  SELECT count(*) + 1 INTO v_seq
    FROM public.journal_entries
   WHERE company_id = p_company_id
     AND reference_type = p_reference_type
     AND reference_id = p_reference_id
     AND entry_number LIKE 'AUTO-%';

  -- Draft first, lines, then posted: trg_update_account_balances sums the
  -- entry's lines when it becomes posted, so they have to exist by then.
  INSERT INTO public.journal_entries
    (company_id, entry_number, entry_date, posting_date, description,
     reference_type, reference_id, transaction_type, transaction_status,
     project_id, is_approved, is_reversing, reversed_entry_id, created_by)
  VALUES
    (p_company_id,
     'AUTO-' || v_code || '-' || replace(p_reference_id::text, '-', '') || '-' || v_seq,
     v_date, v_date,
     CASE WHEN p_reverses IS NULL THEN p_description ELSE 'Reversal: ' || p_description END,
     p_reference_type, p_reference_id, p_transaction_type, 'draft',
     p_project_id, true, p_reverses IS NOT NULL, p_reverses, auth.uid())
  RETURNING id INTO v_id;

  INSERT INTO public.journal_entry_lines
    (journal_entry_id, company_id, account_id, line_number,
     debit_amount, credit_amount, description, project_id, cost_code_id)
  SELECT v_id, p_company_id, (x.line->>'a')::uuid, x.n::integer,
         GREATEST((x.line->>'amt')::numeric, 0), GREATEST(-(x.line->>'amt')::numeric, 0),
         p_description, (x.line->>'p')::uuid, (x.line->>'c')::uuid
    FROM jsonb_array_elements(p_lines) WITH ORDINALITY AS x(line, n);

  UPDATE public.journal_entries
     SET transaction_status = 'posted', posted_by = auth.uid()
   WHERE id = v_id;

  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.ledger_write_entry IS
  'Writes one posted journal entry from normalised lines. Called only by ledger_sync. US-334.';

-- The latest automatic entry for a source that no later entry has reversed.
CREATE OR REPLACE FUNCTION public.ledger_active_entry(
  p_company_id uuid, p_reference_type text, p_reference_id uuid
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT e.id
    FROM public.journal_entries e
   WHERE e.company_id = p_company_id
     AND e.reference_type = p_reference_type
     AND e.reference_id = p_reference_id
     AND e.entry_number LIKE 'AUTO-%'
     AND e.transaction_status = 'posted'
     AND NOT COALESCE(e.is_reversing, false)
     AND NOT EXISTS (SELECT 1 FROM public.journal_entries r WHERE r.reversed_entry_id = e.id)
   ORDER BY (regexp_match(e.entry_number, '^AUTO-[A-Z]+-[0-9a-f]{32}-([0-9]+)$'))[1]::integer DESC NULLS LAST,
            e.created_at DESC
   LIMIT 1;
$$;

-- Make the ledger say what the document says.
--
-- p_lines NULL means "cannot be posted" (an account is missing, the source is
-- incomplete): leave whatever is there and say so. '[]' means "should have
-- nothing": reverse whatever is there. p_only_if_unposted is the backfill's
-- mode: post a source that has never been posted, touch nothing else.
CREATE OR REPLACE FUNCTION public.ledger_sync(
  p_company_id uuid,
  p_reference_type text,
  p_reference_id uuid,
  p_transaction_type transaction_type,
  p_entry_date date,
  p_description text,
  p_project_id uuid,
  p_lines jsonb,
  p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_desired  jsonb;
  v_current  jsonb;
  v_active   uuid;
  v_rev_date date;
  v_rev_desc text;
BEGIN
  IF p_company_id IS NULL OR p_reference_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- One writer per source at a time: a trigger and a backfill racing on the
  -- same invoice would otherwise both see "not posted".
  PERFORM pg_advisory_xact_lock(
    hashtextextended(p_company_id::text || ':' || p_reference_type || ':' || p_reference_id::text, 334));

  v_active := public.ledger_active_entry(p_company_id, p_reference_type, p_reference_id);

  IF p_only_if_unposted AND EXISTS (
    SELECT 1 FROM public.journal_entries
     WHERE company_id = p_company_id AND reference_type = p_reference_type
       AND reference_id = p_reference_id AND entry_number LIKE 'AUTO-%'
  ) THEN
    RETURN v_active;
  END IF;

  IF p_lines IS NULL THEN
    RAISE NOTICE 'US-334: % % not posted - an account it needs is missing or the source is incomplete',
      p_reference_type, p_reference_id;
    RETURN v_active;
  END IF;

  v_desired := public.ledger_normalize_lines(p_lines);

  -- Every line needs an account in this company's chart. A NULL is a missing
  -- role; a foreign id is a bill line or bank account pointing into another
  -- tenant's chart, which must never be written through.
  IF EXISTS (
    SELECT 1 FROM jsonb_to_recordset(v_desired) AS x(a uuid)
     WHERE x.a IS NULL
        OR NOT EXISTS (SELECT 1 FROM public.chart_of_accounts c
                        WHERE c.id = x.a AND c.company_id = p_company_id)
  ) THEN
    RAISE NOTICE 'US-334: % % not posted - company % has no account for one of its lines',
      p_reference_type, p_reference_id, p_company_id;
    RETURN v_active;
  END IF;

  IF (SELECT COALESCE(sum(x.amt), 0) FROM jsonb_to_recordset(v_desired) AS x(amt numeric)) <> 0 THEN
    RAISE WARNING 'US-334: % % not posted - its lines do not balance: %',
      p_reference_type, p_reference_id, v_desired;
    RETURN v_active;
  END IF;

  SELECT public.ledger_normalize_lines(jsonb_agg(jsonb_build_object(
           'a', l.account_id, 'p', l.project_id, 'c', l.cost_code_id,
           'amt', COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0))))
    INTO v_current
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
   WHERE e.company_id = p_company_id
     AND e.reference_type = p_reference_type
     AND e.reference_id = p_reference_id
     AND e.entry_number LIKE 'AUTO-%'
     AND e.transaction_status = 'posted';

  IF v_current = v_desired THEN
    RETURN v_active;
  END IF;

  IF v_current <> '[]'::jsonb THEN
    SELECT entry_date, COALESCE(NULLIF(regexp_replace(description, '^Reversal: ', ''), ''), p_description)
      INTO v_rev_date, v_rev_desc
      FROM public.journal_entries WHERE id = v_active;
    PERFORM public.ledger_write_entry(
      p_company_id, p_reference_type, p_reference_id, p_transaction_type,
      COALESCE(v_rev_date, p_entry_date), COALESCE(v_rev_desc, p_description), p_project_id,
      (SELECT jsonb_agg(jsonb_set(x, '{amt}', to_jsonb(-(x->>'amt')::numeric)))
         FROM jsonb_array_elements(v_current) x),
      v_active);
    v_active := NULL;
  END IF;

  IF v_desired <> '[]'::jsonb THEN
    v_active := public.ledger_write_entry(
      p_company_id, p_reference_type, p_reference_id, p_transaction_type,
      p_entry_date, p_description, p_project_id, v_desired, NULL);
  END IF;

  RETURN v_active;
END;
$$;

COMMENT ON FUNCTION public.ledger_sync IS
  'Makes the ledger match a source document: no-op when it already does, otherwise a reversing entry for what was posted and a new entry for what should be. Never updates or deletes an entry. US-334.';

-- ---------------------------------------------------------------------------
-- 3. The rules, one per source
-- ---------------------------------------------------------------------------
-- Each reads its source row and calls ledger_sync. A missing row (deleted) is
-- "should have nothing", so deleting a document reverses it.

-- Invoice: receivable against revenue, with tax to its liability and
-- retainage to its own receivable. A retainage release moves the withheld
-- amount from retainage receivable to receivable; the revenue was booked when
-- the work was billed.
CREATE OR REPLACE FUNCTION public.ledger_sync_invoice(
  p_company_id uuid, p_invoice_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  inv         record;
  v_lines     jsonb := '[]'::jsonb;
  v_date      date := CURRENT_DATE;
  v_desc      text := 'Invoice';
  v_project   uuid;
  v_ar        uuid;
  v_retainage uuid;
  v_total     numeric;
  v_tax       numeric;
  v_retention numeric;
BEGIN
  SELECT * INTO inv FROM public.invoices WHERE id = p_invoice_id AND company_id = p_company_id;

  IF FOUND THEN
    v_date := COALESCE(inv.issue_date::date, inv.invoice_date::date, inv.created_at::date, CURRENT_DATE);
    v_desc := btrim('Invoice ' || COALESCE(inv.invoice_number, ''));
    v_project := inv.project_id;

    IF lower(COALESCE(inv.status, 'draft')) NOT IN ('draft', 'cancelled', 'canceled', 'void', 'voided') THEN
      v_total := round(COALESCE(inv.total_amount, 0), 2);
      v_tax := round(COALESCE(inv.tax_amount, 0), 2);
      v_retention := round(COALESCE(inv.retention_amount, 0), 2);
      v_ar := public.ledger_role_account(p_company_id, 'receivable');
      v_retainage := COALESCE(public.ledger_role_account(p_company_id, 'retainage_receivable'), v_ar);

      IF COALESCE(inv.invoice_type, '') = 'retention_release' THEN
        v_lines := jsonb_build_array(
          jsonb_build_object('a', v_ar, 'p', v_project, 'amt', v_total),
          jsonb_build_object('a', v_retainage, 'p', v_project, 'amt', -v_total));
      ELSE
        v_lines := jsonb_build_array(
          jsonb_build_object('a', v_ar, 'p', v_project, 'amt', v_total),
          jsonb_build_object('a', v_retainage, 'p', v_project, 'amt', v_retention),
          jsonb_build_object('a', public.ledger_role_account(p_company_id, 'sales_tax_payable'),
                             'p', v_project, 'amt', -v_tax),
          jsonb_build_object('a', public.ledger_role_account(p_company_id, 'revenue'),
                             'p', v_project, 'amt', -(v_total + v_retention - v_tax)));
      END IF;
    END IF;
  END IF;

  RETURN public.ledger_sync(p_company_id, 'invoice', p_invoice_id, 'invoice',
    v_date, v_desc, v_project, v_lines, p_only_if_unposted);
END;
$$;

-- Customer payment: cash in, receivable down.
CREATE OR REPLACE FUNCTION public.ledger_sync_invoice_payment(
  p_company_id uuid, p_payment_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  pay     record;
  v_lines jsonb := '[]'::jsonb;
  v_date  date := CURRENT_DATE;
  v_desc  text := 'Customer payment';
  v_amt   numeric;
  v_project uuid;
BEGIN
  SELECT p.*, i.project_id AS inv_project, i.invoice_number AS inv_number
    INTO pay
    FROM public.invoice_payments p
    LEFT JOIN public.invoices i ON i.id = p.invoice_id
   WHERE p.id = p_payment_id AND p.company_id = p_company_id;

  IF FOUND THEN
    v_date := COALESCE(pay.payment_date::date, CURRENT_DATE);
    v_desc := btrim('Payment on invoice ' || COALESCE(pay.inv_number, ''));
    v_amt := round(COALESCE(pay.payment_amount, 0), 2);
    v_project := pay.inv_project;
    v_lines := jsonb_build_array(
      jsonb_build_object('a', public.ledger_role_account(p_company_id, 'bank'), 'p', pay.inv_project, 'amt', v_amt),
      jsonb_build_object('a', public.ledger_role_account(p_company_id, 'receivable'), 'p', pay.inv_project, 'amt', -v_amt));
  END IF;

  RETURN public.ledger_sync(p_company_id, 'invoice_payment', p_payment_id, 'payment',
    v_date, v_desc, v_project, v_lines, p_only_if_unposted);
END;
$$;

-- Expense: a job cost (by category) or overhead, paid from the bank or put on
-- a card. A rejected or voided expense has nothing in the ledger.
CREATE OR REPLACE FUNCTION public.ledger_sync_expense(
  p_company_id uuid, p_expense_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  ex       record;
  v_lines  jsonb := '[]'::jsonb;
  v_date   date := CURRENT_DATE;
  v_desc   text := 'Expense';
  v_amt    numeric;
  v_debit  uuid;
  v_credit uuid;
  v_project uuid;
BEGIN
  SELECT e.*, ec.name AS category_name, cc.category AS cost_code_category
    INTO ex
    FROM public.expenses e
    LEFT JOIN public.expense_categories ec ON ec.id = e.category_id
    LEFT JOIN public.cost_codes cc ON cc.id = e.cost_code_id
   WHERE e.id = p_expense_id AND e.company_id = p_company_id;

  IF FOUND THEN
    v_date := COALESCE(ex.expense_date::date, CURRENT_DATE);
    v_desc := COALESCE(NULLIF(btrim(ex.description), ''), 'Expense');
    v_project := ex.project_id;

    IF lower(COALESCE(ex.payment_status, '')) NOT IN ('rejected', 'void', 'voided', 'cancelled', 'canceled', 'declined') THEN
      v_amt := round(COALESCE(ex.amount, 0), 2);

      IF ex.project_id IS NOT NULL THEN
        v_debit := COALESCE(
          public.ledger_role_account(p_company_id,
            public.ledger_job_cost_role(COALESCE(ex.category_name, ex.cost_code_category, ''))),
          public.ledger_role_account(p_company_id, 'direct_materials'),
          public.ledger_role_account(p_company_id, 'other_cogs'));
      ELSE
        v_debit := public.ledger_role_account(p_company_id, 'overhead_expense');
      END IF;

      v_credit := CASE WHEN lower(COALESCE(ex.payment_method, '')) IN ('credit_card', 'card')
                       THEN public.ledger_role_account(p_company_id, 'credit_card')
                       ELSE public.ledger_role_account(p_company_id, 'bank') END;

      v_lines := jsonb_build_array(
        jsonb_build_object('a', v_debit, 'p', ex.project_id, 'c', ex.cost_code_id, 'amt', v_amt),
        jsonb_build_object('a', v_credit, 'p', ex.project_id, 'c', ex.cost_code_id, 'amt', -v_amt));
    END IF;
  END IF;

  RETURN public.ledger_sync(p_company_id, 'expense', p_expense_id, 'journal_entry',
    v_date, v_desc, v_project, v_lines, p_only_if_unposted);
END;
$$;

-- Bill: each line to the expense account it names (job cost or overhead, the
-- person entering the bill chose), tax with its line, the total to payables.
-- A bill with no lines names no expense account, so it is skipped rather than
-- guessed at; every bill the app creates has lines.
CREATE OR REPLACE FUNCTION public.ledger_sync_bill(
  p_company_id uuid, p_bill_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  b        record;
  v_lines  jsonb := '[]'::jsonb;
  v_date   date := CURRENT_DATE;
  v_desc   text := 'Bill';
  v_total  numeric;
  v_active uuid;
  v_project uuid;
BEGIN
  SELECT * INTO b FROM public.bills WHERE id = p_bill_id AND company_id = p_company_id;

  IF FOUND THEN
    v_date := COALESCE(b.bill_date::date, CURRENT_DATE);
    v_project := b.project_id;
    v_desc := btrim('Bill ' || COALESCE(b.bill_number, '') ||
                    COALESCE(' (' || NULLIF(b.vendor_ref_number, '') || ')', ''));

    IF lower(COALESCE(b.status, 'open')) NOT IN ('draft', 'void') THEN
      SELECT jsonb_agg(jsonb_build_object(
               'a', li.expense_account_id,
               'p', COALESCE(li.project_id, b.project_id),
               'c', li.cost_code_id,
               'amt', round(COALESCE(li.amount, 0) + COALESCE(li.tax_amount, 0), 2))),
             round(sum(COALESCE(li.amount, 0) + COALESCE(li.tax_amount, 0)), 2)
        INTO v_lines, v_total
        FROM public.bill_line_items li
       WHERE li.bill_id = b.id;

      IF v_lines IS NOT NULL THEN
        v_lines := v_lines || jsonb_build_array(jsonb_build_object(
          'a', COALESCE(b.ap_account_id, public.ledger_role_account(p_company_id, 'payable')),
          'p', b.project_id, 'amt', -v_total));
      END IF;
    END IF;
  END IF;

  v_active := public.ledger_sync(p_company_id, 'bill', p_bill_id, 'bill',
    v_date, v_desc, v_project, v_lines, p_only_if_unposted);

  -- The link the table has always had and nothing wrote.
  UPDATE public.bills SET journal_entry_id = v_active
   WHERE id = p_bill_id AND journal_entry_id IS DISTINCT FROM v_active;

  RETURN v_active;
END;
$$;

-- Bill payment: payables down, cash (or the card) down. Each applied bill
-- clears the payable it was booked to; anything unapplied is a vendor credit
-- in the default payables account.
CREATE OR REPLACE FUNCTION public.ledger_sync_bill_payment(
  p_company_id uuid, p_payment_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  bp        record;
  v_lines   jsonb := '[]'::jsonb;
  v_date    date := CURRENT_DATE;
  v_desc    text := 'Bill payment';
  v_total   numeric;
  v_applied numeric;
  v_ap      uuid;
  v_cash    uuid;
  v_active  uuid;
BEGIN
  SELECT * INTO bp FROM public.bill_payments WHERE id = p_payment_id AND company_id = p_company_id;

  IF FOUND THEN
    v_date := COALESCE(bp.payment_date::date, CURRENT_DATE);
    v_desc := btrim('Bill payment ' || COALESCE(bp.payment_number, ''));
    v_total := round(COALESCE(bp.total_amount, 0), 2);
    v_ap := public.ledger_role_account(p_company_id, 'payable');
    v_cash := COALESCE(bp.bank_account_id,
      CASE WHEN lower(COALESCE(bp.payment_method, '')) = 'credit_card'
           THEN public.ledger_role_account(p_company_id, 'credit_card')
           ELSE public.ledger_role_account(p_company_id, 'bank') END);

    SELECT COALESCE(jsonb_agg(jsonb_build_object('a', s.ap, 'amt', s.applied)), '[]'::jsonb),
           COALESCE(sum(s.applied), 0)
      INTO v_lines, v_applied
      FROM (
        SELECT COALESCE(b.ap_account_id, v_ap) AS ap, round(sum(COALESCE(a.amount_applied, 0)), 2) AS applied
          FROM public.bill_payment_applications a
          LEFT JOIN public.bills b ON b.id = a.bill_id
         WHERE a.bill_payment_id = bp.id
         GROUP BY 1
      ) s;

    v_lines := v_lines || jsonb_build_array(
      jsonb_build_object('a', v_ap, 'amt', v_total - v_applied),
      jsonb_build_object('a', v_cash, 'amt', -v_total));
  END IF;

  v_active := public.ledger_sync(p_company_id, 'bill_payment', p_payment_id, 'payment',
    v_date, v_desc, NULL, v_lines, p_only_if_unposted);

  UPDATE public.bill_payments SET journal_entry_id = v_active
   WHERE id = p_payment_id AND journal_entry_id IS DISTINCT FROM v_active;

  RETURN v_active;
END;
$$;

-- Approved labour: direct labour cost on the job against accrued wages, at the
-- burdened cost US-321 froze on the time entry. The payroll run that pays it
-- (QuickBooks, Gusto, a bank transfer) clears accrued wages; Brikly does not
-- run payroll, so that side is a journal entry the owner records.
CREATE OR REPLACE FUNCTION public.ledger_sync_time_entry(
  p_company_id uuid, p_time_entry_id uuid, p_only_if_unposted boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  te      record;
  v_lines jsonb := '[]'::jsonb;
  v_date  date := CURRENT_DATE;
  v_cost  numeric;
  v_project uuid;
BEGIN
  SELECT t.*, COALESCE(t.company_id, p.company_id) AS resolved_company
    INTO te
    FROM public.time_entries t
    LEFT JOIN public.projects p ON p.id = t.project_id
   WHERE t.id = p_time_entry_id;

  IF FOUND AND te.resolved_company = p_company_id THEN
    v_date := COALESCE(te.start_time::date, CURRENT_DATE);
    v_project := te.project_id;
    IF te.approval_status = 'approved' AND COALESCE(te.labor_cost, 0) > 0 THEN
      v_cost := round(te.labor_cost, 2);
      v_lines := jsonb_build_array(
        jsonb_build_object('a', public.ledger_role_account(p_company_id, 'direct_labor'),
                           'p', te.project_id, 'c', te.cost_code_id, 'amt', v_cost),
        jsonb_build_object('a', public.ledger_role_account(p_company_id, 'accrued_wages'),
                           'p', te.project_id, 'amt', -v_cost));
    END IF;
  END IF;

  RETURN public.ledger_sync(p_company_id, 'time_entry', p_time_entry_id, 'payroll',
    v_date, 'Approved labor', v_project, v_lines, p_only_if_unposted);
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Triggers
-- ---------------------------------------------------------------------------
-- A ledger fault must never stop someone invoicing, so each trigger catches
-- and warns; the backfill posts anything a failure left out. The function
-- names are the ones 20260903250000 created, so the old bodies are replaced
-- rather than left behind.

CREATE OR REPLACE FUNCTION public.post_invoice_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF public.ledger_posting_enabled(r.company_id) THEN
    BEGIN
      PERFORM public.ledger_sync_invoice(r.company_id, r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: invoice % not posted to the ledger: %', r.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_invoice_to_ledger ON public.invoices;
CREATE TRIGGER trg_post_invoice_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF status, total_amount, tax_amount, retention_amount,
    invoice_type, issue_date, invoice_date, project_id, invoice_number
  ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.post_invoice_to_ledger();

CREATE OR REPLACE FUNCTION public.post_invoice_payment_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF public.ledger_posting_enabled(r.company_id) THEN
    BEGIN
      PERFORM public.ledger_sync_invoice_payment(r.company_id, r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: payment % not posted to the ledger: %', r.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_invoice_payment_to_ledger ON public.invoice_payments;
CREATE TRIGGER trg_post_invoice_payment_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF payment_amount, payment_date, invoice_id
  ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.post_invoice_payment_to_ledger();

CREATE OR REPLACE FUNCTION public.post_expense_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r record;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  IF public.ledger_posting_enabled(r.company_id) THEN
    BEGIN
      PERFORM public.ledger_sync_expense(r.company_id, r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: expense % not posted to the ledger: %', r.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_expense_to_ledger ON public.expenses;
CREATE TRIGGER trg_post_expense_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF amount, expense_date, project_id, cost_code_id,
    category_id, payment_method, payment_status, description
  ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.post_expense_to_ledger();

CREATE OR REPLACE FUNCTION public.post_bill_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_bill    uuid;
BEGIN
  IF TG_TABLE_NAME = 'bill_line_items' THEN
    IF TG_OP = 'DELETE' THEN
      v_company := OLD.company_id; v_bill := OLD.bill_id;
    ELSE
      v_company := NEW.company_id; v_bill := NEW.bill_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_company := OLD.company_id; v_bill := OLD.id;
  ELSE
    v_company := NEW.company_id; v_bill := NEW.id;
  END IF;

  IF public.ledger_posting_enabled(v_company) THEN
    BEGIN
      PERFORM public.ledger_sync_bill(v_company, v_bill);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: bill % not posted to the ledger: %', v_bill, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

-- journal_entry_id is deliberately not in the column list: the rule writes it,
-- and listing it would re-enter the trigger on its own write.
DROP TRIGGER IF EXISTS trg_post_bill_to_ledger ON public.bills;
CREATE TRIGGER trg_post_bill_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF status, total_amount, bill_date, ap_account_id,
    project_id, bill_number
  ON public.bills
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_to_ledger();

DROP TRIGGER IF EXISTS trg_post_bill_line_to_ledger ON public.bill_line_items;
CREATE TRIGGER trg_post_bill_line_to_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_line_items
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_to_ledger();

CREATE OR REPLACE FUNCTION public.post_bill_payment_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_payment uuid;
BEGIN
  IF TG_TABLE_NAME = 'bill_payment_applications' THEN
    IF TG_OP = 'DELETE' THEN
      v_company := OLD.company_id; v_payment := OLD.bill_payment_id;
    ELSE
      v_company := NEW.company_id; v_payment := NEW.bill_payment_id;
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_company := OLD.company_id; v_payment := OLD.id;
  ELSE
    v_company := NEW.company_id; v_payment := NEW.id;
  END IF;

  IF public.ledger_posting_enabled(v_company) THEN
    BEGIN
      PERFORM public.ledger_sync_bill_payment(v_company, v_payment);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: bill payment % not posted to the ledger: %', v_payment, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_bill_payment_to_ledger ON public.bill_payments;
CREATE TRIGGER trg_post_bill_payment_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF total_amount, payment_date, payment_method,
    bank_account_id, payment_number
  ON public.bill_payments
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_payment_to_ledger();

DROP TRIGGER IF EXISTS trg_post_bill_payment_application_to_ledger ON public.bill_payment_applications;
CREATE TRIGGER trg_post_bill_payment_application_to_ledger
  AFTER INSERT OR UPDATE OR DELETE ON public.bill_payment_applications
  FOR EACH ROW EXECUTE FUNCTION public.post_bill_payment_to_ledger();

CREATE OR REPLACE FUNCTION public.post_time_entry_to_ledger()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r         record;
  v_company uuid;
BEGIN
  IF TG_OP = 'DELETE' THEN r := OLD; ELSE r := NEW; END IF;
  v_company := r.company_id;
  IF v_company IS NULL THEN
    SELECT company_id INTO v_company FROM public.projects WHERE id = r.project_id;
  END IF;
  IF v_company IS NOT NULL AND public.ledger_posting_enabled(v_company) THEN
    BEGIN
      PERFORM public.ledger_sync_time_entry(v_company, r.id);
    EXCEPTION WHEN OTHERS THEN
      RAISE WARNING 'US-334: time entry % not posted to the ledger: %', r.id, SQLERRM;
    END;
  END IF;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_time_entry_to_ledger ON public.time_entries;
CREATE TRIGGER trg_post_time_entry_to_ledger
  AFTER INSERT OR DELETE OR UPDATE OF approval_status, labor_cost, project_id, cost_code_id, start_time
  ON public.time_entries
  FOR EACH ROW EXECUTE FUNCTION public.post_time_entry_to_ledger();

-- ---------------------------------------------------------------------------
-- 5. The old single-entry helper, kept for its signature
-- ---------------------------------------------------------------------------
-- Same arguments and result as before; it now writes through ledger_sync so
-- it gets the draft-then-post ordering and the tenant check on accounts.
CREATE OR REPLACE FUNCTION public.post_ledger_entry(
  p_company_id uuid,
  p_reference_type text,
  p_reference_id uuid,
  p_transaction_type transaction_type,
  p_entry_date date,
  p_description text,
  p_debit_account uuid,
  p_credit_account uuid,
  p_amount numeric,
  p_project_id uuid DEFAULT NULL,
  p_cost_code_id uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_amount numeric := round(COALESCE(p_amount, 0), 2);
BEGIN
  IF v_amount <= 0 OR p_debit_account IS NULL OR p_credit_account IS NULL
     OR p_debit_account = p_credit_account THEN
    RETURN NULL;
  END IF;
  RETURN public.ledger_sync(
    p_company_id, p_reference_type, p_reference_id, p_transaction_type,
    p_entry_date, p_description, p_project_id,
    jsonb_build_array(
      jsonb_build_object('a', p_debit_account, 'p', p_project_id, 'c', p_cost_code_id, 'amt', v_amount),
      jsonb_build_object('a', p_credit_account, 'p', p_project_id, 'c', p_cost_code_id, 'amt', -v_amount)),
    true);
END;
$$;

-- ---------------------------------------------------------------------------
-- 6. Who may turn posting on and post history
-- ---------------------------------------------------------------------------
-- An admin or accounting user of the company, a root admin, or a trusted
-- server-side caller (service_role, or a direct connection such as a
-- migration). current_setting('role') is the role PostgREST switched to; a
-- SECURITY DEFINER body does not change it.
CREATE OR REPLACE FUNCTION public.ledger_caller_may_manage(p_company_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid  uuid := auth.uid();
  v_role text;
BEGIN
  IF p_company_id IS NULL THEN
    RETURN false;
  END IF;
  IF v_uid IS NULL THEN
    RETURN COALESCE(current_setting('role', true), 'none') IN ('service_role', 'none');
  END IF;
  v_role := public.get_user_role(v_uid)::text;
  IF v_role = 'root_admin' THEN
    RETURN true;
  END IF;
  RETURN public.get_user_company(v_uid) = p_company_id
     AND v_role IN ('admin', 'accounting');
END;
$$;

CREATE OR REPLACE FUNCTION public.ledger_audit(
  p_company_id uuid, p_action text, p_description text, p_metadata jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF to_regprocedure('public.log_audit_event(uuid,uuid,text,text,text,text,jsonb,jsonb,inet,text,text,text,text,text,jsonb)') IS NULL THEN
    RETURN;
  END IF;
  EXECUTE 'SELECT public.log_audit_event($1, $2, $3, $4, $5, $6, NULL, $7, NULL, NULL, NULL, $8, $9, $10, $11)'
    USING p_company_id, auth.uid(), p_action, 'general_ledger', p_company_id::text,
          'General ledger', p_metadata, 'high', 'financial', p_description, p_metadata;
EXCEPTION WHEN OTHERS THEN
  -- The audit write is not allowed to undo the change it records.
  RAISE WARNING 'US-334: audit log write failed: %', SQLERRM;
END;
$$;

-- Turn Brikly's ledger on or off for a company (AC3). Off leaves every entry
-- already posted where it is; on posts new documents from now. History comes
-- in through backfill_ledger, which is a separate, deliberate step.
CREATE OR REPLACE FUNCTION public.set_ledger_posting(p_company_id uuid, p_enabled boolean)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.ledger_caller_may_manage(p_company_id) THEN
    RAISE EXCEPTION 'Only an admin or accounting user of this company can change ledger posting'
      USING ERRCODE = '42501';
  END IF;

  UPDATE public.company_settings
     SET auto_post_to_ledger = COALESCE(p_enabled, false)
   WHERE company_id = p_company_id;
  IF NOT FOUND THEN
    INSERT INTO public.company_settings (company_id, auto_post_to_ledger)
    VALUES (p_company_id, COALESCE(p_enabled, false));
  END IF;

  PERFORM public.ledger_audit(p_company_id, 'ledger_posting_changed',
    CASE WHEN p_enabled THEN 'Brikly ledger posting turned on' ELSE 'Brikly ledger posting turned off' END,
    jsonb_build_object('auto_post_to_ledger', COALESCE(p_enabled, false)));

  RETURN COALESCE(p_enabled, false);
END;
$$;

COMMENT ON FUNCTION public.set_ledger_posting(uuid, boolean) IS
  'Turns automatic ledger posting on or off for a company. Admin or accounting only; audited. US-334.';

-- ---------------------------------------------------------------------------
-- 7. Backfill, on request
-- ---------------------------------------------------------------------------
-- Same signature and result shape as before. Posts every source dated on or
-- after p_from_date (default: the start of this year) that has never been
-- posted, and touches nothing that has: a second run posts nothing, and a run
-- after a partial failure picks up where it stopped. `posted` counts entries
-- written by this run; `skipped` counts sources that could not be posted (a
-- missing account, a bill with no lines). Already-posted sources are neither.
CREATE OR REPLACE FUNCTION public.backfill_ledger(
  p_company_id uuid,
  p_from_date date DEFAULT NULL
)
RETURNS TABLE (source text, posted integer, skipped integer)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_from    date := COALESCE(p_from_date, date_trunc('year', CURRENT_DATE)::date);
  v_posted  integer;
  v_skipped integer;
  v_type    text;
  v_ids     uuid[];
  v_id      uuid;
  v_result  uuid;
BEGIN
  IF NOT public.ledger_caller_may_manage(p_company_id) THEN
    RAISE EXCEPTION 'Only an admin or accounting user of this company can post ledger history'
      USING ERRCODE = '42501';
  END IF;
  IF NOT public.ledger_posting_enabled(p_company_id) THEN
    RAISE EXCEPTION 'Ledger posting is off for this company; turn it on before posting history'
      USING ERRCODE = '55000';
  END IF;

  FOREACH v_type IN ARRAY ARRAY['invoices', 'invoice_payments', 'expenses', 'bills', 'bill_payments', 'time_entries'] LOOP
    v_posted := 0; v_skipped := 0;

    v_ids := CASE v_type
      WHEN 'invoices' THEN ARRAY(
        SELECT i.id FROM public.invoices i
         WHERE i.company_id = p_company_id
           AND lower(COALESCE(i.status, 'draft')) NOT IN ('draft', 'cancelled', 'canceled', 'void', 'voided')
           AND COALESCE(i.issue_date::date, i.invoice_date::date, i.created_at::date) >= v_from
         ORDER BY 1)
      WHEN 'invoice_payments' THEN ARRAY(
        SELECT p.id FROM public.invoice_payments p
         WHERE p.company_id = p_company_id AND p.payment_date::date >= v_from ORDER BY 1)
      WHEN 'expenses' THEN ARRAY(
        SELECT e.id FROM public.expenses e
         WHERE e.company_id = p_company_id AND e.expense_date::date >= v_from
           AND lower(COALESCE(e.payment_status, '')) NOT IN ('rejected', 'void', 'voided', 'cancelled', 'canceled', 'declined')
         ORDER BY 1)
      WHEN 'bills' THEN ARRAY(
        SELECT b.id FROM public.bills b
         WHERE b.company_id = p_company_id
           AND lower(COALESCE(b.status, 'open')) NOT IN ('draft', 'void')
           AND b.bill_date >= v_from ORDER BY 1)
      WHEN 'bill_payments' THEN ARRAY(
        SELECT bp.id FROM public.bill_payments bp
         WHERE bp.company_id = p_company_id AND bp.payment_date >= v_from ORDER BY 1)
      ELSE ARRAY(
        SELECT t.id FROM public.time_entries t
          LEFT JOIN public.projects pr ON pr.id = t.project_id
         WHERE COALESCE(t.company_id, pr.company_id) = p_company_id
           AND t.approval_status = 'approved' AND COALESCE(t.labor_cost, 0) > 0
           AND t.start_time::date >= v_from ORDER BY 1)
    END;

    FOREACH v_id IN ARRAY v_ids LOOP
      CONTINUE WHEN EXISTS (
        SELECT 1 FROM public.journal_entries
         WHERE company_id = p_company_id AND reference_id = v_id AND entry_number LIKE 'AUTO-%'
           AND reference_type = CASE v_type
             WHEN 'invoices' THEN 'invoice' WHEN 'invoice_payments' THEN 'invoice_payment'
             WHEN 'expenses' THEN 'expense' WHEN 'bills' THEN 'bill'
             WHEN 'bill_payments' THEN 'bill_payment' ELSE 'time_entry' END);

      v_result := CASE v_type
        WHEN 'invoices' THEN public.ledger_sync_invoice(p_company_id, v_id, true)
        WHEN 'invoice_payments' THEN public.ledger_sync_invoice_payment(p_company_id, v_id, true)
        WHEN 'expenses' THEN public.ledger_sync_expense(p_company_id, v_id, true)
        WHEN 'bills' THEN public.ledger_sync_bill(p_company_id, v_id, true)
        WHEN 'bill_payments' THEN public.ledger_sync_bill_payment(p_company_id, v_id, true)
        ELSE public.ledger_sync_time_entry(p_company_id, v_id, true)
      END;

      IF v_result IS NOT NULL THEN v_posted := v_posted + 1; ELSE v_skipped := v_skipped + 1; END IF;
    END LOOP;

    source := v_type; posted := v_posted; skipped := v_skipped;
    RETURN NEXT;
  END LOOP;

  PERFORM public.ledger_audit(p_company_id, 'ledger_backfill',
    'Posted ledger history from ' || v_from::text,
    jsonb_build_object('from_date', v_from));
END;
$$;

COMMENT ON FUNCTION public.backfill_ledger(uuid, date) IS
  'Posts a company''s unposted history to the ledger on request. Admin or accounting only, posting must be on, idempotent: a second run posts nothing. US-334.';

-- ---------------------------------------------------------------------------
-- 8. current_balance for entries the old helper posted
-- ---------------------------------------------------------------------------
-- Every entry 20260903250000 wrote was inserted as 'posted' before its lines,
-- so trg_update_account_balances added zero. Their numbers have the old shape
-- (AUTO-<TYPE>-<8 hex>), which nothing writes any more, so this runs over
-- exactly those entries and only once.
WITH legacy AS (
  SELECT l.account_id,
         SUM(COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0)) AS net_debit
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
   WHERE e.transaction_status = 'posted'
     AND e.entry_number ~ '^AUTO-(INVOICE|INVOICE_PAYMENT|EXPENSE)-[0-9a-f]{8}$'
   GROUP BY l.account_id
)
UPDATE public.chart_of_accounts a
   SET current_balance = COALESCE(a.current_balance, 0)
       + CASE WHEN a.normal_balance = 'credit' THEN -legacy.net_debit ELSE legacy.net_debit END
  FROM legacy
 WHERE a.id = legacy.account_id;

-- ---------------------------------------------------------------------------
-- 9. Privileges
-- ---------------------------------------------------------------------------
-- The internals run only inside the triggers and the two entry points below,
-- all SECURITY DEFINER, so no client role needs them. Supabase grants EXECUTE
-- on new functions to anon and authenticated by default, hence the explicit
-- revokes as well as PUBLIC.
REVOKE ALL ON FUNCTION public.ledger_account(uuid, account_subtype) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_posting_enabled(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.post_ledger_entry(uuid, text, uuid, transaction_type, date, text, uuid, uuid, numeric, uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_role_account(uuid, text) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_write_entry(uuid, text, uuid, transaction_type, date, text, uuid, jsonb, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_active_entry(uuid, text, uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync(uuid, text, uuid, transaction_type, date, text, uuid, jsonb, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_invoice(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_invoice_payment(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_expense(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_bill(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_bill_payment(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_sync_time_entry(uuid, uuid, boolean) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_caller_may_manage(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.ledger_audit(uuid, text, text, jsonb) FROM PUBLIC, anon, authenticated;

REVOKE ALL ON FUNCTION public.set_ledger_posting(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.set_ledger_posting(uuid, boolean) TO authenticated, service_role;
REVOKE ALL ON FUNCTION public.backfill_ledger(uuid, date) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.backfill_ledger(uuid, date) TO authenticated, service_role;
