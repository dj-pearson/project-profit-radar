-- US-332: per-company document numbering.
--
-- Builds the tables the two numbering migrations touch with the columns they
-- read, applies 20260903210000 (the counter) and 20260923190000 (the caller
-- check, forward-only counter, per-company uniqueness, change-order and PO
-- triggers), then proves:
--   - a company only reads, sets and consumes its own counter;
--   - the counter cannot be rewound;
--   - two companies can use the same prefix;
--   - unconfigured companies keep the global sequence;
--   - 8 concurrent sessions creating 200 invoices get 1..200, no duplicate, no gap.

-- Live shapes, reduced to what the migrations and assertions touch.
-- 20250703173410:5 (invoice_number UNIQUE across the table), :105 generator
CREATE SEQUENCE public.invoice_number_seq;
CREATE SEQUENCE public.estimate_number_seq;
CREATE SEQUENCE public.po_number_seq;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;

CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  invoice_number text NOT NULL UNIQUE,
  total_amount numeric DEFAULT 0
);
CREATE TABLE public.estimates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  estimate_number text NOT NULL,
  UNIQUE (company_id, estimate_number)
);
-- 20250115000004:121-123 (po_number UNIQUE across the table)
CREATE TABLE public.purchase_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  po_number text UNIQUE NOT NULL
);
CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, name text);
-- 20250702225057:80-97 plus company_id
CREATE TABLE public.change_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  company_id uuid,
  change_order_number text NOT NULL,
  title text NOT NULL,
  amount numeric NOT NULL DEFAULT 0,
  UNIQUE (project_id, change_order_number)
);
CREATE TABLE public.invoice_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), invoice_id uuid);
CREATE TABLE public.estimate_line_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), estimate_id uuid);
CREATE TABLE public.company_settings (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid UNIQUE);
CREATE TABLE public.company_admin_settings (company_id uuid, billing_settings jsonb);

DO $$
DECLARE t text;
BEGIN
  FOREACH t IN ARRAY ARRAY['invoices','estimates','purchase_orders','projects'] LOOP
    EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('CREATE POLICY company_rows ON public.%I FOR ALL TO authenticated
      USING (company_id = public.get_user_company(auth.uid()))
      WITH CHECK (company_id = public.get_user_company(auth.uid()))', t);
  END LOOP;
END $$;
-- 20250702225057:180-186: change orders are scoped through their project.
ALTER TABLE public.change_orders ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_change_orders ON public.change_orders FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
                  AND p.company_id = public.get_user_company(auth.uid())))
  WITH CHECK (EXISTS (SELECT 1 FROM public.projects p WHERE p.id = project_id
                  AND p.company_id = public.get_user_company(auth.uid())));

CREATE FUNCTION public.generate_invoice_number() RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'INV-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.invoice_number_seq')::text, 4, '0'); END $$;
CREATE FUNCTION public.generate_estimate_number() RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'EST-' || lpad(nextval('public.estimate_number_seq')::text, 4, '0'); END $$;
CREATE FUNCTION public.generate_po_number(company_uuid uuid) RETURNS text LANGUAGE plpgsql AS $$
BEGIN RETURN 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-' || lpad(nextval('public.po_number_seq')::text, 4, '0'); END $$;
CREATE FUNCTION public.set_po_number() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

\i supabase/migrations/20260903210000_company_billing_settings.sql

-- The triggers the first migration redefines, attached as production has them.
CREATE TRIGGER set_invoice_number_trigger BEFORE INSERT ON public.invoices
  FOR EACH ROW EXECUTE FUNCTION public.set_invoice_number();
CREATE TRIGGER set_estimate_number_trigger BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_estimate_number();
CREATE TRIGGER set_po_number_trigger BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_po_number();

\i supabase/migrations/20260923190000_billing_numbering_and_line_tax.sql
\i supabase/migrations/20260923190001_per_company_document_number_indexes.sql
\i supabase/migrations/20260923190002_drop_table_wide_document_number_uniques.sql

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000e1'),
  ('bbbbbbbb-0000-0000-0000-00000000000b'), ('cccccccc-0000-0000-0000-00000000000c');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B'),
  ('cccccccc-0000-0000-0000-000000000000', 'C');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 'project_manager'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('cccccccc-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-000000000000', 'admin');

-- Both A and B choose the same invoice prefix. C configures nothing.
INSERT INTO public.document_number_settings (company_id, doc_type, prefix, include_year, pad_width, next_number) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'invoice', 'INV-', false, 4, 1),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'invoice', 'INV-', false, 4, 1),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'change_order', 'CO-', false, 3, 1),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'purchase_order', 'PO-A-', false, 3, 7);

-- --- Tenant isolation ------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT count(*) FROM public.document_number_settings WHERE company_id <> 'aaaaaaaa-0000-0000-0000-000000000000') = 0,
  'a company reads only its own numbering');
UPDATE public.document_number_settings SET prefix = 'X-' WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000';
RESET ROLE;
SELECT test_assert(
  (SELECT prefix FROM public.document_number_settings
    WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' AND doc_type = 'invoice') = 'INV-',
  'a company cannot change another company''s numbering');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
DO $$
BEGIN
  PERFORM public.next_document_number('bbbbbbbb-0000-0000-0000-000000000000', 'invoice');
  RAISE EXCEPTION 'ASSERTION FAILED: took a number from another company';
EXCEPTION WHEN insufficient_privilege THEN
  RAISE NOTICE 'ok - next_document_number refuses another company''s id';
END $$;
RESET ROLE;
SELECT test_assert(
  (SELECT next_number FROM public.document_number_settings
    WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' AND doc_type = 'invoice') = 1,
  'the refused call left the other company''s counter untouched');
ROLLBACK;

-- An estimator-level role reads the counter but cannot set it.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000e1');
UPDATE public.document_number_settings SET next_number = 500
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND doc_type = 'invoice';
RESET ROLE;
SELECT test_assert(
  (SELECT next_number FROM public.document_number_settings
    WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND doc_type = 'invoice') = 1,
  'a project manager cannot move the counter');
ROLLBACK;

-- --- Forward only ------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
UPDATE public.document_number_settings SET next_number = 40
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND doc_type = 'invoice';
DO $$
BEGIN
  UPDATE public.document_number_settings SET next_number = 39
   WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND doc_type = 'invoice';
  RAISE EXCEPTION 'ASSERTION FAILED: rewound the counter';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'ok - an admin can skip the counter forward but not rewind it';
END $$;
ROLLBACK;

-- --- Same prefix, two companies; fallbacks ----------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO public.invoices (company_id, invoice_number) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '');
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO public.invoices (company_id, invoice_number) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', '');
SELECT test_act_as('cccccccc-0000-0000-0000-00000000000c');
INSERT INTO public.invoices (company_id, invoice_number) VALUES ('cccccccc-0000-0000-0000-000000000000', '');
INSERT INTO public.estimates (company_id, estimate_number) VALUES ('cccccccc-0000-0000-0000-000000000000', '');
RESET ROLE;
SELECT test_assert(
  (SELECT array_agg(invoice_number ORDER BY company_id) FROM public.invoices
    WHERE company_id IN ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-000000000000'))
    = ARRAY['INV-0001', 'INV-0001'],
  'two companies with the same prefix both get INV-0001 (unique per company, not per table)');
SELECT test_assert(
  (SELECT invoice_number FROM public.invoices WHERE company_id = 'cccccccc-0000-0000-0000-000000000000')
    = 'INV-' || to_char(CURRENT_DATE, 'YYYY') || '-0001'
  AND (SELECT estimate_number FROM public.estimates WHERE company_id = 'cccccccc-0000-0000-0000-000000000000') = 'EST-0001',
  'a company without numbering keeps the global sequence');
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
DO $$
BEGIN
  INSERT INTO public.invoices (company_id, invoice_number) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'INV-0001');
  RAISE EXCEPTION 'ASSERTION FAILED: duplicate number within one company';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'ok - a number is still unique within its company';
END $$;
ROLLBACK;

-- --- Change orders and purchase orders --------------------------------------
BEGIN;
INSERT INTO public.projects (id, company_id, name) VALUES
  ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'Maple St'),
  ('cccccccc-1111-0000-0000-000000000000', 'cccccccc-0000-0000-0000-000000000000', 'Oak Ave');
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
-- The edge function sends a project-local number and no company_id.
INSERT INTO public.change_orders (project_id, change_order_number, title)
VALUES ('aaaaaaaa-1111-0000-0000-000000000000', 'CO-001', 'Extra outlet');
INSERT INTO public.change_orders (project_id, company_id, change_order_number, title)
VALUES ('aaaaaaaa-1111-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-000000000000', 'CO-17290000', 'Tile upgrade');
INSERT INTO public.purchase_orders (company_id, po_number) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '');
SELECT test_act_as('cccccccc-0000-0000-0000-00000000000c');
INSERT INTO public.change_orders (project_id, change_order_number, title)
VALUES ('cccccccc-1111-0000-0000-000000000000', 'CO-001', 'Unconfigured');
INSERT INTO public.purchase_orders (company_id, po_number) VALUES ('cccccccc-0000-0000-0000-000000000000', '');
RESET ROLE;
SELECT test_assert(
  (SELECT array_agg(change_order_number ORDER BY change_order_number) FROM public.change_orders
    WHERE project_id = 'aaaaaaaa-1111-0000-0000-000000000000') = ARRAY['CO-001', 'CO-002'],
  'change orders take the company counter, company found through the project when not sent');
SELECT test_assert(
  (SELECT change_order_number FROM public.change_orders WHERE project_id = 'cccccccc-1111-0000-0000-000000000000') = 'CO-001',
  'an unconfigured company keeps the change order number it sent');
SELECT test_assert(
  (SELECT po_number FROM public.purchase_orders WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 'PO-A-007'
  AND (SELECT po_number FROM public.purchase_orders WHERE company_id = 'cccccccc-0000-0000-0000-000000000000')
      = 'PO-' || to_char(CURRENT_DATE, 'YYYY') || '-0001',
  'purchase orders take the company counter, or the old sequence when unconfigured');
ROLLBACK;

-- --- Race: 8 sessions, 25 invoices each, all at once -------------------------
CREATE EXTENSION IF NOT EXISTS dblink;
DO $race$
DECLARE
  conn text := format('host=%s dbname=%s user=postgres',
    split_part(current_setting('unix_socket_directories'), ',', 1), current_database());
  i int;
BEGIN
  FOR i IN 1..8 LOOP
    PERFORM dblink_connect('w' || i, conn);
    -- Each session is the company admin, the way PostgREST would run it.
    PERFORM dblink_exec('w' || i,
      $s$SET request.jwt.claim.sub = 'aaaaaaaa-0000-0000-0000-00000000000a'$s$);
    PERFORM dblink_exec('w' || i, 'SET ROLE authenticated');
  END LOOP;
  FOR i IN 1..8 LOOP
    PERFORM dblink_send_query('w' || i, $s$
      DO $b$ BEGIN
        FOR n IN 1..25 LOOP
          INSERT INTO public.invoices (company_id, invoice_number)
          VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '');
          PERFORM pg_sleep(random() / 500);
        END LOOP;
      END $b$
    $s$);
  END LOOP;
  FOR i IN 1..8 LOOP
    PERFORM * FROM dblink_get_result('w' || i) AS r(status text);
    PERFORM * FROM dblink_get_result('w' || i) AS r(status text);
    PERFORM dblink_disconnect('w' || i);
  END LOOP;
END $race$;

SELECT test_assert(
  (SELECT count(*) FROM public.invoices WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 200
  AND (SELECT count(DISTINCT invoice_number) FROM public.invoices WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 200
  AND (SELECT array_agg(invoice_number ORDER BY invoice_number) FROM public.invoices
        WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000')
      = (SELECT array_agg('INV-' || lpad(n::text, 4, '0') ORDER BY n) FROM generate_series(1, 200) n)
  AND (SELECT next_number FROM public.document_number_settings
        WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000' AND doc_type = 'invoice') = 201,
  '8 concurrent sessions creating 200 invoices get INV-0001..INV-0200: no duplicate, no gap');
SELECT test_assert(
  (SELECT next_number FROM public.document_number_settings
    WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' AND doc_type = 'invoice') = 1,
  'the race left the other company''s counter where it was');
