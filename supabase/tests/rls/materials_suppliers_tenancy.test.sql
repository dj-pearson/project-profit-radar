-- US-343: materials, suppliers and material_suppliers are company-scoped.
--
-- Builds the three tables with the live columns the policies touch, applies the
-- policies the migrations left in place (copied verbatim, source cited on each),
-- proves the cross-tenant leak exists, applies the real fix migration, and
-- proves it is gone for SELECT, INSERT, UPDATE and DELETE while same-company
-- access is unchanged for every role.

CREATE TABLE public.user_roles (user_id uuid, role text);
CREATE TABLE public.materials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text
);
CREATE TABLE public.suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL,
  name text
);
CREATE TABLE public.material_suppliers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  name text
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_suppliers ENABLE ROW LEVEL SECURITY;
-- user_roles is read inside the old policies as the caller.
CREATE POLICY own_roles ON public.user_roles FOR SELECT USING (user_id = auth.uid());

-- 20250115000004_material_orchestration.sql:353-375
CREATE POLICY "Users can access company materials" ON materials
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY "Users can access company suppliers" ON suppliers
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()));
CREATE POLICY "Users can access material suppliers" ON material_suppliers
    FOR ALL USING (EXISTS (SELECT 1 FROM user_roles ur WHERE ur.user_id = auth.uid()));
-- 20250703175856_cd21aa7c-0886-4821-ab19-2df22a20d264.sql:84-88
CREATE POLICY "Users can view company materials" ON public.materials FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);
CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role]));
-- 20250803040323_04f04674-9818-4b4b-9c58-6b0e65297d34.sql:50-51
CREATE POLICY "material_suppliers_company_isolation" ON public.material_suppliers
    FOR ALL USING (company_id = get_user_company(auth.uid()));
-- 20250912192352_65263700-c544-45c9-b19c-edb4fec94944.sql:60-61
CREATE POLICY "Users can manage company suppliers" ON public.suppliers
FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Two companies. Every user has a user_roles row, as after the 20251006204552 backfill.
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A Build'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B Build');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor');
INSERT INTO public.user_roles SELECT id, role::text FROM public.user_profiles;
INSERT INTO public.materials (company_id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A rebar'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B lumber');
INSERT INTO public.suppliers (company_id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A supply'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B supply');
INSERT INTO public.material_suppliers (company_id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A price'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B price');

-- Before: the leak is real, so the assertions below can bite.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM materials WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 1,
  'before the fix, company A reads company B materials');
SELECT test_assert((SELECT count(*) FROM suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 1,
  'before the fix, company A reads company B suppliers');
SELECT test_assert((SELECT count(*) FROM material_suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 1,
  'before the fix, company A reads company B material_suppliers');
ROLLBACK;

\i supabase/migrations/20260923000000_scope_materials_suppliers_rls.sql

-- After: company A admin.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM materials WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0, 'A reads zero B materials');
SELECT test_assert((SELECT count(*) FROM suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0, 'A reads zero B suppliers');
SELECT test_assert((SELECT count(*) FROM material_suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0, 'A reads zero B material_suppliers');
SELECT test_assert((SELECT count(*) FROM materials) = 1, 'A still reads its own materials');
SELECT test_assert((SELECT count(*) FROM suppliers) = 1, 'A still reads its own suppliers');
SELECT test_assert((SELECT count(*) FROM material_suppliers) = 1, 'A still reads its own material_suppliers');

WITH u AS (UPDATE materials SET name = 'x' WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'A cannot update B materials');
WITH u AS (UPDATE suppliers SET name = 'x' WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'A cannot update B suppliers');
WITH u AS (UPDATE material_suppliers SET name = 'x' WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'A cannot update B material_suppliers');
WITH d AS (DELETE FROM materials WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B materials');
WITH d AS (DELETE FROM suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B suppliers');
WITH d AS (DELETE FROM material_suppliers WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM d) = 0, 'A cannot delete B material_suppliers');
ROLLBACK;

-- Cross-tenant INSERTs must raise; each in its own transaction.
CREATE FUNCTION pg_temp.insert_denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(pg_temp.insert_denied($$INSERT INTO materials (company_id, name) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'planted')$$), 'A cannot insert into B materials');
SELECT test_assert(pg_temp.insert_denied($$INSERT INTO suppliers (company_id, name) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'planted')$$), 'A cannot insert into B suppliers');
SELECT test_assert(pg_temp.insert_denied($$INSERT INTO material_suppliers (company_id, name) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'planted')$$), 'A cannot insert into B material_suppliers');
ROLLBACK;

-- Same-company access unchanged for a role outside "Admins can manage materials".
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO materials (company_id, name) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'field add');
WITH u AS (UPDATE materials SET name = 'field edit' WHERE name = 'field add' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 1, 'a field_supervisor still writes materials in their own company');
SELECT test_assert((SELECT count(*) FROM materials WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 0, 'a field_supervisor reads zero B materials');
ROLLBACK;

-- Anonymous callers see nothing.
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert((SELECT count(*) FROM materials) + (SELECT count(*) FROM suppliers) + (SELECT count(*) FROM material_suppliers) = 0, 'anon reads nothing');
ROLLBACK;
