-- Fix multi-site JWT site_id casting so user_profiles RLS works
-- and BuildDesk (sites.key = 'builddesk') can be used reliably as the site context

-- 1) Recreate current_site_id() to safely extract site_id from JWT app_metadata
DROP FUNCTION IF EXISTS public.current_site_id() CASCADE;

CREATE OR REPLACE FUNCTION public.current_site_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  site_id_text text;
  site_id_uuid uuid;
BEGIN
  -- Use ->> to get plain text (no surrounding quotes)
  site_id_text := (auth.jwt() -> 'app_metadata' ->> 'site_id');

  IF site_id_text IS NULL OR site_id_text = '' THEN
    RETURN NULL;
  END IF;

  BEGIN
    site_id_uuid := site_id_text::uuid;
  EXCEPTION WHEN invalid_text_representation THEN
    -- If the claim is not a valid UUID, treat as no site_id
    RETURN NULL;
  END;

  RETURN site_id_uuid;
END;
$$;

-- 2) Recreate user_profiles RLS policies to use the safe JWT extraction pattern
DO $$
BEGIN
  -- Drop existing policies created in 20251128000005_fix_rls_infinite_recursion.sql
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_site_isolation'
  ) THEN
    DROP POLICY "user_profiles_site_isolation" ON public.user_profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_insert_with_site'
  ) THEN
    DROP POLICY "user_profiles_insert_with_site" ON public.user_profiles;
  END IF;

  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'user_profiles'
      AND policyname = 'user_profiles_update_own'
  ) THEN
    DROP POLICY "user_profiles_update_own" ON public.user_profiles;
  END IF;

  -- Allow authenticated users to see profiles in their site (or their own profile)
  CREATE POLICY "user_profiles_site_isolation"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
      -- site-scoped access: site_id must match JWT site_id when present
      (
        (auth.jwt() -> 'app_metadata' ->> 'site_id') IS NOT NULL
        AND site_id = (auth.jwt() -> 'app_metadata' ->> 'site_id')::uuid
      )
      OR id = auth.uid()
    );

  -- Allow users to update their own profile (no site_id cast here)
  CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());

  -- Allow inserts where site_id matches JWT site_id and id = auth.uid()
  CREATE POLICY "user_profiles_insert_with_site"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      (auth.jwt() -> 'app_metadata' ->> 'site_id') IS NOT NULL
      AND site_id = (auth.jwt() -> 'app_metadata' ->> 'site_id')::uuid
      AND id = auth.uid()
    );
END $$;

-- 3) Ensure sites RLS still uses the new helper safely
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "sites_public_read" ON public.sites;
CREATE POLICY "sites_public_read"
  ON public.sites
  FOR SELECT
  USING (is_active = true);

DROP POLICY IF EXISTS "sites_authenticated_read" ON public.sites;
CREATE POLICY "sites_authenticated_read"
  ON public.sites
  FOR SELECT
  TO authenticated
  USING (
    id = public.current_site_id()
    OR is_active = true
  );