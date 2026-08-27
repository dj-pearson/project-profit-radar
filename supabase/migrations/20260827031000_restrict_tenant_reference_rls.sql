-- Restrictive company scope for feature_announcements (US-237).
--
-- feature_announcements carries a "System can manage announcements" FOR ALL
-- USING (true) policy with no role restriction, and the app writes it directly
-- from src/components/announcements/FeatureAnnouncementSystem.tsx. Because
-- permissive policies are OR'd, that TRUE predicate means any authenticated
-- user can create or edit announcements for ANY company — and the publish path
-- there filters only by id:
--
--   .update({ status: 'published', ... }).eq('id', id)
--
-- so today any authenticated user can publish another company's announcement.
--
-- Same approach as 20260827023111: add a RESTRICTIVE policy rather than scope
-- the permissive one. Restrictive policies are AND'd, so a same-company write
-- still passes — nothing legitimate breaks and there is no mixed-client window
-- — while cross-company access is denied regardless of the permissive policy.
-- Granted TO authenticated, anon only, so service_role is unaffected whether or
-- not it carries BYPASSRLS.
--
-- The insert sets `company_id: userProfile?.company_id || null`. A NULL there
-- is a platform-wide announcement, and this policy allows it only for
-- root_admin, which is the intended author for one. A company user writing
-- their own company_id passes; a company user writing NULL or another company
-- is denied, both of which are correct.
--
-- NOT INCLUDED: seo_meta_tags. It has the same permissive policy and the same
-- exposure (any authenticated user can rewrite any site's metadata), but the
-- two writers — src/utils/seoBackendSync.ts and src/pages/admin/SEOManager.tsx
-- — never set site_id, while the generated types declare it required on Insert.
-- Either a default or trigger populates it, or those writes already fail, or
-- the types are stale (US-263). A restrictive check on site_id would deny the
-- write outright if the value lands NULL, and that cannot be settled without
-- looking at the live schema. Confirming it needs a real database; see US-298.

DO $$
BEGIN
  IF to_regclass('public.feature_announcements') IS NOT NULL THEN
    DROP POLICY IF EXISTS feature_announcements_client_company_scope ON public.feature_announcements;
    CREATE POLICY feature_announcements_client_company_scope ON public.feature_announcements
      AS RESTRICTIVE
      FOR ALL
      TO authenticated, anon
      USING (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid())::text = 'root_admin'
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid())::text = 'root_admin'
      );
    RAISE NOTICE 'US-237: added restrictive company scope to feature_announcements';
  END IF;
END $$;
