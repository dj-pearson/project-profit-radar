-- The general ledger stops being a sidecar (US-334).
--
-- WHAT WAS THERE. chart_of_accounts.current_balance is maintained by a real
-- trigger on journal posting (20250707000000:713-751), and nothing posts. No
-- invoice, payment, bill, bill payment or expense creates a journal entry;
-- bills.journal_entry_id has never been written. So the P&L and the balance
-- sheet reflect hand-keyed journal entries and nothing else, and
-- BalanceSheet.tsx sets currentYearEarnings = 0 with the comment "Placeholder".
--
-- WHERE THE RULES LIVE. Here, in triggers, not in application code. An invoice
-- can be created from the invoices page, from progress billing (US-327), from
-- a time-and-materials pull, from the QuickBooks sync (US-333) and from
-- whatever iOS grows. A posting rule that lives in one of those paths is a rule
-- the other four do not follow. This is the same reason US-321 posts labour
-- cost from a trigger.
--
-- OFF BY DEFAULT. company_settings.auto_post_to_ledger defaults to false.
-- Most SMB contractors run their statements in QuickBooks (US-333), and
-- silently starting to post entries into a ledger somebody already reconciles
-- elsewhere would corrupt their books. Turning it on is a deliberate act.
--
-- IDEMPOTENT. Every entry is keyed on (reference_type, reference_id), so a
-- re-run, a retry or the backfill cannot double-post. That is what makes it
-- safe to enable on a company with history.

-- ---------------------------------------------------------------------------
-- 1. The setting
-- ---------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS auto_post_to_ledger BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.company_settings.auto_post_to_ledger IS
  'When false (the default) Brikly records no journal entries and the statements say they are sourced from QuickBooks. US-334.';

-- ---------------------------------------------------------------------------
-- 2. Which account is which
-- ---------------------------------------------------------------------------
-- account_subtype already names the roles a posting rule needs
-- (accounts_receivable, accounts_payable, cash, bank, ...), so the rules do not
-- need a second mapping table. The first active account of a subtype wins,
-- ordered by account_number so the answer is stable rather than whichever row
-- the planner returned.
CREATE OR REPLACE FUNCTION public.ledger_account(
  p_company_id uuid,
  p_subtype account_subtype
)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id
    FROM public.chart_of_accounts
   WHERE company_id = p_company_id
     AND account_subtype = p_subtype
     AND COALESCE(is_active, true)
   ORDER BY account_number
   LIMIT 1;
$$;

COMMENT ON FUNCTION public.ledger_account(uuid, account_subtype) IS
  'The account a posting rule should use for a role. NULL when the company has no such account, which makes the rule skip rather than guess. US-334.';

-- ---------------------------------------------------------------------------
-- 3. One balanced entry
-- ---------------------------------------------------------------------------
-- Every rule below funnels through this. It refuses to write an unbalanced
-- entry, refuses to write when either account is missing, and does nothing at
-- all when an entry for that source already exists.
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
  v_entry_id uuid;
  v_amount   numeric := round(COALESCE(p_amount, 0), 2);
BEGIN
  -- Nothing to record.
  IF v_amount <= 0 THEN
    RETURN NULL;
  END IF;

  -- A one-sided entry is not a journal entry. Skipping is right: the
  -- alternative is inventing an account, and a misposted transaction is harder
  -- to find than a missing one.
  IF p_debit_account IS NULL OR p_credit_account IS NULL THEN
    RAISE NOTICE 'US-334: skipped % % - company % has no account for one side',
      p_reference_type, p_reference_id, p_company_id;
    RETURN NULL;
  END IF;

  IF p_debit_account = p_credit_account THEN
    RAISE NOTICE 'US-334: skipped % % - both sides resolve to the same account',
      p_reference_type, p_reference_id;
    RETURN NULL;
  END IF;

  -- Already posted. This is what makes a retry, a re-save and the backfill
  -- safe on a company with history.
  SELECT id INTO v_entry_id
    FROM public.journal_entries
   WHERE company_id = p_company_id
     AND reference_type = p_reference_type
     AND reference_id = p_reference_id
   LIMIT 1;
  IF v_entry_id IS NOT NULL THEN
    RETURN v_entry_id;
  END IF;

  INSERT INTO public.journal_entries
    (company_id, entry_number, entry_date, posting_date, description,
     reference_type, reference_id, transaction_type, transaction_status,
     project_id, is_approved)
  VALUES
    (p_company_id,
     'AUTO-' || upper(p_reference_type) || '-' || substr(p_reference_id::text, 1, 8),
     p_entry_date, p_entry_date, p_description,
     p_reference_type, p_reference_id, p_transaction_type, 'posted',
     p_project_id, true)
  RETURNING id INTO v_entry_id;

  INSERT INTO public.journal_entry_lines
    (journal_entry_id, company_id, account_id, line_number,
     debit_amount, credit_amount, description, project_id, cost_code_id)
  VALUES
    (v_entry_id, p_company_id, p_debit_account, 1, v_amount, 0,
     p_description, p_project_id, p_cost_code_id),
    (v_entry_id, p_company_id, p_credit_account, 2, 0, v_amount,
     p_description, p_project_id, p_cost_code_id);

  RETURN v_entry_id;
END;
$$;

COMMENT ON FUNCTION public.post_ledger_entry IS
  'Writes one balanced two-line journal entry, once per source row. Skips rather than guesses when an account is missing. US-334.';

-- Whether this company wants Brikly keeping its books at all.
CREATE OR REPLACE FUNCTION public.ledger_posting_enabled(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT auto_post_to_ledger FROM public.company_settings WHERE company_id = p_company_id),
    false
  );
$$;

-- ---------------------------------------------------------------------------
-- 4. The rules
-- ---------------------------------------------------------------------------

-- An invoice earns revenue and creates a receivable.
CREATE OR REPLACE FUNCTION public.post_invoice_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- A draft is not a transaction. Only a sent or later invoice is earned.
  IF COALESCE(NEW.status, 'draft') = 'draft' THEN RETURN NEW; END IF;
  IF NOT public.ledger_posting_enabled(NEW.company_id) THEN RETURN NEW; END IF;

  PERFORM public.post_ledger_entry(
    NEW.company_id, 'invoice', NEW.id, 'invoice',
    COALESCE(NEW.issue_date, NEW.invoice_date, CURRENT_DATE)::date,
    'Invoice ' || COALESCE(NEW.invoice_number, ''),
    public.ledger_account(NEW.company_id, 'accounts_receivable'),
    COALESCE(public.ledger_account(NEW.company_id, 'service_revenue'),
             public.ledger_account(NEW.company_id, 'sales_revenue'),
             public.ledger_account(NEW.company_id, 'other_revenue')),
    NEW.total_amount,
    NEW.project_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_invoice_to_ledger ON public.invoices;
CREATE TRIGGER trg_post_invoice_to_ledger
  AFTER INSERT OR UPDATE OF status ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.post_invoice_to_ledger();

-- A customer payment turns a receivable into cash.
CREATE OR REPLACE FUNCTION public.post_invoice_payment_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_project uuid;
BEGIN
  IF NOT public.ledger_posting_enabled(NEW.company_id) THEN RETURN NEW; END IF;

  SELECT project_id INTO v_project FROM public.invoices WHERE id = NEW.invoice_id;

  PERFORM public.post_ledger_entry(
    NEW.company_id, 'invoice_payment', NEW.id, 'payment',
    COALESCE(NEW.payment_date, CURRENT_DATE)::date,
    'Payment on invoice',
    COALESCE(public.ledger_account(NEW.company_id, 'bank'),
             public.ledger_account(NEW.company_id, 'cash')),
    public.ledger_account(NEW.company_id, 'accounts_receivable'),
    NEW.payment_amount,
    v_project
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_invoice_payment_to_ledger ON public.invoice_payments;
CREATE TRIGGER trg_post_invoice_payment_to_ledger
  AFTER INSERT ON public.invoice_payments
  FOR EACH ROW EXECUTE FUNCTION public.post_invoice_payment_to_ledger();

-- An expense is a cost, paid from cash or sitting on a card.
CREATE OR REPLACE FUNCTION public.post_expense_to_ledger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_credit uuid;
BEGIN
  IF NOT public.ledger_posting_enabled(NEW.company_id) THEN RETURN NEW; END IF;

  -- A card purchase is a liability until the card is paid; anything else came
  -- out of the bank.
  v_credit := CASE
    WHEN NEW.payment_method IN ('credit_card', 'card')
      THEN public.ledger_account(NEW.company_id, 'credit_card')
    ELSE COALESCE(public.ledger_account(NEW.company_id, 'bank'),
                  public.ledger_account(NEW.company_id, 'cash'))
  END;

  PERFORM public.post_ledger_entry(
    NEW.company_id, 'expense', NEW.id, 'journal_entry',
    COALESCE(NEW.expense_date, CURRENT_DATE)::date,
    COALESCE(NEW.description, 'Expense'),
    -- A job expense is cost of revenue; overhead is an operating expense.
    CASE WHEN NEW.project_id IS NOT NULL
         THEN COALESCE(public.ledger_account(NEW.company_id, 'other_cogs'),
                       public.ledger_account(NEW.company_id, 'direct_materials'),
                       public.ledger_account(NEW.company_id, 'operating_expense'))
         ELSE public.ledger_account(NEW.company_id, 'operating_expense') END,
    v_credit,
    NEW.amount,
    NEW.project_id,
    NEW.cost_code_id
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_post_expense_to_ledger ON public.expenses;
CREATE TRIGGER trg_post_expense_to_ledger
  AFTER INSERT ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.post_expense_to_ledger();

-- ---------------------------------------------------------------------------
-- 5. Backfill, on request
-- ---------------------------------------------------------------------------
-- Turning posting on for a company that has been trading is only useful if its
-- history comes with it. Idempotent through post_ledger_entry, so running it
-- twice is harmless and running it after a partial failure resumes.
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
  v_from date := COALESCE(p_from_date, date_trunc('year', CURRENT_DATE)::date);
  v_posted integer;
  v_skipped integer;
  r RECORD;
BEGIN
  IF p_company_id <> public.get_user_company(auth.uid()) THEN
    RAISE EXCEPTION 'Not your company';
  END IF;

  v_posted := 0; v_skipped := 0;
  FOR r IN
    SELECT * FROM public.invoices
     WHERE company_id = p_company_id
       AND COALESCE(status, 'draft') <> 'draft'
       AND COALESCE(issue_date, invoice_date)::date >= v_from
  LOOP
    IF public.post_ledger_entry(
         p_company_id, 'invoice', r.id, 'invoice',
         COALESCE(r.issue_date, r.invoice_date, CURRENT_DATE)::date,
         'Invoice ' || COALESCE(r.invoice_number, ''),
         public.ledger_account(p_company_id, 'accounts_receivable'),
         COALESCE(public.ledger_account(p_company_id, 'service_revenue'),
                  public.ledger_account(p_company_id, 'sales_revenue'),
                  public.ledger_account(p_company_id, 'other_revenue')),
         r.total_amount, r.project_id) IS NOT NULL
    THEN v_posted := v_posted + 1; ELSE v_skipped := v_skipped + 1; END IF;
  END LOOP;
  source := 'invoices'; posted := v_posted; skipped := v_skipped; RETURN NEXT;

  v_posted := 0; v_skipped := 0;
  FOR r IN
    SELECT p.*, i.project_id AS inv_project
      FROM public.invoice_payments p
      LEFT JOIN public.invoices i ON i.id = p.invoice_id
     WHERE p.company_id = p_company_id
       AND p.payment_date::date >= v_from
  LOOP
    IF public.post_ledger_entry(
         p_company_id, 'invoice_payment', r.id, 'payment',
         r.payment_date::date, 'Payment on invoice',
         COALESCE(public.ledger_account(p_company_id, 'bank'),
                  public.ledger_account(p_company_id, 'cash')),
         public.ledger_account(p_company_id, 'accounts_receivable'),
         r.payment_amount, r.inv_project) IS NOT NULL
    THEN v_posted := v_posted + 1; ELSE v_skipped := v_skipped + 1; END IF;
  END LOOP;
  source := 'invoice_payments'; posted := v_posted; skipped := v_skipped; RETURN NEXT;

  v_posted := 0; v_skipped := 0;
  FOR r IN
    SELECT * FROM public.expenses
     WHERE company_id = p_company_id
       AND expense_date::date >= v_from
  LOOP
    IF public.post_ledger_entry(
         p_company_id, 'expense', r.id, 'journal_entry',
         r.expense_date::date, COALESCE(r.description, 'Expense'),
         CASE WHEN r.project_id IS NOT NULL
              THEN COALESCE(public.ledger_account(p_company_id, 'other_cogs'),
                            public.ledger_account(p_company_id, 'direct_materials'),
                            public.ledger_account(p_company_id, 'operating_expense'))
              ELSE public.ledger_account(p_company_id, 'operating_expense') END,
         CASE WHEN r.payment_method IN ('credit_card', 'card')
              THEN public.ledger_account(p_company_id, 'credit_card')
              ELSE COALESCE(public.ledger_account(p_company_id, 'bank'),
                            public.ledger_account(p_company_id, 'cash')) END,
         r.amount, r.project_id, r.cost_code_id) IS NOT NULL
    THEN v_posted := v_posted + 1; ELSE v_skipped := v_skipped + 1; END IF;
  END LOOP;
  source := 'expenses'; posted := v_posted; skipped := v_skipped; RETURN NEXT;
END;
$$;

COMMENT ON FUNCTION public.backfill_ledger(uuid, date) IS
  'Posts a company history to the ledger on request. Idempotent, so it can be re-run and resumed. US-334.';

REVOKE ALL ON FUNCTION public.backfill_ledger(uuid, date) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.backfill_ledger(uuid, date) TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. What the statements read
-- ---------------------------------------------------------------------------
-- Period-scoped, from the lines themselves. The pages read
-- chart_of_accounts.current_balance, which is a running total with no date on
-- it - their date-range inputs were never used in a query.
CREATE OR REPLACE VIEW public.ledger_account_activity AS
SELECT
  l.company_id,
  l.account_id,
  a.account_number,
  a.account_name,
  a.account_type,
  a.account_subtype,
  a.normal_balance,
  e.entry_date,
  l.project_id,
  SUM(COALESCE(l.debit_amount, 0))  AS debits,
  SUM(COALESCE(l.credit_amount, 0)) AS credits,
  CASE WHEN a.normal_balance = 'debit'
       THEN SUM(COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0))
       ELSE SUM(COALESCE(l.credit_amount, 0) - COALESCE(l.debit_amount, 0))
  END AS net_change
FROM public.journal_entry_lines l
JOIN public.journal_entries e ON e.id = l.journal_entry_id
JOIN public.chart_of_accounts a ON a.id = l.account_id
WHERE e.transaction_status = 'posted'
GROUP BY l.company_id, l.account_id, a.account_number, a.account_name,
         a.account_type, a.account_subtype, a.normal_balance, e.entry_date, l.project_id;

COMMENT ON VIEW public.ledger_account_activity IS
  'Posted ledger movement per account per day. What a P&L or balance sheet for a period should read, rather than the undated running total on chart_of_accounts. US-334.';

GRANT SELECT ON public.ledger_account_activity TO authenticated;
