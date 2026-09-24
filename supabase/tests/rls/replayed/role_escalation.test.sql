-- US-394: role-escalation paths, against the schema the migrations build.
--
-- A signed-in user must not be able to raise their own role, move themselves
-- (or a colleague) into another company, mint a profile inside someone else's
-- company, grant themselves a role through user_roles, or call the privileged
-- SECURITY DEFINER functions. anon must not insert leads, nobody but the
-- service role writes subscribers, and a client_portal user must not read the
-- contractor's internal tables beyond a recorded, shrinking list.

\i supabase/tests/rls/replayed/_seed.sql

-- More people in company A, and one signed-up user with no profile yet.
SET session_replication_role = replica;
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a2', 'staff@a.test', '{"provider": "email"}'),
  ('aaaaaaaa-0000-0000-0000-0000000000a3', 'client@a.test', '{"provider": "email"}'),
  ('eeeeeeee-0000-0000-0000-0000000000e1', 'new@n.test', '{"provider": "email"}');
DO $$
BEGIN
  EXECUTE rls_test.insert_sql('public.user_profiles', 4, jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'email', 'staff@a.test', 'role', 'office_staff', 'is_active', 'true',
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000'));
  -- What invite-client creates: role client_portal, company_id the contractor's.
  EXECUTE rls_test.insert_sql('public.user_profiles', 5, jsonb_build_object(
    'id', 'aaaaaaaa-0000-0000-0000-0000000000a3', 'email', 'client@a.test', 'role', 'client_portal', 'is_active', 'true',
    'company_id', 'aaaaaaaa-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000'));
END $$;
SET session_replication_role = origin;

CREATE FUNCTION pg_temp.refused(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
DECLARE n bigint;
BEGIN
  EXECUTE sql; GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n = 0;
EXCEPTION WHEN others THEN
  RETURN true;
END $$;

-- 1. Self-service privilege columns on user_profiles (20260910010000).
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a2');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET role = 'admin' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2'$$),
  'office_staff cannot raise their own role to admin');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET role = 'root_admin' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2'$$),
  'office_staff cannot make themselves root_admin');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET company_id = 'bbbbbbbb-0000-0000-0000-000000000000' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2'$$),
  'office_staff cannot move themselves into company B');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET role = 'root_admin' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a1'$$),
  'a company admin cannot make themselves root_admin');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET role = 'root_admin' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2'$$),
  'a company admin cannot make a colleague root_admin');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET company_id = 'bbbbbbbb-0000-0000-0000-000000000000' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2'$$),
  'a company admin cannot move a colleague into company B');
SELECT test_assert(pg_temp.refused($$UPDATE public.user_profiles SET role = 'office_staff' WHERE id = 'bbbbbbbb-0000-0000-0000-0000000000b1'$$),
  'a company admin cannot change company B''s admin');
ROLLBACK;

SELECT test_assert(
  (SELECT role::text || '/' || company_id::text FROM public.user_profiles WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000a2')
    = 'office_staff/aaaaaaaa-0000-0000-0000-000000000000',
  'and the office_staff row is still office_staff in company A');

-- 2. A new sign-up cannot write itself a profile inside another company.
BEGIN;
SELECT test_act_as('eeeeeeee-0000-0000-0000-0000000000e1');
SELECT test_assert(pg_temp.refused(rls_test.insert_sql('public.user_profiles', 6, jsonb_build_object(
    'id', 'eeeeeeee-0000-0000-0000-0000000000e1', 'email', 'new@n.test', 'role', 'admin',
    'company_id', 'bbbbbbbb-0000-0000-0000-000000000000', 'site_id', '5e5e5e5e-0000-0000-0000-000000000000'))),
  'a user with no profile cannot insert one as admin of company B');
SELECT test_assert(pg_temp.refused(rls_test.insert_sql('public.user_profiles', 6, jsonb_build_object(
    'id', 'eeeeeeee-0000-0000-0000-0000000000e1', 'email', 'new@n.test', 'role', 'root_admin',
    'site_id', '5e5e5e5e-0000-0000-0000-000000000000'))),
  'a user with no profile cannot insert one as root_admin');
ROLLBACK;

-- 3. user_roles is not a side door (US-348).
DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NULL THEN RETURN; END IF;
  PERFORM test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
  PERFORM test_assert(pg_temp.refused($q$INSERT INTO public.user_roles (user_id, role)
      VALUES ('aaaaaaaa-0000-0000-0000-0000000000a1', 'root_admin')$q$),
    'a company admin cannot grant themselves root_admin through user_roles');
  RESET ROLE;
END $$;

-- 4. Privileged SECURITY DEFINER functions (US-353). Every overload that
-- exists; none may be callable from a browser session.
SELECT test_assert(
  (SELECT count(*) FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
    WHERE n.nspname = 'public'
      AND p.proname IN ('revoke_all_user_sessions', 'grant_permission_to_user', 'write_audit_log_internal')) >= 3,
  'the privileged functions exist in the replayed schema');
SELECT test_assert(NOT EXISTS (
    SELECT 1 FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace, (VALUES ('anon'), ('authenticated')) r(role)
     WHERE n.nspname = 'public'
       AND p.proname IN ('revoke_all_user_sessions', 'grant_permission_to_user', 'write_audit_log_internal')
       AND has_function_privilege(r.role, p.oid, 'EXECUTE')),
  'revoke_all_user_sessions, grant_permission_to_user and write_audit_log_internal are not executable by anon or authenticated');
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
SELECT test_assert(pg_temp.refused($$SELECT public.revoke_all_user_sessions('bbbbbbbb-0000-0000-0000-0000000000b1')$$),
  'a company admin cannot sign company B''s admin out');
ROLLBACK;

-- 5. anon cannot insert leads directly (US-351); the public forms go through
-- service-role edge functions.
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.refused(rls_test.insert_sql('public.leads', 7, '{}'::jsonb)),
  'anon cannot insert into leads');
ROLLBACK;

-- 6. subscribers is written only by the service role (US-340).
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a2');
SELECT test_assert(pg_temp.refused(rls_test.insert_sql('public.subscribers', 8, jsonb_build_object(
    'user_id', 'aaaaaaaa-0000-0000-0000-0000000000a2', 'email', 'staff@a.test', 'subscribed', 'true',
    'subscription_tier', 'enterprise'))),
  'a signed-in user cannot insert a subscribers row');
ROLLBACK;
SET session_replication_role = replica;
INSERT INTO public.subscribers (user_id, email, subscribed, subscription_tier)
VALUES ('aaaaaaaa-0000-0000-0000-0000000000a2', 'staff@a.test', false, 'starter');
SET session_replication_role = origin;
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a2');
SELECT test_assert(pg_temp.refused($$UPDATE public.subscribers SET subscribed = true, subscription_tier = 'enterprise'$$),
  'a signed-in user cannot upgrade their own subscribers row');
SELECT test_assert(pg_temp.refused($$DELETE FROM public.subscribers$$),
  'a signed-in user cannot delete subscribers rows');
ROLLBACK;
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.refused($$UPDATE public.subscribers SET subscribed = true$$),
  'anon cannot update subscribers');
ROLLBACK;

-- 7. A client_portal user of company A, enrolled in nothing, reading A's rows.
-- invite-client gives them company_id = the contractor's company, so every
-- policy that checks only "company_id = get_user_company(auth.uid())" admits
-- them to internal data. Tightening those is a multi-release change (CLAUDE.md)
-- and is left for the owner; this list is the exposure as of US-394 and may
-- only shrink. A table that newly admits a client fails here.
CREATE TABLE rls_test.client_visible_baseline (tbl text PRIMARY KEY);
\i supabase/tests/rls/replayed/_client_portal_baseline.sql

SELECT set_config('request.jwt.claims',
  '{"sub": "aaaaaaaa-0000-0000-0000-0000000000a3", "role": "authenticated", "email": "client@a.test", "app_metadata": {"provider": "email"}}', false) IS NOT NULL AS claims_set;
DO $$
DECLARE r record; o record;
BEGIN
  FOR r IN SELECT t.tbl FROM rls_test.tables t
            WHERE t.tbl NOT IN (SELECT tbl FROM rls_test.not_seeded) ORDER BY t.tbl::text LOOP
    SELECT * INTO o FROM rls_test.probe(
      format('SELECT count(*) FROM %s WHERE company_id::text = %L', r.tbl, 'aaaaaaaa-0000-0000-0000-000000000000'),
      'aaaaaaaa-0000-0000-0000-000000000000');
    INSERT INTO rls_test.results VALUES (r.tbl, 'client_select', o.outcome, o.detail);
  END LOOP;
END $$;
SELECT set_config('request.jwt.claims', '', false) IS NOT NULL AS claims_cleared;

\pset format unaligned
\pset tuples_only on
SELECT 'client_portal reads internal table: ' || tbl FROM rls_test.results
 WHERE op = 'client_select' AND outcome = 'LEAK' ORDER BY tbl::text;
\pset format aligned
\pset tuples_only off

SELECT test_assert(NOT EXISTS (SELECT 1 FROM rls_test.results WHERE op = 'client_select' AND outcome = 'error'),
  'every client_portal probe gave a definite answer; errors: '
  || coalesce((SELECT string_agg(tbl || ': ' || detail, '; ' ORDER BY tbl::text)
                 FROM rls_test.results WHERE op = 'client_select' AND outcome = 'error'), ''));
SELECT test_assert(NOT EXISTS (
    SELECT 1 FROM rls_test.results
     WHERE op = 'client_select' AND outcome = 'LEAK'
       AND tbl::text NOT IN (SELECT tbl FROM rls_test.client_visible_baseline)),
  format('a client_portal user reads no internal table beyond the %s-table baseline; new: ',
         (SELECT count(*) FROM rls_test.client_visible_baseline))
  || coalesce((SELECT string_agg(tbl::text, ', ' ORDER BY tbl::text) FROM rls_test.results
                WHERE op = 'client_select' AND outcome = 'LEAK'
                  AND tbl::text NOT IN (SELECT tbl FROM rls_test.client_visible_baseline)), ''));
SELECT test_assert(NOT EXISTS (
    SELECT 1 FROM rls_test.client_visible_baseline b
     WHERE NOT EXISTS (SELECT 1 FROM rls_test.results r
                        WHERE r.op = 'client_select' AND r.outcome = 'LEAK' AND r.tbl::text = b.tbl)),
  'the baseline is exact (remove fixed tables from _client_portal_baseline.sql): '
  || coalesce((SELECT string_agg(b.tbl, ', ' ORDER BY b.tbl) FROM rls_test.client_visible_baseline b
                WHERE NOT EXISTS (SELECT 1 FROM rls_test.results r
                                   WHERE r.op = 'client_select' AND r.outcome = 'LEAK' AND r.tbl::text = b.tbl)), ''));
