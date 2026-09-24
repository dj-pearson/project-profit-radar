-- Confine client_portal users to the portal's own tables, and there to the
-- projects they are enrolled on (US-394 follow-up; owner-approved 2026-09-24).
--
-- invite-client gives a client_portal user the contractor's company_id, so
-- every policy that checks only company membership let a client read the
-- contractor's internal data: 205 tables, bank_accounts, journal_entry_lines,
-- every project and every colleague's profile among them. The list was pinned
-- in supabase/tests/rls/replayed/_client_portal_baseline.sql.
--
-- The fix is AS RESTRICTIVE policies (the shape of 20260923170000 and
-- 20260924230000). Restrictive policies are AND'd with the permissive ones, so
-- they only narrow, and each one here starts with
--   (SELECT NOT public.caller_is_client_portal()) OR ...
-- For every role but client_portal that first branch is true, evaluated once
-- per statement as an InitPlan, so admin, project_manager, field_supervisor,
-- office_staff, accounting and root_admin keep exactly the access they had.
-- The policies are TO authenticated only: anon never has a profile, and
-- client_has_project_access() is not executable by anon.
--
-- WHICH TABLES ARE COVERED. Every RLS-enabled public table with a company_id or
-- a project_id column, i.e. the contractor's tenant data. Tables with neither
-- (user_security, user_sessions, subscribers, companies, tenants, blog and SEO
-- content, ...) are owner-scoped or public reference data that the app shell
-- and the marketing pages read for any signed-in user, so they are left alone.
--
-- THE ALLOWLIST is what the portal routes actually query. /client-portal
-- (src/pages/ClientPortalEnhanced.tsx, src/hooks/useClientPortalProjects.ts,
-- src/components/client-portal/*, src/components/client/ClientPortalRFIs.tsx,
-- ClientPortalSelections.tsx via src/services/clientSelectionsService.ts) and
-- /profile (src/pages/UserProfile.tsx, PrivacyControls), plus what the shell
-- around them reads (AuthContext, SubscriptionContext, useFavorites,
-- errorLoggingService, useFeatureFlag):
--
--   project rows, read-only    projects (by id), change_orders, invoices,
--                              tasks, daily_reports, selection_categories,
--                              project_communication_participants
--   project rows, read/write   documents (RFI attachments), rfis,
--                              client_selections (choosing an option),
--                              project_messages
--   via a parent row           selection_options (category_id), rfi_responses
--                              (rfi_id), both read-only
--   own enrolment, read-only   client_portal_access
--   own rows                   user_profiles (plus, read-only, the people on
--                              their projects' conversations, which the message
--                              center shows by name), error_logs,
--                              data_subject_requests, user_favorites
--   global rows, read-only     feature_flags where company_id IS NULL
--
-- "Enrolled on" is public.client_has_project_access() (20260903020000): an
-- active, unexpired client_portal_access row matching the caller's user_id or
-- email. That is the predicate the portal's own "Enrolled clients can read"
-- policies already use, so nothing the portal shows today disappears. These
-- policies grant nothing; a write still needs a permissive policy too.
--
-- Everything else with company_id or project_id is denied to client_portal
-- outright. That includes document_categories (documentKinds.ts already
-- treats an unreadable category as "fall back to the tag") and the
-- DashboardSearchTrigger's contacts search, which returns nothing for them.
-- process-invoice-payment reads the invoice with the caller's JWT, so a client
-- can now pay only invoices on projects they are enrolled on.
--
-- A NEW TABLE is not covered by this migration. The replayed suite catches
-- it: role_escalation.test.sql fails when a client can read a company table
-- outside the baseline, and client_portal_allowlist.test.sql fails when a
-- company_id/project_id table has no client_portal_boundary policy. The fix is
-- one statement in the new table's migration:
--   CREATE POLICY client_portal_boundary ON public.<t> AS RESTRICTIVE FOR ALL
--     TO authenticated
--     USING ((SELECT NOT public.caller_is_client_portal()))
--     WITH CHECK ((SELECT NOT public.caller_is_client_portal()));
--
-- Re-runnable: functions are CREATE OR REPLACE and every policy is dropped
-- before it is created.

-- ---------------------------------------------------------------------------
-- 1. Helpers. SECURITY DEFINER so they read user_profiles and the portal
--    tables without going back through their RLS (no recursion from the
--    user_profiles policy below); search_path pinned (US-353).
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.caller_is_client_portal()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_profiles
     WHERE id = auth.uid() AND role::text = 'client_portal'
  )
$$;
COMMENT ON FUNCTION public.caller_is_client_portal() IS
  'True when the caller''s user_profiles.role is client_portal. Behind every client_portal_boundary policy (20260924250000).';
REVOKE ALL ON FUNCTION public.caller_is_client_portal() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.caller_is_client_portal() TO authenticated, service_role;

-- selection_options carry no project_id; their category does.
CREATE OR REPLACE FUNCTION public.client_has_selection_category_access(p_category_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.selection_categories c
     WHERE c.id = p_category_id
       AND c.project_id IS NOT NULL
       AND public.client_has_project_access(c.project_id)
  )
$$;
REVOKE ALL ON FUNCTION public.client_has_selection_category_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_has_selection_category_access(uuid) TO authenticated, service_role;

-- rfi_responses carry no project_id; their RFI does.
CREATE OR REPLACE FUNCTION public.client_has_rfi_access(p_rfi_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.rfis r
     WHERE r.id = p_rfi_id
       AND r.project_id IS NOT NULL
       AND public.client_has_project_access(r.project_id)
  )
$$;
REVOKE ALL ON FUNCTION public.client_has_rfi_access(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_has_rfi_access(uuid) TO authenticated, service_role;

-- The profiles a client may see besides their own: people in the conversation
-- of a project they are enrolled on (ClientMessageCenter embeds the sender's
-- first_name/last_name from user_profiles).
CREATE OR REPLACE FUNCTION public.client_can_read_profile(p_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
  SELECT p_user_id = auth.uid()
      OR EXISTS (
           SELECT 1 FROM public.project_communication_participants pcp
            WHERE pcp.user_id = p_user_id
              AND public.client_has_project_access(pcp.project_id))
      OR EXISTS (
           SELECT 1 FROM public.project_messages m
            WHERE m.sender_id = p_user_id
              AND public.client_has_project_access(m.project_id))
$$;
REVOKE ALL ON FUNCTION public.client_can_read_profile(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.client_can_read_profile(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 2. The allowlist. read_expr decides which rows a client may SELECT (and
--    UPDATE/DELETE); write_expr which rows a client may INSERT, UPDATE to or
--    DELETE. 'false' makes a table read-only for clients. cols are the columns
--    the expressions need: a table that lacks one (the live schema and the
--    replayed one are known to differ, US-248) is NOT allowlisted and falls
--    through to the deny in section 3, so drift fails closed.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  a record;
  ok boolean;
  gate constant text := '(SELECT NOT public.caller_is_client_portal())';
  proj constant text := 'public.client_has_project_access(project_id)';
  own_enrolment constant text :=
    'user_id = auth.uid() OR lower(client_email) = lower(coalesce(auth.jwt() ->> ''email'', ''''))';
BEGIN
  FOR a IN SELECT * FROM (VALUES
    ('projects',                           ARRAY['id'],                        'public.client_has_project_access(id)', 'false'),
    ('change_orders',                      ARRAY['project_id'],                proj, 'false'),
    ('invoices',                           ARRAY['project_id'],                proj, 'false'),
    ('tasks',                              ARRAY['project_id'],                proj, 'false'),
    ('daily_reports',                      ARRAY['project_id'],                proj, 'false'),
    ('selection_categories',               ARRAY['project_id'],                proj, 'false'),
    ('project_communication_participants', ARRAY['project_id'],                proj, 'false'),
    ('documents',                          ARRAY['project_id'],                proj, proj),
    ('rfis',                               ARRAY['project_id'],                proj, proj),
    ('client_selections',                  ARRAY['project_id'],                proj, proj),
    ('project_messages',                   ARRAY['project_id'],                proj, proj),
    ('selection_options',                  ARRAY['category_id'],               'public.client_has_selection_category_access(category_id)', 'false'),
    ('rfi_responses',                      ARRAY['rfi_id'],                    'public.client_has_rfi_access(rfi_id)', 'false'),
    ('client_portal_access',               ARRAY['user_id', 'client_email'],   own_enrolment, 'false'),
    ('user_profiles',                      ARRAY['id'],                        'public.client_can_read_profile(id)', 'id = auth.uid()'),
    ('error_logs',                         ARRAY['user_id'],                   'user_id = auth.uid()', 'user_id IS NULL OR user_id = auth.uid()'),
    ('data_subject_requests',              ARRAY['user_id'],                   'user_id = auth.uid()', 'user_id = auth.uid()'),
    ('user_favorites',                     ARRAY['user_id'],                   'user_id = auth.uid()', 'user_id = auth.uid()'),
    ('feature_flags',                      ARRAY['company_id'],                'company_id IS NULL', 'false')
  ) v(tbl, cols, read_expr, write_expr)
  LOOP
    CONTINUE WHEN to_regclass('public.' || a.tbl) IS NULL;
    SELECT count(*) = cardinality(a.cols) INTO ok
      FROM pg_attribute
     WHERE attrelid = to_regclass('public.' || a.tbl) AND attname = ANY (a.cols)
       AND attnum > 0 AND NOT attisdropped;

    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary ON public.%I', a.tbl);
    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary_select ON public.%I', a.tbl);
    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary_insert ON public.%I', a.tbl);
    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary_update ON public.%I', a.tbl);
    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary_delete ON public.%I', a.tbl);

    IF NOT ok THEN
      RAISE NOTICE 'client_portal allowlist: %.% is missing one of %; denying it to client_portal instead',
        'public', a.tbl, a.cols;
      CONTINUE;
    END IF;

    EXECUTE format(
      'CREATE POLICY client_portal_boundary_select ON public.%I AS RESTRICTIVE FOR SELECT TO authenticated
         USING (%s OR (%s))', a.tbl, gate, a.read_expr);
    EXECUTE format(
      'CREATE POLICY client_portal_boundary_insert ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated
         WITH CHECK (%s OR (%s))', a.tbl, gate, a.write_expr);
    EXECUTE format(
      'CREATE POLICY client_portal_boundary_update ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated
         USING (%s OR ((%s) AND (%s))) WITH CHECK (%s OR (%s))',
      a.tbl, gate, a.read_expr, a.write_expr, gate, a.write_expr);
    EXECUTE format(
      'CREATE POLICY client_portal_boundary_delete ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated
         USING (%s OR ((%s) AND (%s)))', a.tbl, gate, a.read_expr, a.write_expr);
  END LOOP;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Deny every other tenant table to client_portal. A table counts as
--    allowlisted only if section 2 actually created its policies.
-- ---------------------------------------------------------------------------
DO $$
DECLARE
  t record;
BEGIN
  FOR t IN
    SELECT c.relname
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
     WHERE n.nspname = 'public' AND c.relkind IN ('r', 'p') AND c.relrowsecurity
       AND EXISTS (SELECT 1 FROM pg_attribute att
                    WHERE att.attrelid = c.oid AND att.attname IN ('company_id', 'project_id')
                      AND att.attnum > 0 AND NOT att.attisdropped)
       AND NOT EXISTS (SELECT 1 FROM pg_policy p
                        WHERE p.polrelid = c.oid AND p.polname = 'client_portal_boundary_select')
     ORDER BY c.relname
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS client_portal_boundary ON public.%I', t.relname);
    EXECUTE format(
      'CREATE POLICY client_portal_boundary ON public.%I AS RESTRICTIVE FOR ALL TO authenticated
         USING ((SELECT NOT public.caller_is_client_portal()))
         WITH CHECK ((SELECT NOT public.caller_is_client_portal()))', t.relname);
  END LOOP;
END $$;
