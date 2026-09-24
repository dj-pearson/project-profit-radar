-- US-334: invoices, payments, expenses, bills, bill payments and approved
-- labour post to the general ledger; corrections reverse instead of deleting;
-- the backfill is safe to run twice; and none of it crosses a tenant.
--
-- Loads the real finance schema (20250707000000), the real seeded chart of
-- accounts (20250707000001), the first posting pass (20260903250000), the
-- view fix (20260924100000) and this pass (20260924180000/180001), over shims
-- of the source-document tables with the columns the rules read.

-- ---------------------------------------------------------------------------
-- Shims for what the finance migration references and the rules read.
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (id uuid PRIMARY KEY, company_id uuid, name text);
CREATE TABLE public.cost_codes (id uuid PRIMARY KEY, company_id uuid, code text, name text, category text);
CREATE TABLE public.vendors (id uuid PRIMARY KEY, company_id uuid, name text);
CREATE TABLE public.company_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid UNIQUE REFERENCES public.companies(id)
);
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, invoice_number text,
  status text DEFAULT 'draft', invoice_type text, total_amount numeric NOT NULL DEFAULT 0,
  tax_amount numeric DEFAULT 0, retention_amount numeric, issue_date date, invoice_date date,
  project_id uuid, created_at timestamptz NOT NULL DEFAULT now()
);
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id uuid NOT NULL, payment_amount numeric NOT NULL, payment_date date NOT NULL,
  payment_method text NOT NULL DEFAULT 'check'
);
CREATE TABLE public.expense_categories (id uuid PRIMARY KEY, company_id uuid, name text);
CREATE TABLE public.expenses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, project_id uuid,
  category_id uuid, cost_code_id uuid, amount numeric NOT NULL, description text NOT NULL,
  expense_date date NOT NULL DEFAULT CURRENT_DATE, payment_method text DEFAULT 'credit_card',
  payment_status text DEFAULT 'pending'
);
CREATE TABLE public.time_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, company_id uuid, user_id uuid,
  cost_code_id uuid, start_time timestamptz NOT NULL, approval_status text DEFAULT 'pending',
  labor_cost numeric
);
DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices', 'invoice_payments', 'expenses', 'company_settings'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format($p$CREATE POLICY company_rows ON public.%I FOR ALL TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()))$p$, t);
  END LOOP;
END $$;

\i supabase/migrations/20250707000000_enterprise_finance_module.sql
\i supabase/migrations/20250707000001_default_chart_of_accounts.sql

CREATE FUNCTION public.test_sqlstate(stmt text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;

-- Net debit (debits less credits) posted to an account number, optionally for
-- one source document.
CREATE FUNCTION public.t_net(p_company uuid, p_number text, p_ref uuid DEFAULT NULL) RETURNS numeric
LANGUAGE sql AS $$
  SELECT COALESCE(sum(l.debit_amount - l.credit_amount), 0)
    FROM public.journal_entry_lines l
    JOIN public.journal_entries e ON e.id = l.journal_entry_id
    JOIN public.chart_of_accounts a ON a.id = l.account_id
   WHERE e.company_id = p_company AND a.account_number = p_number
     AND e.transaction_status = 'posted'
     AND (p_ref IS NULL OR e.reference_id = p_ref)
$$;
CREATE FUNCTION public.t_entries(p_ref uuid) RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM public.journal_entries WHERE reference_id = p_ref
$$;
CREATE FUNCTION public.t_balance(p_company uuid, p_number text) RETURNS numeric LANGUAGE sql AS $$
  SELECT current_balance FROM public.chart_of_accounts WHERE company_id = p_company AND account_number = p_number
$$;

-- ---------------------------------------------------------------------------
-- Fixtures. Companies A and B get the seeded chart from the insert trigger;
-- C is used to prove the fix for entries the first pass posted.
-- ---------------------------------------------------------------------------
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000b1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1'), ('bbbbbbbb-0000-0000-0000-00000000000a');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B'),
  ('cccccccc-0000-0000-0000-000000000000', 'C');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 'accounting'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');
INSERT INTO public.projects VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Maple St'),
  ('bbbbbbbb-0000-0000-0000-0000000000f1', 'bbbbbbbb-0000-0000-0000-000000000000', 'Oak Ave'),
  ('cccccccc-0000-0000-0000-0000000000f1', 'cccccccc-0000-0000-0000-000000000000', 'Elm Rd');
INSERT INTO public.cost_codes VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000c0', 'aaaaaaaa-0000-0000-0000-000000000000', '06-100', 'Rough Carpentry', 'labor');
INSERT INTO public.vendors VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000d0', 'aaaaaaaa-0000-0000-0000-000000000000', 'Ace Lumber');
INSERT INTO public.expense_categories VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000e0', 'aaaaaaaa-0000-0000-0000-000000000000', 'Subcontractor');
INSERT INTO public.company_settings (company_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000'), ('bbbbbbbb-0000-0000-0000-000000000000');

SELECT test_assert(
  (SELECT count(*) FROM public.chart_of_accounts WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') > 100,
  'every company gets the seeded chart of accounts the rules look up by number');

-- ---------------------------------------------------------------------------
-- The first pass, and one entry it posted, so the repair can be proved.
-- ---------------------------------------------------------------------------
\i supabase/migrations/20260903250000_ledger_posting.sql

INSERT INTO public.company_settings (company_id, auto_post_to_ledger)
VALUES ('cccccccc-0000-0000-0000-000000000000', true);
INSERT INTO public.invoices (id, company_id, invoice_number, status, total_amount, issue_date, project_id)
VALUES ('cccccccc-0000-0000-0000-0000000000a1', 'cccccccc-0000-0000-0000-000000000000', 'C-1', 'sent', 700,
        '2026-02-10', 'cccccccc-0000-0000-0000-0000000000f1');

SELECT test_assert(
  (SELECT entry_number FROM public.journal_entries WHERE reference_id = 'cccccccc-0000-0000-0000-0000000000a1')
    = 'AUTO-INVOICE-cccccccc'
  AND public.t_balance('cccccccc-0000-0000-0000-000000000000', '1100') = 0,
  'before: the first pass posts its entry but current_balance never moves (header posted before its lines)');

\i supabase/migrations/20260924100000_finance_views_security_invoker.sql
\i supabase/migrations/20260924180000_ledger_posting_all_sources.sql
\i supabase/migrations/20260924180001_journal_entries_reference_index.sql

SELECT test_assert(
  public.t_balance('cccccccc-0000-0000-0000-000000000000', '1100') = 700
  AND public.t_balance('cccccccc-0000-0000-0000-000000000000', '4000') = 700,
  'the migration adds the first pass''s entries to current_balance once');

-- A legacy entry is reversed like any other when its invoice is voided.
UPDATE public.invoices SET status = 'void' WHERE id = 'cccccccc-0000-0000-0000-0000000000a1';
SELECT test_assert(
  public.t_net('cccccccc-0000-0000-0000-000000000000', '1100', 'cccccccc-0000-0000-0000-0000000000a1') = 0
  AND public.t_entries('cccccccc-0000-0000-0000-0000000000a1') = 2
  AND public.t_balance('cccccccc-0000-0000-0000-000000000000', '1100') = 0,
  'voiding an invoice the first pass posted reverses that entry, and current_balance follows');

-- ---------------------------------------------------------------------------
-- 1. Off by default: nothing posts.
-- ---------------------------------------------------------------------------
INSERT INTO public.invoices (id, company_id, invoice_number, status, total_amount, tax_amount, issue_date, project_id)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000a0', 'aaaaaaaa-0000-0000-0000-000000000000', 'INV-0', 'sent', 400, 0,
        '2026-01-15', 'aaaaaaaa-0000-0000-0000-0000000000f1');
INSERT INTO public.expenses (id, company_id, amount, description, expense_date, payment_method)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000e9', 'aaaaaaaa-0000-0000-0000-000000000000', 40, 'Printer paper',
        '2026-01-20', 'check');
SELECT test_assert(
  (SELECT count(*) FROM public.journal_entries WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 0,
  'with auto_post_to_ledger off (the default) a sent invoice and an expense post nothing');

-- ---------------------------------------------------------------------------
-- 2. Who can turn it on.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000b1');
SELECT test_assert(
  test_sqlstate($s$SELECT public.set_ledger_posting('aaaaaaaa-0000-0000-0000-000000000000', true)$s$) = '42501',
  'office_staff cannot turn ledger posting on');
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$SELECT public.set_ledger_posting('aaaaaaaa-0000-0000-0000-000000000000', true)$s$) = '42501',
  'another company''s admin cannot turn it on for A');
SELECT test_act_as(NULL);
SELECT test_assert(
  test_sqlstate($s$SELECT public.set_ledger_posting('aaaaaaaa-0000-0000-0000-000000000000', true)$s$) = '42501',
  'anon cannot call set_ledger_posting at all');
SELECT test_assert(
  test_sqlstate($s$SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000')$s$) = '42501',
  'anon cannot call backfill_ledger (it used to pass the NULL company check)');
COMMIT;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000')$s$) = '55000',
  'backfill refuses while posting is off, rather than filling a ledger nothing keeps up to date');
SELECT test_assert(public.set_ledger_posting('aaaaaaaa-0000-0000-0000-000000000000', true),
  'A''s admin turns ledger posting on');
-- The internals are not an API: this is the hole that let any user post into any company.
SELECT test_assert(
  test_sqlstate($s$SELECT public.post_ledger_entry('bbbbbbbb-0000-0000-0000-000000000000', 'x',
    gen_random_uuid(), 'journal_entry', CURRENT_DATE, 'x', gen_random_uuid(), gen_random_uuid(), 1)$s$) = '42501',
  'post_ledger_entry is no longer callable by a signed-in user');
SELECT test_assert(
  test_sqlstate($s$SELECT public.ledger_sync_invoice('bbbbbbbb-0000-0000-0000-000000000000', gen_random_uuid())$s$) = '42501',
  'nor are the per-source sync functions');
COMMIT;

-- ---------------------------------------------------------------------------
-- 3. Invoice: receivable, tax liability, revenue net of tax.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.invoices (id, company_id, invoice_number, status, total_amount, tax_amount, issue_date, project_id)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'INV-1', 'draft', 1080, 80,
        '2026-03-05', 'aaaaaaaa-0000-0000-0000-0000000000f1');
COMMIT;

SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-0000000000a1') = 0, 'a draft invoice posts nothing');

UPDATE public.invoices SET status = 'sent' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000a1') = 1080
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '2200', 'aaaaaaaa-0000-0000-0000-0000000000a1') = -80
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a1') = -1000,
  'sending it posts Dr receivable 1080 / Cr sales tax payable 80 / Cr revenue 1000');
SELECT test_assert(
  (SELECT entry_date FROM public.journal_entries WHERE reference_id = 'aaaaaaaa-0000-0000-0000-0000000000a1') = '2026-03-05',
  'the entry is dated on the invoice''s issue date');
SELECT test_assert(
  public.t_balance('aaaaaaaa-0000-0000-0000-000000000000', '1100') = 1080,
  'chart_of_accounts.current_balance moves with an automatic entry now');

-- Idempotent: a re-save changes nothing.
UPDATE public.invoices SET status = 'sent' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
UPDATE public.invoices SET total_amount = 1080 WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-0000000000a1') = 1,
  're-saving an unchanged invoice posts nothing new');

-- A correction reverses and re-posts; nothing is updated or deleted.
UPDATE public.invoices SET total_amount = 1296, tax_amount = 96 WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-0000000000a1') = 3
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000a1') = 1296
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a1') = -1200,
  'changing the amount adds a reversal and a new entry; the invoice nets to the new figures');
SELECT test_assert(
  (SELECT count(*) FROM public.journal_entries r
     JOIN public.journal_entries o ON o.id = r.reversed_entry_id
    WHERE r.reference_id = 'aaaaaaaa-0000-0000-0000-0000000000a1' AND r.is_reversing
      AND r.entry_date = o.entry_date) = 1,
  'the reversal points at the entry it reverses and carries its date');

UPDATE public.invoices SET status = 'void' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1';
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-0000000000a1') = 4
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000a1') = 0
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a1') = 0,
  'voiding reverses the invoice to zero and keeps every entry');

-- ---------------------------------------------------------------------------
-- 4. Retainage: withheld is earned revenue in its own receivable; the release
--    moves it to receivable without booking revenue twice.
-- ---------------------------------------------------------------------------
INSERT INTO public.invoices (id, company_id, invoice_number, status, invoice_type, total_amount, retention_amount, issue_date, project_id)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000a2', 'aaaaaaaa-0000-0000-0000-000000000000', 'INV-2', 'sent', 'progress',
        9000, 1000, '2026-03-10', 'aaaaaaaa-0000-0000-0000-0000000000f1'),
       ('aaaaaaaa-0000-0000-0000-0000000000a3', 'aaaaaaaa-0000-0000-0000-000000000000', 'INV-3', 'sent', 'retention_release',
        1000, NULL, '2026-06-30', 'aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000a2') = 9000
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1110', 'aaaaaaaa-0000-0000-0000-0000000000a2') = 1000
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a2') = -10000,
  'a progress invoice books the gross as revenue and the withheld 1000 as retainage receivable');
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000a3') = 1000
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1110', 'aaaaaaaa-0000-0000-0000-0000000000a3') = -1000
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a3') = 0,
  'a retainage release moves 1000 from retainage receivable to receivable and books no revenue');

-- ---------------------------------------------------------------------------
-- 5. Customer payment, and its deletion.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.invoice_payments (id, invoice_id, company_id, payment_amount, payment_date)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000b0', 'aaaaaaaa-0000-0000-0000-0000000000a2',
        'aaaaaaaa-0000-0000-0000-000000000000', 4500, '2026-04-01');
COMMIT;
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1010', 'aaaaaaaa-0000-0000-0000-0000000000b0') = 4500
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1100', 'aaaaaaaa-0000-0000-0000-0000000000b0') = -4500,
  'a customer payment posts Dr operating account / Cr receivable');
DELETE FROM public.invoice_payments WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000b0';
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-0000000000b0') = 2
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1010', 'aaaaaaaa-0000-0000-0000-0000000000b0') = 0,
  'deleting the payment posts a reversal instead of deleting the entry');

-- ---------------------------------------------------------------------------
-- 6. Expenses.
-- ---------------------------------------------------------------------------
INSERT INTO public.expenses (id, company_id, project_id, category_id, amount, description, expense_date, payment_method, payment_status)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000f1',
        'aaaaaaaa-0000-0000-0000-0000000000e0', 300, 'Framing crew', '2026-03-12', 'credit_card', 'paid'),
       ('aaaaaaaa-0000-0000-0000-0000000000e2', 'aaaaaaaa-0000-0000-0000-000000000000', NULL, NULL, 50, 'Office coffee',
        '2026-03-12', 'check', 'paid'),
       ('aaaaaaaa-0000-0000-0000-0000000000e3', 'aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000f1',
        NULL, 75, 'Returned', '2026-03-12', 'check', 'rejected'),
       ('aaaaaaaa-0000-0000-0000-0000000000e4', 'aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000f1',
        NULL, 120, 'Studs', '2026-03-13', 'check', 'paid');
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5200', 'aaaaaaaa-0000-0000-0000-0000000000e1') = 300
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '2100', 'aaaaaaaa-0000-0000-0000-0000000000e1') = -300,
  'a job expense categorised Subcontractor, paid by card: Dr subcontractor costs / Cr credit cards payable');
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '6920', 'aaaaaaaa-0000-0000-0000-0000000000e2') = 50
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1010', 'aaaaaaaa-0000-0000-0000-0000000000e2') = -50,
  'an overhead expense paid by check: Dr miscellaneous expense / Cr operating account');
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5100', 'aaaaaaaa-0000-0000-0000-0000000000e4') = 120,
  'an uncategorised job expense is direct materials, as US-322 costs it');
SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-0000000000e3') = 0,
  'a rejected expense posts nothing');
UPDATE public.expenses SET payment_status = 'rejected' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000e4';
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-0000000000e4') = 2
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5100', 'aaaaaaaa-0000-0000-0000-0000000000e4') = 0,
  'rejecting a posted expense reverses it');

-- ---------------------------------------------------------------------------
-- 7. Bills and bill payments.
-- ---------------------------------------------------------------------------
INSERT INTO public.bills (id, company_id, bill_number, vendor_id, bill_date, due_date, total_amount, status, project_id)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 'B-1',
        'aaaaaaaa-0000-0000-0000-0000000000d0', '2026-03-20', '2026-04-20', 0, 'open', 'aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-0000000000c1') = 0,
  'a bill with no lines yet names no expense account, so nothing is guessed');

INSERT INTO public.bill_line_items (bill_id, company_id, line_number, description, unit_price, amount, tax_amount, expense_account_id, project_id)
SELECT 'aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', n, d, amt, amt, tax,
       (SELECT id FROM public.chart_of_accounts WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND account_number = acct),
       'aaaaaaaa-0000-0000-0000-0000000000f1'
  FROM (VALUES (1, 'Lumber', 500::numeric, 40::numeric, '5100'), (2, 'Yard rent', 200::numeric, 0::numeric, '6200')) v(n, d, amt, tax, acct);

SELECT test_assert(
  (SELECT total_amount FROM public.bills WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c1') = 740
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5100', 'aaaaaaaa-0000-0000-0000-0000000000c1') = 540
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '6200', 'aaaaaaaa-0000-0000-0000-0000000000c1') = 200
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '2000', 'aaaaaaaa-0000-0000-0000-0000000000c1') = -740,
  'with its lines the bill posts each line (tax with its line) against accounts payable 740');
SELECT test_assert(
  (SELECT journal_entry_id FROM public.bills WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c1')
    = public.ledger_active_entry('aaaaaaaa-0000-0000-0000-000000000000', 'bill', 'aaaaaaaa-0000-0000-0000-0000000000c1')
  AND (SELECT journal_entry_id FROM public.bills WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c1') IS NOT NULL,
  'bills.journal_entry_id is written and points at the live entry');

INSERT INTO public.bill_payments (id, company_id, payment_number, payment_date, vendor_id, total_amount, payment_method)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-000000000000', 'BP-1', '2026-04-05',
        'aaaaaaaa-0000-0000-0000-0000000000d0', 400, 'check');
INSERT INTO public.bill_payment_applications (bill_payment_id, bill_id, company_id, amount_applied)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 400);
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '2000', 'aaaaaaaa-0000-0000-0000-0000000000c2') = 400
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '1010', 'aaaaaaaa-0000-0000-0000-0000000000c2') = -400
  AND public.t_entries('aaaaaaaa-0000-0000-0000-0000000000c2') = 1,
  'a bill payment posts Dr accounts payable / Cr operating account, once, applications included');
SELECT test_assert(
  (SELECT journal_entry_id FROM public.bill_payments WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c2') IS NOT NULL
  AND (SELECT status FROM public.bills WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c1') <> 'open',
  'bill_payments.journal_entry_id is written, and update_bill_status has moved the bill off open');
SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-0000000000c1') = 1,
  'the bill still has exactly one entry after that status change re-fired its trigger');

-- A bill line pointing into another tenant's chart is never written through.
INSERT INTO public.bills (id, company_id, bill_number, vendor_id, bill_date, due_date, total_amount, status)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000c3', 'aaaaaaaa-0000-0000-0000-000000000000', 'B-2',
        'aaaaaaaa-0000-0000-0000-0000000000d0', '2026-03-21', '2026-04-21', 0, 'open');
INSERT INTO public.bill_line_items (bill_id, company_id, line_number, description, unit_price, amount, expense_account_id)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000c3', 'aaaaaaaa-0000-0000-0000-000000000000', 1, 'Sneaky', 99, 99,
        (SELECT id FROM public.chart_of_accounts WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' AND account_number = '5100'));
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-0000000000c3') = 0
  AND (SELECT count(*) FROM public.journal_entry_lines l JOIN public.chart_of_accounts a ON a.id = l.account_id
        WHERE a.company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0
  AND public.t_balance('bbbbbbbb-0000-0000-0000-000000000000', '5100') = 0,
  'a bill line naming company B''s account posts nothing and leaves B''s chart untouched');

-- ---------------------------------------------------------------------------
-- 8. Approved labour.
-- ---------------------------------------------------------------------------
INSERT INTO public.time_entries (id, project_id, company_id, cost_code_id, start_time, approval_status)
VALUES ('aaaaaaaa-0000-0000-0000-000000000071', 'aaaaaaaa-0000-0000-0000-0000000000f1', NULL,
        'aaaaaaaa-0000-0000-0000-0000000000c0', '2026-03-18 07:00+00', 'pending');
SELECT test_assert(public.t_entries('aaaaaaaa-0000-0000-0000-000000000071') = 0, 'unapproved time posts nothing');
UPDATE public.time_entries SET approval_status = 'approved', labor_cost = 250.50
 WHERE id = 'aaaaaaaa-0000-0000-0000-000000000071';
SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5000', 'aaaaaaaa-0000-0000-0000-000000000071') = 250.50
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '2300', 'aaaaaaaa-0000-0000-0000-000000000071') = -250.50,
  'approval posts the frozen labor cost: Dr direct labor / Cr accrued wages (company taken from the project)');
UPDATE public.time_entries SET approval_status = 'rejected' WHERE id = 'aaaaaaaa-0000-0000-0000-000000000071';
SELECT test_assert(
  public.t_entries('aaaaaaaa-0000-0000-0000-000000000071') = 2
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '5000', 'aaaaaaaa-0000-0000-0000-000000000071') = 0,
  'withdrawing the approval reverses it');

-- ---------------------------------------------------------------------------
-- 9. Closed periods stay closed.
-- ---------------------------------------------------------------------------
INSERT INTO public.fiscal_years (id, company_id, year_number, start_date, end_date)
VALUES ('aaaaaaaa-0000-0000-0000-000000000f26', 'aaaaaaaa-0000-0000-0000-000000000000', 2026, '2026-01-01', '2026-12-31');
INSERT INTO public.fiscal_periods (fiscal_year_id, company_id, period_number, period_name, start_date, end_date, is_closed)
VALUES ('aaaaaaaa-0000-0000-0000-000000000f26', 'aaaaaaaa-0000-0000-0000-000000000000', 3, 'March', '2026-03-01', '2026-03-31', true);
UPDATE public.expenses SET amount = 60 WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000e2';
SELECT test_assert(
  (SELECT count(*) FROM public.journal_entries
    WHERE reference_id = 'aaaaaaaa-0000-0000-0000-0000000000e2' AND entry_date = GREATEST(CURRENT_DATE, '2026-03-12'::date)) = 2
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '6920', 'aaaaaaaa-0000-0000-0000-0000000000e2') = 60,
  'a correction to a document in a closed March lands today, not in March');

-- ---------------------------------------------------------------------------
-- 10. Every entry balances, and so does the company's ledger.
-- ---------------------------------------------------------------------------
SELECT test_assert(
  NOT EXISTS (
    SELECT 1 FROM public.journal_entry_lines l
     GROUP BY l.journal_entry_id
    HAVING sum(l.debit_amount) <> sum(l.credit_amount)),
  'debits equal credits on every entry posted');
SELECT test_assert(
  (SELECT sum(debit_amount) - sum(credit_amount) FROM public.journal_entry_lines
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 0
  AND (SELECT sum(debits) - sum(credits) FROM public.ledger_account_activity
        WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 0,
  'company A''s trial balance, read through ledger_account_activity, is in balance');
SELECT test_assert(
  NOT EXISTS (
    SELECT 1 FROM public.chart_of_accounts a
     WHERE a.company_id = 'aaaaaaaa-0000-0000-0000-000000000000'
       AND a.current_balance <> COALESCE((
         SELECT sum(CASE WHEN a.normal_balance = 'credit' THEN l.credit_amount - l.debit_amount
                         ELSE l.debit_amount - l.credit_amount END)
           FROM public.journal_entry_lines l JOIN public.journal_entries e ON e.id = l.journal_entry_id
          WHERE l.account_id = a.id AND e.transaction_status = 'posted'), 0)),
  'every account''s current_balance equals its posted lines');

-- ---------------------------------------------------------------------------
-- 11. Backfill: posts history once, then nothing.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000', '2026-01-01')$s$) = '42501',
  'another company''s admin cannot backfill A');
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000b1');
SELECT test_assert(
  test_sqlstate($s$SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000', '2026-01-01')$s$) = '42501',
  'office_staff cannot backfill');
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
CREATE TEMP TABLE first_run ON COMMIT DROP AS
  SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000', '2026-01-01');
SELECT test_assert(
  (SELECT posted FROM first_run WHERE source = 'invoices') = 1
  AND (SELECT posted FROM first_run WHERE source = 'expenses') = 1
  AND (SELECT sum(posted) FROM first_run) = 2,
  'the first backfill (as accounting) posts exactly the invoice and expense recorded while posting was off');
SELECT test_assert(
  (SELECT skipped FROM first_run WHERE source = 'bills') = 1,
  'and reports the bill it could not post (the cross-tenant line) as skipped');
CREATE TEMP TABLE second_run ON COMMIT DROP AS
  SELECT * FROM public.backfill_ledger('aaaaaaaa-0000-0000-0000-000000000000', '2026-01-01');
SELECT test_assert((SELECT sum(posted) FROM second_run) = 0, 'a second backfill posts nothing');
COMMIT;

SELECT test_assert(
  public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '4000', 'aaaaaaaa-0000-0000-0000-0000000000a0') = -400
  AND public.t_entries('aaaaaaaa-0000-0000-0000-0000000000a0') = 1
  AND public.t_net('aaaaaaaa-0000-0000-0000-000000000000', '6920', 'aaaaaaaa-0000-0000-0000-0000000000e9') = 40,
  'the backfilled invoice and expense are posted by the same rules, once each');

-- ---------------------------------------------------------------------------
-- 12. Tenant isolation on read.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT count(*) FROM public.journal_entries) = 0
  AND (SELECT count(*) FROM public.journal_entry_lines) = 0
  AND (SELECT count(*) FROM public.ledger_account_activity) = 0,
  'company B sees none of A''s entries, lines or ledger activity');
COMMIT;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT count(*) FROM public.ledger_account_activity) > 0
  AND (SELECT count(DISTINCT company_id) FROM public.ledger_account_activity) = 1,
  'company A reads its own ledger activity and only its own');
COMMIT;
