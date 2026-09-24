-- US-330: materials and equipment on a daily report are rows, written by the
-- roles that file reports, in their own company only. site_id and company_id
-- are filled for writers that leave them out.

-- Shapes as the earlier migrations leave them: site_id NOT NULL with no
-- default on daily_reports and the *_items tables (20251128000002,
-- 20251130000001), and the old site-isolation policies still in place.
CREATE TABLE public.sites (id uuid PRIMARY KEY);
CREATE TABLE public.projects (
  id uuid PRIMARY KEY,
  company_id uuid REFERENCES public.companies(id),
  site_id uuid REFERENCES public.sites(id)
);
CREATE TABLE public.daily_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id),
  company_id uuid,
  created_by uuid,
  site_id uuid NOT NULL REFERENCES public.sites(id),
  date date DEFAULT current_date,
  materials_delivered text
);
CREATE TABLE public.daily_report_material_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  material_name text NOT NULL,
  quantity double precision,
  unit text,
  site_id uuid NOT NULL REFERENCES public.sites(id)
);
CREATE TABLE public.daily_report_equipment_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  equipment_name text NOT NULL,
  hours_used double precision,
  site_id uuid NOT NULL REFERENCES public.sites(id)
);
-- No site_id here: the trigger must only attach where the column exists.
CREATE TABLE public.daily_report_crew_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  daily_report_id uuid NOT NULL REFERENCES public.daily_reports(id) ON DELETE CASCADE,
  crew_member_name text NOT NULL
);
ALTER TABLE public.daily_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_material_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_equipment_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_report_crew_items ENABLE ROW LEVEL SECURITY;
GRANT ALL ON public.daily_reports, public.daily_report_material_items,
  public.daily_report_equipment_items, public.daily_report_crew_items TO authenticated;
CREATE POLICY reports_company ON public.daily_reports FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR project_id IN (
    SELECT id FROM public.projects WHERE company_id = public.get_user_company(auth.uid())))
  WITH CHECK (project_id IN (
    SELECT id FROM public.projects WHERE company_id = public.get_user_company(auth.uid())));
GRANT SELECT ON public.projects TO authenticated;

\i supabase/migrations/20260924190000_daily_report_items.sql
-- Applying twice must be harmless.
\i supabase/migrations/20260924190000_daily_report_items.sql

SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_trigger WHERE tgname = 'trg_item_site_id'
               AND tgrelid = 'public.daily_report_crew_items'::regclass),
  'no site_id trigger on a table without the column');

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000f5'), ('aaaaaaaa-0000-0000-0000-00000000000a'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1'), ('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A Build'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B Build');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000f5', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'accounting'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 'client_portal'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');
INSERT INTO public.sites VALUES ('55555555-0000-0000-0000-000000000001');
INSERT INTO public.projects VALUES
  ('aaaaaaaa-1111-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', '55555555-0000-0000-0000-000000000001'),
  ('bbbbbbbb-1111-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-000000000000', '55555555-0000-0000-0000-000000000001');

-- B's report exists, written by B.
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO daily_reports (id, project_id) VALUES
  ('bbbbbbbb-2222-0000-0000-000000000001', 'bbbbbbbb-1111-0000-0000-000000000001');
INSERT INTO daily_report_material_items (daily_report_id, material_name)
VALUES ('bbbbbbbb-2222-0000-0000-000000000001', 'B lumber');
COMMIT;
RESET ROLE;

-- A's superintendent files a report the way the web form does: no company_id,
-- no created_by, no site_id.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO daily_reports (id, project_id, materials_delivered) VALUES
  ('aaaaaaaa-2222-0000-0000-000000000001', 'aaaaaaaa-1111-0000-0000-000000000001', '20 bags concrete');
SELECT test_assert(
  (SELECT company_id FROM daily_reports WHERE id = 'aaaaaaaa-2222-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-000000000000',
  'company_id is filled from the project');
SELECT test_assert(
  (SELECT created_by FROM daily_reports WHERE id = 'aaaaaaaa-2222-0000-0000-000000000001') = 'aaaaaaaa-0000-0000-0000-0000000000f5',
  'created_by is filled from the caller');
SELECT test_assert(
  (SELECT site_id FROM daily_reports WHERE id = 'aaaaaaaa-2222-0000-0000-000000000001') = '55555555-0000-0000-0000-000000000001',
  'daily_reports.site_id is filled from the project');

INSERT INTO daily_report_material_items (daily_report_id, material_name, quantity, unit)
VALUES ('aaaaaaaa-2222-0000-0000-000000000001', 'concrete', 20, 'bags');
INSERT INTO daily_report_equipment_items (daily_report_id, equipment_name, hours_used)
VALUES ('aaaaaaaa-2222-0000-0000-000000000001', 'Excavator', 6);
INSERT INTO daily_report_crew_items (daily_report_id, crew_member_name)
VALUES ('aaaaaaaa-2222-0000-0000-000000000001', 'Dana Whitfield');
SELECT test_assert(
  (SELECT site_id FROM daily_report_material_items WHERE material_name = 'concrete') = '55555555-0000-0000-0000-000000000001',
  'item site_id is filled from the report');
SELECT test_assert((SELECT count(*) FROM daily_report_material_items) = 1, 'A sees only A material rows');
SELECT test_assert((SELECT count(*) FROM daily_report_equipment_items) = 1, 'A sees its equipment rows');

WITH u AS (UPDATE daily_report_equipment_items SET hours_used = 7 RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 1, 'A field_supervisor corrects equipment hours');
WITH u AS (UPDATE daily_report_material_items SET quantity = 0
            WHERE daily_report_id = 'bbbbbbbb-2222-0000-0000-000000000001' RETURNING 1)
SELECT test_assert((SELECT count(*) FROM u) = 0, 'A cannot touch B material rows');
ROLLBACK;
RESET ROLE;

-- A cannot write onto B's report.
CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
SELECT test_assert(pg_temp.denied($$INSERT INTO daily_report_material_items (daily_report_id, material_name)
  VALUES ('bbbbbbbb-2222-0000-0000-000000000001', 'x')$$), 'A cannot add materials to a B report');
ROLLBACK;
RESET ROLE;

-- A report A owns, for the read-only roles below.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f5');
INSERT INTO daily_reports (id, project_id) VALUES
  ('aaaaaaaa-2222-0000-0000-000000000002', 'aaaaaaaa-1111-0000-0000-000000000001');
INSERT INTO daily_report_material_items (daily_report_id, material_name)
VALUES ('aaaaaaaa-2222-0000-0000-000000000002', 'rebar');
COMMIT;
RESET ROLE;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM daily_report_material_items) = 1, 'A accounting reads A material rows');
SELECT test_assert(pg_temp.denied($$INSERT INTO daily_report_material_items (daily_report_id, material_name)
  VALUES ('aaaaaaaa-2222-0000-0000-000000000002', 'x')$$), 'accounting cannot add report items');
ROLLBACK;
RESET ROLE;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
SELECT test_assert((SELECT count(*) FROM daily_report_material_items) = 0, 'client_portal reads no report items');
ROLLBACK;
RESET ROLE;

-- A writer that sends site_id keeps it.
INSERT INTO public.sites VALUES ('55555555-0000-0000-0000-000000000002');
INSERT INTO daily_reports (id, project_id, site_id) VALUES
  ('aaaaaaaa-2222-0000-0000-000000000003', 'aaaaaaaa-1111-0000-0000-000000000001', '55555555-0000-0000-0000-000000000002');
SELECT test_assert(
  (SELECT site_id FROM daily_reports WHERE id = 'aaaaaaaa-2222-0000-0000-000000000003') = '55555555-0000-0000-0000-000000000002',
  'a site_id the writer sends is kept');
