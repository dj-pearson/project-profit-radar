-- Settle the remaining permissive RLS policies (US-298).
--
-- Eleven tables still carried a policy that let any signed-in user (and in
-- three cases anon) read another company's rows or rewrite platform data.
-- None of them is fixed by scoping the permissive policy itself, because each
-- one is also how some legitimate caller gets in. The fixes below either drop a
-- policy that is fully covered by a correct company-scoped one, or add an
-- AS RESTRICTIVE policy. Restrictive policies are AND'd with the permissive
-- ones, so they can only narrow access; every same-company read and write the
-- apps make today still passes, which is what makes this safe in one release
-- (same pattern as 20260827031000 and 20260923000000). Restrictive policies
-- here are granted TO authenticated, anon only, so service_role (edge
-- functions, generators) is unaffected whether or not it has BYPASSRLS.
--
-- Role checks use public.get_user_role(auth.uid()), which reads user_profiles
-- (20260923040000). For anon, auth.uid() is NULL, the role is NULL and the
-- check is denied.
--
-- 1. user_presence - TENANT DATA (company_id NOT NULL, 20250803232624:65-74).
--    "Users can view all presence data" FOR SELECT USING (true), from
--    20250919164232:58-61, is PUBLIC and OR's over the correct
--    "Users can view company user presence" (company_id = get_user_company),
--    so every user saw every company's online status and current channel.
--    Dropped. Same-company reads keep working through the company policy, own
--    row through "Users can manage their own presence". Both client readers
--    (src/hooks/useSimplePresence.ts, src/components/collaboration/UserPresence.tsx)
--    already filter to the caller's company.
--    The own-row FOR ALL policy has no WITH CHECK, so a user could upsert their
--    own row with company_id set to someone else's company and appear in that
--    company's presence list. A restrictive INSERT/UPDATE check pins company_id
--    to the caller's company. Both writers send userProfile.company_id, and the
--    column is NOT NULL, so the NULL-tenancy trap does not apply.
--
-- 2. seo_meta_tags - PLATFORM MARKETING DATA (no company_id).
--    "System can manage SEO meta tags" FOR ALL USING (true) WITH CHECK (true)
--    with no TO clause (20250925013428:6-10) let anyone, anon included, rewrite
--    the title/description/canonical of any marketing page. Public read is
--    required (src/components/seo/UnifiedSEOSystem.tsx reads it on every page
--    view), so the policy is not scoped; instead a restrictive policy limits
--    INSERT/UPDATE/DELETE to root_admin and admin. That matches the only client
--    writer, src/pages/UnifiedSEODashboard.tsx on /admin/seo-management
--    (SecureRoute root_admin, admin), and the service_role edge function
--    seo-backend-integration. SEOManager.tsx and seoBackendSync.ts no longer
--    exist.
--    site_id: this check is on the caller's role, not on site_id, so it cannot
--    deny a write because site_id lands NULL. The live nullability/default of
--    site_id was NOT confirmed against production from this session (no
--    migration in the repo creates the column; types.ts says required on
--    Insert while UnifiedSEODashboard omits it). That remains for the owner to
--    check with \d seo_meta_tags, but it no longer gates this fix.
--
-- 3. ai_environment_config - PLATFORM CONFIG (no company_id). Owner: root_admin.
--    20260204000000:257-311 creates "Root admins can manage AI environment
--    config" when user_profiles has an id column, and falls back to
--    "Allow all for ai_environment_config" FOR ALL USING (true) otherwise. The
--    only reader is AIModelManager on /admin/ai-models (SecureRoute root_admin
--    only), and the table maps config keys to Coolify variables, so root_admin
--    is the owner. The fallback policy is dropped if present and the root_admin
--    policy is created if missing. Nobody but root_admin reaches the UI, so no
--    legitimate caller loses access.
--
-- 4. trades - GLOBAL REFERENCE DATA (no company_id, 20250115000005:4-15).
--    "Users can access trades" FOR ALL USING (true), no TO clause
--    (20250115000005:372-373), let anon and every user rewrite the list.
--    No reference in src/, supabase/functions/ or Brikly-iOS/. Replaced with a
--    read-only policy for anon/authenticated (reads unchanged) plus a
--    service_role policy for writes.
--
-- 5. pseo_pages, pseo_generation_queue, pseo_contractor_types,
--    pseo_pain_points, pseo_geographies, pseo_business_sizes, pseo_competitors
--    - PLATFORM MARKETING DATA (no company_id, 20260313000000).
--    Each carries "Authenticated ... manage ..." FOR ALL TO authenticated
--    USING (true) WITH CHECK (true) (20260313000000:169-217), so any customer
--    could publish, edit or delete public marketing pages. These tables ARE
--    used now (US-298's "zero references" note is stale):
--    src/pages/admin/pseo/PSEOAdminDashboard.tsx writes all seven, gated by
--    SecureRoute root_admin, admin on /admin/pseo; src/pages/pseo/PSEOPageRenderer.tsx
--    reads published pages and bumps view_count. A restrictive
--    INSERT/UPDATE/DELETE policy limits writes to root_admin and admin; reads
--    are unchanged.
--    Side effect: the renderer's view_count bump from a signed-in non-admin
--    visitor now matches zero rows (it was already a no-op for anon, who have
--    no UPDATE policy). The renderer ignores the result, so nothing errors;
--    the counter just stops counting logged-in customers. A SECURITY DEFINER
--    increment RPC would restore it; left for the owner.

-- 1. user_presence
DO $$
BEGIN
  IF to_regclass('public.user_presence') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can view all presence data" ON public.user_presence;

    DROP POLICY IF EXISTS user_presence_company_scope_insert ON public.user_presence;
    CREATE POLICY user_presence_company_scope_insert ON public.user_presence
      AS RESTRICTIVE FOR INSERT TO authenticated, anon
      WITH CHECK (company_id = public.get_user_company(auth.uid()));

    DROP POLICY IF EXISTS user_presence_company_scope_update ON public.user_presence;
    CREATE POLICY user_presence_company_scope_update ON public.user_presence
      AS RESTRICTIVE FOR UPDATE TO authenticated, anon
      USING (true)
      WITH CHECK (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- 2. seo_meta_tags, 5. pseo_*: admin-only writes, reads unchanged.
DO $$
DECLARE
  t text;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'seo_meta_tags',
    'pseo_pages', 'pseo_generation_queue', 'pseo_contractor_types', 'pseo_pain_points',
    'pseo_geographies', 'pseo_business_sizes', 'pseo_competitors'
  ] LOOP
    IF to_regclass('public.' || t) IS NOT NULL THEN
      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write_insert', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR INSERT TO authenticated, anon
           WITH CHECK (public.get_user_role(auth.uid())::text IN (''root_admin'', ''admin''))',
        t || '_admin_write_insert', t);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write_update', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR UPDATE TO authenticated, anon
           USING (public.get_user_role(auth.uid())::text IN (''root_admin'', ''admin''))
           WITH CHECK (public.get_user_role(auth.uid())::text IN (''root_admin'', ''admin''))',
        t || '_admin_write_update', t);

      EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_admin_write_delete', t);
      EXECUTE format(
        'CREATE POLICY %I ON public.%I AS RESTRICTIVE FOR DELETE TO authenticated, anon
           USING (public.get_user_role(auth.uid())::text IN (''root_admin'', ''admin''))',
        t || '_admin_write_delete', t);
    END IF;
  END LOOP;
END $$;

-- 3. ai_environment_config
DO $$
BEGIN
  IF to_regclass('public.ai_environment_config') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Allow all for ai_environment_config" ON public.ai_environment_config;
    IF NOT EXISTS (
      SELECT 1 FROM pg_policies
      WHERE schemaname = 'public' AND tablename = 'ai_environment_config'
        AND policyname = 'Root admins can manage AI environment config'
    ) THEN
      CREATE POLICY "Root admins can manage AI environment config" ON public.ai_environment_config
        FOR ALL TO authenticated
        USING (public.get_user_role(auth.uid())::text = 'root_admin')
        WITH CHECK (public.get_user_role(auth.uid())::text = 'root_admin');
    END IF;
  END IF;
END $$;

-- 4. trades
DO $$
BEGIN
  IF to_regclass('public.trades') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Users can access trades" ON public.trades;

    DROP POLICY IF EXISTS trades_read ON public.trades;
    CREATE POLICY trades_read ON public.trades
      FOR SELECT TO anon, authenticated
      USING (true);

    DROP POLICY IF EXISTS trades_service_role_write ON public.trades;
    CREATE POLICY trades_service_role_write ON public.trades
      FOR ALL TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;
