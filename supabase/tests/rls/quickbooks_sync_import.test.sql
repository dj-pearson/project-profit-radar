-- US-333: QuickBooks purchases and payments land in expenses / invoice_payments,
-- idempotently on the QuickBooks id, company-scoped, and reach job_costs.
--
-- Loads the real migrations for the review queue, the qb_*_id indexes and the
-- US-322 job-cost trigger, over shims of the tables they touch. Proves:
--   1. why the sync no longer upserts: ON CONFLICT (company_id, qb_purchase_id)
--      cannot use the partial unique index and fails with 42P10;
--   2. the write path the sync uses instead is idempotent and company-scoped;
--   3. an imported purchase reaches job_costs only because the sync sets
--      approved_at;
--   4. the two finance views leaked across companies until
--      20260924100000_finance_views_security_invoker.sql.

-- ---------------------------------------------------------------------------
-- Shims: only the columns the migrations and triggers reference.
-- ---------------------------------------------------------------------------
CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, name text);
CREATE TABLE public.cost_codes (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, code text, name text, category text);
CREATE TABLE public.job_costs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), project_id uuid, company_id uuid, cost_code_id uuid,
  date date, description text, labor_cost numeric, material_cost numeric, equipment_cost numeric,
  other_cost numeric, total_cost numeric, source_type text, source_id uuid, created_by uuid
);
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, project_id uuid, received_at timestamptz,
  status text, po_number text, po_date date, approved_by uuid
);
CREATE TABLE public.purchase_order_line_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), purchase_order_id uuid, cost_code_id uuid,
  total_price numeric, description text
);
CREATE TABLE public.bills (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), status text);
CREATE TABLE public.bill_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), bill_id uuid);
CREATE TABLE public.subcontractor_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, project_id uuid, status text,
  amount numeric, net_amount numeric, trade text, paid_date date, invoice_date date, subcontractor_name text
);
CREATE TABLE public.quickbooks_expenses (id uuid PRIMARY KEY DEFAULT gen_random_uuid());
CREATE TABLE public.quickbooks_payments (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

-- expenses and invoice_payments as their creating migrations define them.
CREATE TABLE public.expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL, project_id uuid, category_id uuid, cost_code_id uuid,
  amount numeric NOT NULL, description text NOT NULL, expense_date date NOT NULL DEFAULT CURRENT_DATE,
  vendor_name text, vendor_contact text, receipt_file_path text,
  payment_method text DEFAULT 'credit_card', payment_status text DEFAULT 'pending',
  is_billable boolean DEFAULT false, tax_amount numeric DEFAULT 0,
  approved_by uuid, approved_at timestamptz, created_by uuid,
  created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_expenses ON public.expenses FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, invoice_number text,
  total_amount numeric NOT NULL DEFAULT 0, amount_due numeric NOT NULL DEFAULT 0, qb_invoice_id text
);
CREATE TABLE public.invoice_payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id uuid NOT NULL REFERENCES public.invoices(id), company_id uuid NOT NULL,
  payment_amount numeric NOT NULL, payment_date date NOT NULL, payment_method text NOT NULL,
  reference_number text, notes text, processed_by uuid, stripe_payment_intent_id text
);
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_payments ON public.invoice_payments FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()))
  WITH CHECK (company_id = public.get_user_company(auth.uid()));

-- The ledger tables ledger_account_activity reads, with the company policy
-- 20250707000000_enterprise_finance_module.sql gives them, and the view as
-- 20260903250000_ledger_posting.sql defines it (trimmed to what it selects).
CREATE TABLE public.chart_of_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, account_number text, account_name text,
  account_type text, account_subtype text, normal_balance text
);
CREATE TABLE public.journal_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, entry_date date, transaction_status text
);
CREATE TABLE public.journal_entry_lines (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, journal_entry_id uuid, account_id uuid,
  project_id uuid, debit_amount numeric, credit_amount numeric
);
ALTER TABLE public.chart_of_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.journal_entry_lines ENABLE ROW LEVEL SECURITY;
CREATE POLICY coa_company ON public.chart_of_accounts FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY je_company ON public.journal_entries FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));
CREATE POLICY jel_company ON public.journal_entry_lines FOR ALL
  USING (company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid()));
CREATE VIEW public.ledger_account_activity AS
SELECT l.company_id, l.account_id, a.account_number, a.account_name, e.entry_date,
       SUM(COALESCE(l.debit_amount, 0) - COALESCE(l.credit_amount, 0)) AS net_change
FROM public.journal_entry_lines l
JOIN public.journal_entries e ON e.id = l.journal_entry_id
JOIN public.chart_of_accounts a ON a.id = l.account_id
WHERE e.transaction_status = 'posted'
GROUP BY l.company_id, l.account_id, a.account_number, a.account_name, e.entry_date;
GRANT SELECT ON public.ledger_account_activity TO authenticated;

\i supabase/migrations/20260903050000_cost_posting_all_sources.sql
\i supabase/migrations/20260903230000_quickbooks_review_queue.sql
\i supabase/migrations/20260903240000_quickbooks_review_indexes.sql

-- The SQLSTATE a statement raises, or NULL when it succeeds.
CREATE FUNCTION public.test_sqlstate(stmt text) RETURNS text LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN NULL;
EXCEPTION WHEN OTHERS THEN
  RETURN SQLSTATE;
END $$;

-- ---------------------------------------------------------------------------
-- Fixtures: company A (admin, office_staff), company B (admin).
-- ---------------------------------------------------------------------------
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000b1'),
  ('bbbbbbbb-0000-0000-0000-00000000000a');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');
INSERT INTO public.projects (id, company_id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'Maple St');
INSERT INTO public.cost_codes (id, company_id, code, name) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', '06-100', 'Rough Carpentry');
INSERT INTO public.invoices (id, company_id, invoice_number, total_amount, amount_due, qb_invoice_id) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 'INV-1', 500, 500, '42');

-- ---------------------------------------------------------------------------
-- 1. The upsert the sync used to send cannot work.
-- ---------------------------------------------------------------------------
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.expenses (company_id, amount, description, qb_purchase_id)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 1, 'x', 'qb-p-0')
    ON CONFLICT (company_id, qb_purchase_id) DO UPDATE SET amount = EXCLUDED.amount
  $s$) = '42P10',
  'upsert(onConflict: company_id,qb_purchase_id) fails 42P10 against the partial unique index');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.invoice_payments (invoice_id, company_id, payment_amount, payment_date, payment_method, qb_payment_id)
    VALUES ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 1, '2026-09-01', 'x', 'qb-pay-0')
    ON CONFLICT (company_id, qb_payment_id) DO UPDATE SET payment_amount = EXCLUDED.payment_amount
  $s$) = '42P10',
  'upsert(onConflict: company_id,qb_payment_id) fails 42P10 the same way');

-- ---------------------------------------------------------------------------
-- 2 and 3. The write path the sync uses now, as company A's admin.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');

INSERT INTO public.expenses (company_id, project_id, cost_code_id, vendor_name, amount, expense_date,
  description, payment_method, payment_status, is_billable, qb_purchase_id, created_by, approved_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000f1',
  'aaaaaaaa-0000-0000-0000-0000000000c1', 'Ace Lumber', 100, '2026-09-01', 'Lumber', 'credit_card',
  'paid', false, 'qb-p-1', 'aaaaaaaa-0000-0000-0000-00000000000a', now());

-- What an import without approved_at did: a row in the list, nothing in job costing.
INSERT INTO public.expenses (company_id, project_id, cost_code_id, amount, description, qb_purchase_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000f1',
  'aaaaaaaa-0000-0000-0000-0000000000c1', 70, 'Unapproved', 'qb-p-2');
RESET ROLE;

SELECT test_assert(
  (SELECT count(*) FROM public.job_costs j JOIN public.expenses e ON e.id = j.source_id
    WHERE e.qb_purchase_id = 'qb-p-1' AND j.source_type = 'expense' AND j.total_cost = 100
      AND j.company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1,
  'an imported purchase with approved_at set posts one job_costs row on its project');
SELECT test_assert(
  (SELECT count(*) FROM public.job_costs j JOIN public.expenses e ON e.id = j.source_id
    WHERE e.qb_purchase_id = 'qb-p-2') = 0,
  'without approved_at the same import never reaches job_costs (why the sync sets it)');

SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.expenses (company_id, amount, description, qb_purchase_id)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 100, 'dupe', 'qb-p-1')
  $s$) = '23505',
  'the same QuickBooks purchase cannot be imported twice into one company');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.expenses (company_id, amount, description)
    VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 5, 'hand-keyed 1'),
           ('aaaaaaaa-0000-0000-0000-000000000000', 6, 'hand-keyed 2')
  $s$) IS NULL,
  'hand-keyed expenses (no QuickBooks id) are unaffected by the index');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.expenses (company_id, amount, description, qb_purchase_id)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 1, 'into B', 'qb-p-9')
  $s$) = '42501',
  'company A''s sync cannot write an expense into company B');

-- A re-run with a corrected amount updates the row; the trigger reposts it.
UPDATE public.expenses SET amount = 150
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND qb_purchase_id = 'qb-p-1';
RESET ROLE;
SELECT test_assert(
  (SELECT array_agg(j.total_cost) FROM public.job_costs j JOIN public.expenses e ON e.id = j.source_id
    WHERE e.qb_purchase_id = 'qb-p-1') = ARRAY[150::numeric],
  'updating an imported amount leaves exactly one job_costs row, at the new amount');

-- Payment path.
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.invoice_payments (invoice_id, company_id, payment_amount, payment_date, payment_method,
  qb_payment_id, processed_by)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 500, '2026-09-02',
  'quickbooks', 'qb-pay-1', 'aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.invoice_payments (invoice_id, company_id, payment_amount, payment_date, payment_method, qb_payment_id)
    VALUES ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 500, '2026-09-02', 'x', 'qb-pay-1')
  $s$) = '23505',
  'the same QuickBooks payment cannot be recorded twice against a company''s invoices');
RESET ROLE;
COMMIT;

-- The same QuickBooks ids in another company are a different record.
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_sqlstate($s$
    INSERT INTO public.expenses (company_id, amount, description, qb_purchase_id)
    VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 100, 'B''s own', 'qb-p-1')
  $s$) IS NULL,
  'QuickBooks ids are per company: B can import its own purchase qb-p-1');
SELECT test_assert(
  (SELECT count(*) FROM public.expenses WHERE qb_purchase_id = 'qb-p-1') = 1,
  'B''s lookup of imported ids sees only its own row, never A''s');
RESET ROLE;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- The review queue, as the sync writes and resolves it.
-- ---------------------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.quickbooks_sync_review (company_id, entity, qb_id, reason, amount)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'purchase', 'qb-p-3', 'No project', 40)
ON CONFLICT (company_id, entity, qb_id) DO UPDATE SET reason = EXCLUDED.reason, last_seen_at = now();
INSERT INTO public.quickbooks_sync_review (company_id, entity, qb_id, reason, amount)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'purchase', 'qb-p-3', 'No project (again)', 40)
ON CONFLICT (company_id, entity, qb_id) DO UPDATE SET reason = EXCLUDED.reason, last_seen_at = now();
INSERT INTO public.quickbooks_sync_review (company_id, entity, qb_id, reason, amount)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'payment', 'qb-pay-2', 'Pays 2 invoices', 900)
ON CONFLICT (company_id, entity, qb_id) DO UPDATE SET reason = EXCLUDED.reason, last_seen_at = now();
SELECT test_assert(
  (SELECT count(*) FROM public.quickbooks_sync_review WHERE qb_id = 'qb-p-3') = 1,
  'a re-run keeps one queue row per QuickBooks record (the onConflict the sync sends works here)');
UPDATE public.quickbooks_sync_review
   SET status = 'resolved', resolved_by = 'aaaaaaaa-0000-0000-0000-00000000000a', resolved_at = now()
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND entity = 'payment'
   AND qb_id = 'qb-pay-2' AND status = 'pending';
SELECT test_assert(
  (SELECT status FROM public.quickbooks_sync_review WHERE qb_id = 'qb-pay-2') = 'resolved',
  'the sync''s resolve update closes a queue row under the queue''s own policy');
RESET ROLE;
COMMIT;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.quickbooks_sync_review) = 0,
  'office_staff cannot read the queue');
RESET ROLE;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM public.quickbooks_sync_review) = 0,
  'company B cannot read company A''s queue');
RESET ROLE;
ROLLBACK;

-- ---------------------------------------------------------------------------
-- 4. The two views, before and after 20260924100000.
-- ---------------------------------------------------------------------------
INSERT INTO public.chart_of_accounts (id, company_id, account_number, account_name, account_type, normal_balance)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', '4000', 'Revenue', 'revenue', 'credit');
INSERT INTO public.journal_entries (id, company_id, entry_date, transaction_status)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000d1', 'aaaaaaaa-0000-0000-0000-000000000000', '2026-09-01', 'posted');
INSERT INTO public.journal_entry_lines (company_id, journal_entry_id, account_id, credit_amount)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000d1',
        'aaaaaaaa-0000-0000-0000-0000000000a1', 12500);

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT sum(pending_amount) FROM public.quickbooks_sync_health
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 40,
  'BEFORE: company B reads company A''s pending QuickBooks amounts through quickbooks_sync_health');
SELECT test_assert(
  (SELECT count(*) FROM public.ledger_account_activity
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1,
  'BEFORE: company B reads company A''s ledger through ledger_account_activity');
RESET ROLE;
ROLLBACK;

\i supabase/migrations/20260924100000_finance_views_security_invoker.sql
-- Applying it twice is harmless.
\i supabase/migrations/20260924100000_finance_views_security_invoker.sql

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM public.quickbooks_sync_health) = 0,
  'AFTER: company B sees no other company''s queue counts');
SELECT test_assert((SELECT count(*) FROM public.ledger_account_activity) = 0,
  'AFTER: company B sees no other company''s ledger');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT pending FROM public.quickbooks_sync_health
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND entity = 'purchase') = 1
  AND (SELECT resolved FROM public.quickbooks_sync_health
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND entity = 'payment') = 1,
  'AFTER: company A''s admin still sees its own per-entity counts');
SELECT test_assert(
  (SELECT net_change FROM public.ledger_account_activity
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = -12500,
  'AFTER: company A still reads its own ledger the way useLedgerActivity asks for it');
RESET ROLE;
ROLLBACK;
