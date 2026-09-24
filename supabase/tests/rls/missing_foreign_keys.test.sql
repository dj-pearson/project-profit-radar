-- US-277: 20260924200000_missing_foreign_keys.sql adds NOT VALID foreign keys
-- on company_id / project_id / client_id. This proves, against real Postgres:
--   * rows that were already orphaned do not stop the migration, and survive it;
--   * every key it adds refuses a new orphan insert (23503);
--   * each key's ON DELETE is the one the list names;
--   * missing tables, non-uuid columns and existing keys are skipped, not fatal;
--   * a rerun adds nothing;
--   * the orphan report in docs/RUNBOOK_FK_VALIDATION.md counts the orphans,
--     and VALIDATE works once they are resolved.
--
-- The list is read out of the migration itself so this test cannot drift.

\set mig `cat supabase/migrations/20260924200000_missing_foreign_keys.sql`
\set report `sed -n '/orphan-report:start/,/orphan-report:end/p' docs/RUNBOOK_FK_VALIDATION.md | grep '^[A-Z ]'`
SELECT set_config('us277.mig', :'mig', false) \g /dev/null
SELECT set_config('us277.report', :'report', false) \g /dev/null

CREATE TABLE pg_temp.listed AS
  SELECT m[1] AS tbl, m[2] AS col, m[3] AS ref, m[4] AS on_delete
    FROM regexp_matches(current_setting('us277.mig'),
      '\(''(\w+)'',\s*''(\w+)'',\s*''(\w+)'',\s*''(CASCADE|SET NULL|NO ACTION)''\)', 'g') AS m;

SELECT test_assert((SELECT count(*) FROM pg_temp.listed) = 170, 'the migration lists 170 columns');
SELECT test_assert(
  (SELECT count(*) FROM pg_temp.listed) = (SELECT count(DISTINCT (tbl, col)) FROM pg_temp.listed),
  'no column is listed twice');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed
               WHERE (col, ref) NOT IN (('company_id', 'companies'), ('project_id', 'projects'), ('client_id', 'contacts'))),
  'company_id -> companies, project_id -> projects, client_id -> contacts, nothing else');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed
               WHERE tbl IN ('audit_logs', 'payment_applications', 'retention_items', 'subcontractor_payments',
                             'collection_items', 'budget_line_items', 'budget_tracking', 'labor_costs')
                 AND on_delete = 'CASCADE'),
  'no money or audit table cascades');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed WHERE tbl = 'retention_tracking' OR (tbl, col) = ('bid_packages', 'project_id')),
  'retention_tracking (no migration creates it) and bid_packages.project_id (composite key) are left out');
SELECT test_assert(current_setting('us277.mig') !~* '\m(DELETE\s+FROM|UPDATE\s+public\.|TRUNCATE)\M',
  'the migration deletes and rewrites nothing');
SELECT test_assert(current_setting('us277.mig') !~* '\mVALIDATE\s+CONSTRAINT\M',
  'the migration does not validate; that is a later, separate step');

-- Targets. companies comes from _bootstrap.sql.
CREATE TABLE public.projects (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, UNIQUE (id, company_id));
CREATE TABLE public.contacts (id uuid PRIMARY KEY DEFAULT gen_random_uuid());

-- Stand-ins, one per listed table, each listed column a nullable uuid.
-- user_favorites is deliberately not created: a table the list names but the
-- database lacks must be skipped, not fail the push.
DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT DISTINCT tbl FROM pg_temp.listed WHERE tbl NOT IN ('projects', 'user_favorites') LOOP
    EXECUTE format('CREATE TABLE public.%I (id uuid PRIMARY KEY DEFAULT gen_random_uuid())', r.tbl);
  END LOOP;
  FOR r IN SELECT * FROM pg_temp.listed WHERE tbl <> 'user_favorites' LOOP
    EXECUTE format('ALTER TABLE public.%I ADD COLUMN %I %s', r.tbl, r.col,
                   CASE WHEN (r.tbl, r.col) = ('geofences', 'company_id') THEN 'text' ELSE 'uuid' END);
  END LOOP;
END $$;

-- Keys a migration already declared must not be doubled (a second key between
-- the same two tables makes PostgREST embeds ambiguous).
ALTER TABLE public.project_sov_lines
  ADD CONSTRAINT project_sov_lines_project_id_fkey FOREIGN KEY (project_id) REFERENCES public.projects (id) ON DELETE CASCADE;
-- bid_packages reaches projects through a composite key; its company_id key
-- to companies is a different target and must still be added.
ALTER TABLE public.bid_packages ADD COLUMN project_id uuid;
ALTER TABLE public.bid_packages
  ADD CONSTRAINT bid_packages_project_company_fk FOREIGN KEY (project_id, company_id) REFERENCES public.projects (id, company_id);

-- Real data, and orphans that predate the migration.
INSERT INTO public.companies (id, name) VALUES ('00000000-0000-0000-0000-00000000000a', 'Acme Build');
INSERT INTO public.projects (id, company_id) VALUES
  ('00000000-0000-0000-0000-0000000000b1', '00000000-0000-0000-0000-00000000000a'),
  ('00000000-0000-0000-0000-0000000000b2', '00000000-0000-0000-0000-00000000000a');
INSERT INTO public.contacts (id) VALUES ('00000000-0000-0000-0000-0000000000c1');

INSERT INTO public.activity_feed (id, company_id, project_id) VALUES
  ('00000000-0000-0000-0000-0000000000f1', '00000000-0000-0000-0000-0000000000de', '00000000-0000-0000-0000-0000000000df');
INSERT INTO public.payment_applications (id, company_id, project_id) VALUES
  ('00000000-0000-0000-0000-0000000000f2', '00000000-0000-0000-0000-0000000000de', '00000000-0000-0000-0000-0000000000b1');
INSERT INTO public.invoices (id, client_id) VALUES
  ('00000000-0000-0000-0000-0000000000f3', '00000000-0000-0000-0000-0000000000dc');

\i supabase/migrations/20260924200000_missing_foreign_keys.sql

-- Keys added by the migration: single-column, named <table>_<col>_fkey, on a
-- listed column (user_profiles_company_id_fkey from _bootstrap.sql is not one).
CREATE FUNCTION pg_temp.added() RETURNS TABLE (tbl text, col text, ref text, deltype "char", validated boolean)
LANGUAGE sql AS $$
  SELECT c.conrelid::regclass::text, a.attname::text, c.confrelid::regclass::text, c.confdeltype, c.convalidated
    FROM pg_constraint c
    JOIN pg_attribute a ON a.attrelid = c.conrelid AND a.attnum = c.conkey[1]
   WHERE c.contype = 'f' AND c.connamespace = 'public'::regnamespace
     AND c.conname = c.conrelid::regclass::text || '_' || a.attname || '_fkey'
     AND c.conname <> 'project_sov_lines_project_id_fkey'
     AND (c.conrelid::regclass::text, a.attname::text) IN (SELECT tbl, col FROM pg_temp.listed)
$$;

-- 170 listed, minus: user_favorites (missing), geofences.company_id (text),
-- project_sov_lines.project_id (already had one).
SELECT test_assert((SELECT count(*) FROM pg_temp.added()) = 167, 'adds 167 keys and skips the 3 it should');
SELECT test_assert(NOT EXISTS (SELECT 1 FROM pg_temp.added() WHERE validated), 'every added key is NOT VALID');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.added() WHERE tbl IN ('user_favorites', 'geofences')),
  'a missing table and a non-uuid column are skipped');
SELECT test_assert(
  (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.project_sov_lines'::regclass
      AND contype = 'f' AND confrelid = 'public.projects'::regclass) = 1,
  'an existing key to the same target is not doubled');
SELECT test_assert(
  EXISTS (SELECT 1 FROM pg_temp.added() WHERE tbl = 'bid_packages' AND col = 'company_id')
  AND (SELECT count(*) FROM pg_constraint WHERE conrelid = 'public.bid_packages'::regclass
          AND contype = 'f' AND confrelid = 'public.projects'::regclass) = 1,
  'bid_packages keeps its one composite key to projects and gains company_id -> companies');
SELECT test_assert(
  NOT EXISTS (
    SELECT 1 FROM pg_temp.added() a JOIN pg_temp.listed l ON (l.tbl, l.col) = (a.tbl, a.col)
     WHERE a.ref <> l.ref
        OR a.deltype <> CASE l.on_delete WHEN 'CASCADE' THEN 'c' WHEN 'SET NULL' THEN 'n' ELSE 'a' END),
  'each key references the listed target with the listed ON DELETE');

SELECT test_assert(
  (SELECT count(*) FROM public.activity_feed WHERE id = '00000000-0000-0000-0000-0000000000f1') = 1
  AND (SELECT count(*) FROM public.payment_applications WHERE id = '00000000-0000-0000-0000-0000000000f2') = 1
  AND (SELECT client_id FROM public.invoices WHERE id = '00000000-0000-0000-0000-0000000000f3')
      = '00000000-0000-0000-0000-0000000000dc',
  'rows orphaned before the migration are still there, unchanged');

-- Every added key refuses a new orphan, and accepts a real parent.
DO $$
DECLARE r record; refused int := 0; good uuid;
BEGIN
  FOR r IN SELECT * FROM pg_temp.added() LOOP
    BEGIN
      EXECUTE format('INSERT INTO %s (%I) VALUES (gen_random_uuid())', r.tbl, r.col);
      RAISE EXCEPTION 'ASSERTION FAILED: %.% accepted an orphan', r.tbl, r.col;
    EXCEPTION WHEN foreign_key_violation THEN
      refused := refused + 1;
    END;
    good := CASE r.ref WHEN 'companies' THEN '00000000-0000-0000-0000-00000000000a'::uuid
                       WHEN 'projects'  THEN '00000000-0000-0000-0000-0000000000b2'::uuid
                       ELSE '00000000-0000-0000-0000-0000000000c1'::uuid END;
    IF r.tbl <> 'projects' THEN
      EXECUTE format('INSERT INTO %s (%I) VALUES (%L)', r.tbl, r.col, good);
    END IF;
  END LOOP;
  PERFORM test_assert(refused = 167, format('all %s keys refuse a new orphan insert with 23503', refused));
END $$;

-- An update that orphans an existing good row is refused too.
DO $$
BEGIN
  UPDATE public.chat_channels SET company_id = gen_random_uuid() WHERE company_id IS NOT NULL;
  RAISE EXCEPTION 'ASSERTION FAILED: update to a missing company was accepted';
EXCEPTION WHEN foreign_key_violation THEN
  PERFORM test_assert(true, 'an update that points at a missing company is refused');
END $$;

-- ON DELETE, by behaviour. Project b2 now has one row in every listed table.
DO $$
BEGIN
  DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000b2';
  RAISE EXCEPTION 'ASSERTION FAILED: deleted a project that has payment applications';
EXCEPTION WHEN foreign_key_violation THEN
  PERFORM test_assert(true, 'a project with money rows cannot be deleted (NO ACTION)');
END $$;

DO $$
DECLARE r record;
BEGIN
  FOR r IN SELECT * FROM pg_temp.listed WHERE col = 'project_id' AND on_delete = 'NO ACTION' LOOP
    EXECUTE format('DELETE FROM public.%I WHERE project_id = %L', r.tbl, '00000000-0000-0000-0000-0000000000b2');
  END LOOP;
END $$;
DELETE FROM public.projects WHERE id = '00000000-0000-0000-0000-0000000000b2';
SELECT test_assert(
  (SELECT count(*) FROM public.chat_channels) = 2
  AND (SELECT count(*) FROM public.chat_channels WHERE project_id IS NOT NULL) = 0
  AND (SELECT count(*) FROM public.inspection_schedules) = 1
  AND (SELECT count(*) FROM public.inspection_schedules WHERE project_id IS NOT NULL) = 0,
  'once money rows are gone the delete goes through: SET NULL keeps the chat channel, CASCADE removes the inspection');

DELETE FROM public.contacts WHERE id = '00000000-0000-0000-0000-0000000000c1';
SELECT test_assert(
  (SELECT count(*) FROM public.estimates WHERE client_id IS NOT NULL) = 0
  AND (SELECT count(*) FROM public.estimates) = 1,
  'deleting a contact clears client_id and keeps the estimate');

-- A rerun adds nothing and does not fail.
\i supabase/migrations/20260924200000_missing_foreign_keys.sql
SELECT test_assert((SELECT count(*) FROM pg_temp.added()) = 167, 'a second run adds nothing');

-- The orphan report from the runbook, run as written.
DO $$
BEGIN
  EXECUTE 'CREATE TEMP TABLE report AS ' || rtrim(current_setting('us277.report'), E'; \n');
END $$;
SELECT test_assert(
  (SELECT orphan_rows FROM report WHERE table_name::text = 'activity_feed' AND column_name = 'company_id') = 1
  AND (SELECT orphan_rows FROM report WHERE table_name::text = 'activity_feed' AND column_name = 'project_id') = 1
  AND (SELECT orphan_rows FROM report WHERE table_name::text = 'payment_applications' AND column_name = 'company_id') = 1
  AND (SELECT orphan_rows FROM report WHERE table_name::text = 'invoices' AND column_name = 'client_id') = 1,
  'the orphan report counts each pre-existing orphan');
SELECT test_assert((SELECT sum(orphan_rows) FROM report) = 4, 'and nothing else');
SELECT test_assert((SELECT count(*) FROM report) = 167, 'the report covers every NOT VALID key');

-- VALIDATE fails while an orphan remains and succeeds once it is resolved.
DO $$
BEGIN
  ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_client_id_fkey;
  RAISE EXCEPTION 'ASSERTION FAILED: validated a key with an orphan';
EXCEPTION WHEN foreign_key_violation THEN
  PERFORM test_assert(true, 'VALIDATE refuses while an orphan remains');
END $$;
UPDATE public.invoices SET client_id = NULL WHERE id = '00000000-0000-0000-0000-0000000000f3';
ALTER TABLE public.invoices VALIDATE CONSTRAINT invoices_client_id_fkey;
SELECT test_assert(
  (SELECT convalidated FROM pg_constraint WHERE conname = 'invoices_client_id_fkey'),
  'VALIDATE succeeds once the orphan is resolved');

-- The companion index file: project_id-led indexes, CONCURRENTLY, on listed
-- project_id columns only.
\set idx `cat supabase/migrations/20260924200001_foreign_key_column_indexes.sql`
SELECT set_config('us277.idx', :'idx', false) \g /dev/null
CREATE TABLE pg_temp.indexed AS
  SELECT m[1] AS tbl FROM regexp_matches(current_setting('us277.idx'),
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_\w+_project_id ON public\.(\w+) \(project_id\);', 'g') AS m;
SELECT test_assert((SELECT count(*) FROM pg_temp.indexed) = 22, 'the index file builds 22 project_id indexes');
SELECT test_assert(
  (SELECT count(*) FROM regexp_matches(current_setting('us277.idx'), '(?n)^\s*CREATE (UNIQUE )?INDEX (?!CONCURRENTLY)', 'g')) = 0
  AND current_setting('us277.idx') !~* '(?n)^\s*(BEGIN|COMMIT|DO)\M',
  'every index is CONCURRENTLY, with no transaction or DO block');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.indexed i
               WHERE i.tbl <> 'bid_packages'
                 AND NOT EXISTS (SELECT 1 FROM pg_temp.listed l WHERE l.tbl = i.tbl AND l.col = 'project_id')),
  'each indexed table is a listed project_id key (or bid_packages, whose composite key has no project_id index)');
\i supabase/migrations/20260924200001_foreign_key_column_indexes.sql
SELECT test_assert(
  NOT EXISTS (
    SELECT 1 FROM pg_temp.indexed i
     WHERE NOT EXISTS (
       SELECT 1 FROM pg_index x JOIN pg_attribute a ON a.attrelid = x.indrelid AND a.attnum = x.indkey[0]
        WHERE x.indrelid = to_regclass('public.' || i.tbl) AND a.attname = 'project_id' AND x.indisvalid)),
  'each of them ends up with a valid project_id-led index');
