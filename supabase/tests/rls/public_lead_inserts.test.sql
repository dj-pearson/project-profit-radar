-- US-351: anonymous callers cannot insert into the lead tables directly, and
-- signed-in users can add leads only to their own company.

CREATE TABLE public.leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, contact_name text);
CREATE TABLE public.demo_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE TABLE public.sales_contact_requests (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
CREATE TABLE public.calculator_leads (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text);
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.demo_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sales_contact_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calculator_leads ENABLE ROW LEVEL SECURITY;

-- 20250202000000_lead_tracking_system.sql:348-360
CREATE POLICY "Anyone can create leads" ON leads FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can create demo requests" ON demo_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Anyone can create sales contacts" ON sales_contact_requests FOR INSERT TO anon, authenticated WITH CHECK (true);
-- 20250710000000_profitability_calculator_leads.sql:152
CREATE POLICY "Allow public to insert leads" ON calculator_leads FOR INSERT TO anon WITH CHECK (true);
-- 20250803131421:201 (company-scoped staff policy that stays)
CREATE POLICY "Staff can manage company leads" ON public.leads FOR ALL USING (
  company_id = get_user_company(auth.uid()) AND
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[]));

INSERT INTO auth.users VALUES ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO public.companies VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(NOT pg_temp.denied($$INSERT INTO leads (contact_name) VALUES ('bot')$$), 'before: anon inserts straight into leads');
ROLLBACK;

\i supabase/migrations/20260923050000_close_anonymous_lead_inserts.sql

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.denied($$INSERT INTO leads (contact_name) VALUES ('bot')$$), 'anon cannot insert into leads');
SELECT test_assert(pg_temp.denied($$INSERT INTO demo_requests (email) VALUES ('bot@x.io')$$), 'anon cannot insert into demo_requests');
SELECT test_assert(pg_temp.denied($$INSERT INTO sales_contact_requests (email) VALUES ('bot@x.io')$$), 'anon cannot insert into sales_contact_requests');
SELECT test_assert(pg_temp.denied($$INSERT INTO calculator_leads (email) VALUES ('bot@x.io')$$), 'anon cannot insert into calculator_leads');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert(NOT pg_temp.denied($$INSERT INTO leads (company_id, contact_name) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'site walk')$$),
  'a field_supervisor still adds a lead to their own company');
SELECT test_assert(pg_temp.denied($$INSERT INTO leads (company_id, contact_name) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'planted')$$),
  'a signed-in user cannot add a lead to another company');
SELECT test_assert(pg_temp.denied($$INSERT INTO demo_requests (email) VALUES ('x@y.io')$$), 'a signed-in user cannot insert demo_requests directly');
ROLLBACK;

BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO leads (contact_name) VALUES ('from capture-lead');
INSERT INTO demo_requests (email) VALUES ('from handle-demo-request');
SELECT test_assert(true, 'the service role (edge functions) still inserts');
ROLLBACK;
