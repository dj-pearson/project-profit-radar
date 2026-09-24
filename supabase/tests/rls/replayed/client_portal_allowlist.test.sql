-- client_portal allowlist (20260924250000), against the schema the migrations
-- build.
--
-- Company A has two projects: P1, which the client is enrolled on, and P2,
-- which they are not (an inactive enrolment row exists for it, which must not
-- count). Every allowlisted portal table gets a P1 row and a P2 row. As the
-- client:
--   * each portal table shows the P1 row and nothing else - not P2's, and not
--     the rows _seed.sql put in company A under other projects;
--   * user_profiles shows their own row and the project manager on P1's
--     conversation, nobody else in the company;
--   * bank_accounts, journal_entry_lines, document_categories and B's
--     projects show nothing;
--   * writes land only on P1 and only where the portal writes.
-- As company A's staff, P1 and P2 are both visible exactly as before. And every
-- tenant table carries a client_portal_boundary policy, so a new one cannot
-- slip past.

\i supabase/tests/rls/replayed/_seed.sql

SET session_replication_role = replica;
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'client@a.test', '{"provider": "email"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'staff@a.test', '{"provider": "email"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a4', 'pm@a.test', '{"provider": "email"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a5', 'pm2@a.test', '{"provider": "email"}');

CREATE TABLE rls_test.portal (tbl text PRIMARY KEY, p1 uuid NOT NULL, p2 uuid NOT NULL);
GRANT SELECT ON rls_test.portal TO authenticated;

DO $$
DECLARE
  site text := '5e5e5e5e-0000-0000-0000-000000000000';
  a text := 'aaaaaaaa-0000-0000-0000-000000000000';
  proj1 text := 'aaaaaaaa-0000-0000-0000-0000000000f1';
  proj2 text := 'aaaaaaaa-0000-0000-0000-0000000000f2';
  t text; tag int := 20; id1 uuid; id2 uuid;
  base jsonb := jsonb_build_object('company_id', a, 'site_id', site);
BEGIN
  EXECUTE rls_test.insert_sql('public.user_profiles', 11, base || jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'email', 'client@a.test', 'role', 'client_portal', 'is_active', 'true'));
  EXECUTE rls_test.insert_sql('public.user_profiles', 12, base || jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'email', 'staff@a.test', 'role', 'office_staff', 'is_active', 'true'));
  EXECUTE rls_test.insert_sql('public.user_profiles', 13, base || jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a4', 'email', 'pm@a.test', 'role', 'project_manager', 'is_active', 'true'));
  EXECUTE rls_test.insert_sql('public.user_profiles', 14, base || jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a5', 'email', 'pm2@a.test', 'role', 'project_manager', 'is_active', 'true'));

  EXECUTE rls_test.insert_sql('public.projects', 11, base || jsonb_build_object('id', proj1));
  EXECUTE rls_test.insert_sql('public.projects', 12, base || jsonb_build_object('id', proj2));
  INSERT INTO rls_test.portal VALUES ('projects', proj1::uuid, proj2::uuid);

  -- Enrolled on P1; an old, deactivated enrolment on P2.
  EXECUTE rls_test.insert_sql('public.client_portal_access', 11, base || jsonb_build_object(
    'project_id', proj1, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'client_email', 'client@a.test',
    'is_active', 'true'));
  EXECUTE rls_test.insert_sql('public.client_portal_access', 12, base || jsonb_build_object(
    'project_id', proj2, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'client_email', 'client@a.test',
    'is_active', 'false'));

  -- One row per project in each project-scoped portal table.
  FOREACH t IN ARRAY ARRAY['change_orders', 'invoices', 'tasks', 'daily_reports', 'selection_categories',
                           'documents', 'rfis', 'client_selections'] LOOP
    id1 := gen_random_uuid(); id2 := gen_random_uuid(); tag := tag + 2;
    EXECUTE rls_test.insert_sql(('public.' || t)::regclass, tag, base || jsonb_build_object('id', id1, 'project_id', proj1));
    EXECUTE rls_test.insert_sql(('public.' || t)::regclass, tag + 1, base || jsonb_build_object('id', id2, 'project_id', proj2));
    INSERT INTO rls_test.portal VALUES (t, id1, id2);
  END LOOP;

  -- The conversations, as invite-client writes them: the client is a
  -- participant on both (P2 from the old enrolment), a4 manages P1, a5 P2.
  -- The client reads only their own participant row, and only on P1.
  id1 := gen_random_uuid(); id2 := gen_random_uuid();
  EXECUTE rls_test.insert_sql('public.project_communication_participants', 41, jsonb_build_object(
    'id', id1, 'project_id', proj1, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000c1'));
  EXECUTE rls_test.insert_sql('public.project_communication_participants', 42, jsonb_build_object(
    'id', id2, 'project_id', proj2, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000c1'));
  INSERT INTO rls_test.portal VALUES ('project_communication_participants', id1, id2);
  EXECUTE rls_test.insert_sql('public.project_communication_participants', 51, jsonb_build_object(
    'project_id', proj1, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000a4'));
  EXECUTE rls_test.insert_sql('public.project_communication_participants', 52, jsonb_build_object(
    'project_id', proj2, 'user_id', 'aaaaaaaa-0000-0000-0000-0000000000a5'));
  id1 := gen_random_uuid(); id2 := gen_random_uuid();
  EXECUTE rls_test.insert_sql('public.project_messages', 43, jsonb_build_object(
    'id', id1, 'project_id', proj1, 'sender_id', 'aaaaaaaa-0000-0000-0000-0000000000a4'));
  EXECUTE rls_test.insert_sql('public.project_messages', 44, jsonb_build_object(
    'id', id2, 'project_id', proj2, 'sender_id', 'aaaaaaaa-0000-0000-0000-0000000000a5'));
  INSERT INTO rls_test.portal VALUES ('project_messages', id1, id2);

  -- Children through a parent row.
  id1 := gen_random_uuid(); id2 := gen_random_uuid();
  EXECUTE rls_test.insert_sql('public.selection_options', 45, base || jsonb_build_object(
    'id', id1, 'category_id', (SELECT p1 FROM rls_test.portal WHERE tbl = 'selection_categories')));
  EXECUTE rls_test.insert_sql('public.selection_options', 46, base || jsonb_build_object(
    'id', id2, 'category_id', (SELECT p2 FROM rls_test.portal WHERE tbl = 'selection_categories')));
  INSERT INTO rls_test.portal VALUES ('selection_options', id1, id2);
  id1 := gen_random_uuid(); id2 := gen_random_uuid();
  EXECUTE rls_test.insert_sql('public.rfi_responses', 47, base || jsonb_build_object(
    'id', id1, 'rfi_id', (SELECT p1 FROM rls_test.portal WHERE tbl = 'rfis')));
  EXECUTE rls_test.insert_sql('public.rfi_responses', 48, base || jsonb_build_object(
    'id', id2, 'rfi_id', (SELECT p2 FROM rls_test.portal WHERE tbl = 'rfis')));
  INSERT INTO rls_test.portal VALUES ('rfi_responses', id1, id2);

  -- A platform-wide flag the client may read beside company A's (seeded).
  EXECUTE rls_test.insert_sql('public.feature_flags', 49, jsonb_build_object('company_id', NULL, 'site_id', site));
END $$;
SET session_replication_role = origin;

-- Counting rows the caller can see without leaving this helper's footprint.
CREATE FUNCTION pg_temp.n(sql text) RETURNS bigint LANGUAGE plpgsql AS $$
DECLARE r bigint;
BEGIN EXECUTE sql INTO r; RETURN r; END $$;

-- 'rls' when RLS refused the statement or it touched no row, 'passed' when it
-- got past RLS (whether or not a later constraint failed). Rolled back either way.
CREATE FUNCTION pg_temp.write(sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  BEGIN
    EXECUTE sql; GET DIAGNOSTICS n = ROW_COUNT;
    RAISE EXCEPTION USING ERRCODE = 'ZZ395', MESSAGE = n::text;
  EXCEPTION
    WHEN SQLSTATE 'ZZ395' THEN RETURN CASE WHEN SQLERRM::bigint > 0 THEN 'passed' ELSE 'rls' END;
    WHEN insufficient_privilege THEN RETURN 'rls';
    WHEN not_null_violation OR check_violation OR unique_violation OR foreign_key_violation THEN RETURN 'passed';
  END;
END $$;

-- The internal rows the client must not see are there to be seen.
SELECT test_assert(
  (SELECT count(*) FROM public.bank_accounts WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1
  AND (SELECT count(*) FROM public.journal_entry_lines WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1
  AND (SELECT count(*) FROM public.document_categories WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1,
  'company A has a bank account, a journal entry line and a document category seeded');

-- 1. The enrolled client, table by table.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
DO $$
DECLARE r record; seen bigint; p1 bigint; p2 bigint;
BEGIN
  FOR r IN SELECT * FROM rls_test.portal ORDER BY tbl LOOP
    seen := pg_temp.n(format('SELECT count(*) FROM public.%I', r.tbl));
    p1 := pg_temp.n(format('SELECT count(*) FROM public.%I WHERE id = %L', r.tbl, r.p1));
    p2 := pg_temp.n(format('SELECT count(*) FROM public.%I WHERE id = %L', r.tbl, r.p2));
    PERFORM test_assert(p1 = 1 AND p2 = 0 AND seen = 1,
      format('client_portal reads %s: the enrolled project''s row and nothing else (P1 %s, P2 %s, total %s)',
             r.tbl, p1, p2, seen));
  END LOOP;
END $$;

SELECT test_assert(pg_temp.n($$SELECT count(*) FROM public.client_portal_access
                               WHERE user_id IS DISTINCT FROM 'aaaaaaaa-0000-0000-0000-0000000000c1'$$) = 0
                   AND pg_temp.n($$SELECT count(*) FROM public.client_portal_access$$) = 2,
  'client_portal reads their own two enrolment rows and no other client''s');
SELECT test_assert(
  (SELECT array_agg(id::text ORDER BY id) FROM public.user_profiles)
    = ARRAY['aaaaaaaa-0000-0000-0000-0000000000a4', 'aaaaaaaa-0000-0000-0000-0000000000c1'],
  'client_portal reads their own profile and the P1 conversation''s project manager, nobody else');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.bank_accounts') = 0,
  'client_portal reads no bank_accounts');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.journal_entry_lines') = 0,
  'client_portal reads no journal_entry_lines');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.journal_entries') = 0,
  'client_portal reads no journal_entries');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.document_categories') = 0,
  'client_portal reads no document_categories');
SELECT test_assert(pg_temp.n($$SELECT count(*) FROM public.projects
                               WHERE id <> 'aaaaaaaa-0000-0000-0000-0000000000f1'$$) = 0,
  'client_portal reads no project they are not enrolled on, in A or B');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.feature_flags WHERE company_id IS NULL') = 1
                   AND pg_temp.n('SELECT count(*) FROM public.feature_flags WHERE company_id IS NOT NULL') = 0,
  'client_portal reads the platform-wide feature flag and not company A''s');

-- Writes the portal makes land on P1 only.
SELECT test_assert(pg_temp.write(rls_test.insert_sql('public.client_selections', 61, jsonb_build_object(
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000',
    'project_id', 'aaaaaaaa-0000-0000-0000-0000000000f1',
    'category_id', (SELECT p1 FROM rls_test.portal WHERE tbl = 'selection_categories'),
    'option_id', (SELECT p1 FROM rls_test.portal WHERE tbl = 'selection_options')))) = 'passed',
  'client_portal can choose a selection on P1');
SELECT test_assert(pg_temp.write(rls_test.insert_sql('public.client_selections', 62, jsonb_build_object(
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000',
    'project_id', 'aaaaaaaa-0000-0000-0000-0000000000f2',
    'category_id', (SELECT p2 FROM rls_test.portal WHERE tbl = 'selection_categories'),
    'option_id', (SELECT p2 FROM rls_test.portal WHERE tbl = 'selection_options')))) = 'rls',
  'client_portal cannot write a selection on P2');
SELECT test_assert(pg_temp.write($$UPDATE public.client_selections SET status = status
                                   WHERE project_id = 'aaaaaaaa-0000-0000-0000-0000000000f2'$$) = 'rls',
  'client_portal cannot update P2''s selections');
SELECT test_assert(pg_temp.write($$UPDATE public.projects SET name = name
                                   WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000f1'$$) = 'rls',
  'client_portal cannot edit their own project');
SELECT test_assert(pg_temp.write($$UPDATE public.invoices SET status = status
                                   WHERE project_id = 'aaaaaaaa-0000-0000-0000-0000000000f1'$$) = 'rls',
  'client_portal cannot edit their invoice');
SELECT test_assert(pg_temp.write($$UPDATE public.user_profiles SET first_name = 'x'
                                   WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a4'$$) = 'rls',
  'client_portal cannot edit a contractor''s profile');
SELECT test_assert(pg_temp.write($$UPDATE public.user_profiles SET first_name = 'x'
                                   WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c1'$$) = 'passed',
  'client_portal can still edit their own profile');
SELECT test_assert(pg_temp.write(rls_test.insert_sql('public.bank_accounts', 63, jsonb_build_object(
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000'))) = 'rls',
  'client_portal cannot insert into bank_accounts');
ROLLBACK;

-- 2. Losing the enrolment loses the rows.
BEGIN;
SET LOCAL session_replication_role = replica;
UPDATE public.client_portal_access SET is_active = false
 WHERE project_id = 'aaaaaaaa-0000-0000-0000-0000000000f1';
SET LOCAL session_replication_role = origin;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
SELECT test_assert(pg_temp.n('SELECT count(*) FROM public.projects') = 0
                   AND pg_temp.n('SELECT count(*) FROM public.invoices') = 0
                   AND pg_temp.n('SELECT count(*) FROM public.rfi_responses') = 0,
  'a deactivated enrolment shows the client nothing');
ROLLBACK;

-- 3. Company A's staff see both projects' rows exactly as before: every
-- allowlisted table reads the same with and without the new policies.
DO $$
DECLARE r record; role_id text; before bigint; after bigint; pol record;
BEGIN
  FOREACH role_id IN ARRAY ARRAY['aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-0000000000a2',
                                 'aaaaaaaa-0000-0000-0000-0000000000a4'] LOOP
    FOR r IN SELECT * FROM rls_test.portal ORDER BY tbl LOOP
      PERFORM test_act_as(role_id::uuid);
      after := pg_temp.n(format('SELECT count(*) FROM public.%I WHERE id IN (%L, %L)', r.tbl, r.p1, r.p2));
      RESET ROLE;
      -- The same read with the client_portal policies set aside.
      BEGIN
        FOR pol IN SELECT polname FROM pg_policy WHERE polrelid = ('public.' || r.tbl)::regclass
                    AND polname LIKE 'client_portal_boundary%' LOOP
          EXECUTE format('DROP POLICY %I ON public.%I', pol.polname, r.tbl);
        END LOOP;
        PERFORM test_act_as(role_id::uuid);
        before := pg_temp.n(format('SELECT count(*) FROM public.%I WHERE id IN (%L, %L)', r.tbl, r.p1, r.p2));
        RAISE EXCEPTION USING ERRCODE = 'ZZ396';
      EXCEPTION WHEN SQLSTATE 'ZZ396' THEN NULL;
      END;
      RESET ROLE;
      IF before <> after THEN
        RAISE EXCEPTION 'ASSERTION FAILED: % reads % of % rows in % with the client_portal policies, % without',
          role_id, after, 2, r.tbl, before;
      END IF;
    END LOOP;
  END LOOP;
  PERFORM test_assert(true, 'admin, office_staff and project_manager read every allowlisted table exactly as without the client_portal policies');
END $$;
SELECT set_config('request.jwt.claims', '', false) IS NOT NULL AS claims_cleared;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
SELECT test_assert(pg_temp.n($$SELECT count(*) FROM public.projects WHERE id IN
                               ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-0000000000f2')$$) = 2
                   AND pg_temp.n('SELECT count(*) FROM public.bank_accounts') >= 1,
  'company A''s admin still reads both projects and the bank account');
ROLLBACK;

-- 4. Every tenant table is behind a client_portal_boundary policy. A table
-- added after 20260924250000 fails here until it gets one (see that file's
-- header for the one-statement fix).
SELECT test_assert(NOT EXISTS (
    SELECT 1 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
       AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
                     AND a.attname IN ('company_id', 'project_id') AND a.attnum > 0 AND NOT a.attisdropped)
       AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
                         AND p.polname IN ('client_portal_boundary', 'client_portal_boundary_select'))),
  'every RLS table with company_id or project_id has a client_portal_boundary policy; missing: '
  || coalesce((SELECT string_agg(c.relname, ', ' ORDER BY c.relname)
                 FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
                WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
                  AND EXISTS (SELECT 1 FROM pg_attribute a WHERE a.attrelid = c.oid
                                AND a.attname IN ('company_id', 'project_id') AND a.attnum > 0 AND NOT a.attisdropped)
                  AND NOT EXISTS (SELECT 1 FROM pg_policy p WHERE p.polrelid = c.oid
                                    AND p.polname IN ('client_portal_boundary', 'client_portal_boundary_select'))), ''));
SELECT test_assert(
  (SELECT count(DISTINCT polrelid) FROM pg_policy WHERE polname = 'client_portal_boundary_select') = 19,
  'all 19 allowlisted portal tables got their scoped policies (none fell through to the deny on schema drift)');
