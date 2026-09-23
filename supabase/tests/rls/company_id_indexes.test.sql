-- US-391: 20260923140000_company_id_indexes.sql gives every listed table an
-- index led by company_id, builds them CONCURRENTLY (so it has to run outside
-- a transaction, which psql -f does), and leaves tables that already have one
-- alone.
--
-- The table list is read out of the migration itself so this test cannot
-- drift from it.

\set mig `cat supabase/migrations/20260923140000_company_id_indexes.sql`
\set types `cat src/integrations/supabase/types.ts`
SELECT set_config('us391.mig', :'mig', false) \g /dev/null
SELECT set_config('us391.types', :'types', false) \g /dev/null

CREATE FUNCTION pg_temp.listed() RETURNS SETOF text LANGUAGE sql AS $$
  SELECT m[1] FROM regexp_matches(current_setting('us391.mig'),
    'CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_\w+\s+ON public\.(\w+) \(company_id\);', 'g') AS m
$$;

-- Leading-column company_id indexes on a table, valid or not.
CREATE FUNCTION pg_temp.cid_indexes(t text, only_valid boolean) RETURNS bigint LANGUAGE sql AS $$
  SELECT count(*) FROM pg_index i
    JOIN pg_attribute a ON a.attrelid = i.indrelid AND a.attnum = i.indkey[0]
   WHERE i.indrelid = to_regclass('public.' || t) AND a.attname = 'company_id'
     AND (i.indisvalid OR NOT only_valid)
$$;

SELECT test_assert((SELECT count(*) FROM pg_temp.listed()) = 74, 'the migration indexes 74 tables');
SELECT test_assert(
  (SELECT count(*) FROM pg_temp.listed()) = (SELECT count(DISTINCT l) FROM pg_temp.listed() l),
  'no table is listed twice');
SELECT test_assert(
  (SELECT count(*) FROM regexp_matches(current_setting('us391.mig'), '(?n)^\s*CREATE (UNIQUE )?INDEX (?!CONCURRENTLY)', 'g')) = 0,
  'every statement is CONCURRENTLY');
SELECT test_assert(current_setting('us391.mig') !~* '(?n)^\s*(BEGIN|COMMIT|DO)\M', 'no transaction block or DO block');

-- Every listed table exists in the live schema with a company_id column; an
-- index on a missing table would fail the whole push.
SELECT test_assert(
  NOT EXISTS (
    SELECT 1 FROM pg_temp.listed() t
     WHERE current_setting('us391.types') !~ ('\n      ' || t || ': \{\n        Row: \{[^}]*\n          company_id\??: ')),
  'every listed table has company_id in the generated types');

-- Tables the migration already knows are indexed must not be in the list.
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed() t WHERE t IN ('projects', 'invoices', 'estimates', 'bills', 'time_entries')),
  'tables that already have a company_id index are skipped');

-- Stand-ins for the real tables, one per listed name.
DO $$
DECLARE t text;
BEGIN
  FOR t IN SELECT * FROM pg_temp.listed() LOOP
    EXECUTE format('CREATE TABLE public.%I (id uuid PRIMARY KEY, company_id uuid, created_at timestamptz)', t);
  END LOOP;
END $$;

-- vendors already carries the index by name (a partial rerun, or it was
-- added by hand): IF NOT EXISTS must leave it, not error or duplicate it.
CREATE INDEX idx_vendors_company_id ON public.vendors (company_id, created_at);
-- A table outside the list with its own company_id index stays untouched.
CREATE TABLE public.projects (id uuid PRIMARY KEY, company_id uuid);
CREATE INDEX idx_projects_company ON public.projects (company_id);

SELECT test_assert(
  (SELECT count(*) FROM pg_temp.listed() t WHERE pg_temp.cid_indexes(t, false) = 0) = 73,
  'before: 73 of the 74 tables have no company_id index');

\i supabase/migrations/20260923140000_company_id_indexes.sql

SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed() t WHERE pg_temp.cid_indexes(t, true) <> 1),
  'after: each listed table has exactly one valid company_id-led index');
SELECT test_assert(
  (SELECT pg_get_indexdef('public.idx_vendors_company_id'::regclass)) LIKE '%(company_id, created_at)',
  'an index that already existed under the same name is left as it was');
SELECT test_assert(pg_temp.cid_indexes('projects', false) = 1, 'a table outside the list gains no index');
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_index WHERE NOT indisvalid),
  'no INVALID index left behind by the concurrent builds');

-- Rerunning is a no-op.
\i supabase/migrations/20260923140000_company_id_indexes.sql
SELECT test_assert(
  NOT EXISTS (SELECT 1 FROM pg_temp.listed() t WHERE pg_temp.cid_indexes(t, false) <> 1),
  'a second run creates nothing');
