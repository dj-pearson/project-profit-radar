-- US-394: tenancy isolation for every company-scoped table, generated from the
-- schema the migrations actually build.
--
-- The database this runs in is a clone of the template run-rls-tests.sh built
-- by replaying all of supabase/migrations. The table list is not written down
-- anywhere: it is every public table that has a company_id column and RLS
-- enabled, read from the catalog. A new table picks up coverage the day its
-- migration lands.
--
-- For each one, as the service role (triggers and FKs off), seed a row for
-- company A and a row for company B. Then, as company A's admin - the most
-- privileged in-tenant role, so anything it cannot do nobody below it can -
-- assert that:
--   SELECT   sees none of B's rows
--   UPDATE   touches none of B's rows
--   UPDATE   cannot move one of A's rows into B
--   DELETE   removes none of B's rows
--   INSERT   of a row carrying B's company_id is refused (or lands in A)
--
-- A table that is meant to be read across tenants goes in rls_test.shared_read
-- below with the reason, not silently past the check.

\i supabase/tests/rls/replayed/_seed.sql

-- Tables whose cross-tenant SELECT is deliberate. Writes are still checked.
-- Empty today: nothing in the replayed schema needs it.
CREATE TABLE rls_test.shared_read (tbl text PRIMARY KEY, reason text NOT NULL);

-- The claims a real session carries. Nothing in src/ or supabase/functions
-- puts site_id in app_metadata, so neither does this.
SELECT set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-0000000000a1", "role": "authenticated", "app_metadata": {"provider": "email"}}', false) IS NOT NULL AS claims_set;

DO $$
DECLARE r record; p record; a text := 'aaaaaaaa-0000-0000-0000-000000000000'; b text := 'bbbbbbbb-0000-0000-0000-000000000000';
        ins text;
BEGIN
  FOR r IN SELECT t.tbl, t.cid_type FROM rls_test.tables t
            WHERE t.tbl NOT IN (SELECT tbl FROM rls_test.not_seeded) ORDER BY t.tbl::text LOOP
    ins := rls_test.insert_sql(r.tbl, 3, jsonb_build_object('company_id', b, 'site_id', '5e5e5e5e-0000-0000-0000-000000000000'));
    FOR p IN SELECT * FROM (VALUES
      ('select',  format('SELECT count(*) FROM %s WHERE company_id::text = %L', r.tbl, b)),
      ('update',  format('UPDATE %s SET company_id = company_id WHERE company_id::text = %L', r.tbl, b)),
      ('move',    format('UPDATE %s SET company_id = %L::%s WHERE company_id::text = %L', r.tbl, b, r.cid_type, a)),
      ('delete',  format('DELETE FROM %s WHERE company_id::text = %L', r.tbl, b)),
      ('insert',  ins)) v(op, sql)
    LOOP
      INSERT INTO rls_test.results SELECT r.tbl, p.op, x.outcome, x.detail FROM rls_test.probe(p.sql, b) x;
    END LOOP;
  END LOOP;
END $$;

-- Positive control: company A's admin can see A's own row. Without this a
-- broken identity setup (no JWT, say) would read as perfect isolation.
DO $$
DECLARE r record; o record;
BEGIN
  FOR r IN SELECT t.tbl FROM rls_test.tables t
            WHERE t.tbl NOT IN (SELECT tbl FROM rls_test.not_seeded) ORDER BY t.tbl::text LOOP
    SELECT * INTO o FROM rls_test.probe_once(
      format('SELECT count(*) FROM %s WHERE company_id::text = %L', r.tbl, 'aaaaaaaa-0000-0000-0000-000000000000'),
      'aaaaaaaa-0000-0000-0000-000000000000', false);
    INSERT INTO rls_test.results VALUES (r.tbl, 'own_select', CASE WHEN o.outcome = 'LEAK' THEN 'visible' ELSE 'hidden' END, o.detail);
  END LOOP;
END $$;

SELECT test_assert((SELECT count(*) FROM rls_test.tables) >= 250,
  format('the replayed schema has %s company-scoped RLS tables (floor 250; fewer means the replay broke)',
         (SELECT count(*) FROM rls_test.tables)));
SELECT test_assert(NOT EXISTS (SELECT 1 FROM rls_test.not_seeded),
  'every company-scoped table was seeded for A and B; could not seed: '
  || coalesce((SELECT string_agg(tbl || ' (' || err || ')', '; ' ORDER BY tbl::text) FROM rls_test.not_seeded), ''));
SELECT test_assert(NOT EXISTS (SELECT 1 FROM rls_test.results WHERE outcome = 'error'),
  'every probe gave a definite answer; errors: '
  || coalesce((SELECT string_agg(tbl || ' ' || op || ': ' || detail, '; ' ORDER BY tbl::text, op)
                 FROM rls_test.results WHERE outcome = 'error'), ''));
SELECT test_assert(NOT EXISTS (
    SELECT 1 FROM rls_test.results r WHERE r.outcome = 'LEAK'
       AND NOT (r.op = 'select' AND r.tbl::text IN (SELECT tbl FROM rls_test.shared_read))),
  format('company A cannot SELECT, UPDATE, DELETE, move rows into or INSERT rows for company B on any of %s tables; leaks: ',
         (SELECT count(*) FROM rls_test.tables))
  || coalesce((SELECT string_agg(tbl || ' ' || op || ' (' || detail || ')', '; ' ORDER BY tbl::text, op)
                 FROM rls_test.results WHERE outcome = 'LEAK'
                  AND NOT (op = 'select' AND tbl::text IN (SELECT tbl FROM rls_test.shared_read))), ''));

-- The tables US-394 names, by name, so a rename cannot drop them silently.
SELECT test_assert(
  (SELECT count(*) FROM rls_test.results
    WHERE tbl::text IN ('projects', 'invoices', 'materials', 'user_profiles') AND op = 'select' AND outcome = 'ok') = 4,
  'projects, invoices, materials and user_profiles are in the matrix and A reads none of B''s rows');
SELECT test_assert(
  (SELECT count(*) FROM rls_test.results
    WHERE tbl::text IN ('projects', 'invoices', 'materials', 'user_profiles') AND op = 'own_select' AND outcome = 'visible') = 4,
  'and A''s admin does read A''s own row in each of them');
SELECT test_assert(
  (SELECT count(*) FROM rls_test.results WHERE op = 'own_select' AND outcome = 'visible') >= 200,
  format('A''s admin reads its own row in %s of %s tables (the rest are service-role or role-gated)',
    (SELECT count(*) FROM rls_test.results WHERE op = 'own_select' AND outcome = 'visible'),
    (SELECT count(*) FROM rls_test.tables)));
