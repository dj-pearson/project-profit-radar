-- Migration: Fix RLS infinite recursion and allow public site access
-- This fixes the circular dependency in current_site_id() function

-- Step 1: Drop the problematic current_site_id() function
DROP FUNCTION IF EXISTS public.current_site_id() CASCADE;

-- Step 2: Create a simpler version that ONLY uses JWT (no user_profiles query)
-- Mark as SECURITY DEFINER to bypass RLS when needed
CREATE OR REPLACE FUNCTION public.current_site_id()
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  site_id_claim uuid;
BEGIN
  -- Try to get site_id from JWT claims
  site_id_claim := (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid;
  
  IF site_id_claim IS NOT NULL THEN
    RETURN site_id_claim;
  END IF;
  
  -- If no JWT site_id, return NULL (don't query user_profiles to avoid recursion)
  RETURN NULL;
END;
$$;

-- Step 3: Enable RLS on sites table
ALTER TABLE public.sites ENABLE ROW LEVEL SECURITY;

-- Step 4: Allow public read access to active sites (needed for initial site resolution)
DROP POLICY IF EXISTS "sites_public_read" ON public.sites;
CREATE POLICY "sites_public_read"
  ON public.sites
  FOR SELECT
  USING (is_active = true);

-- Step 5: Allow authenticated users to read their own site
DROP POLICY IF EXISTS "sites_authenticated_read" ON public.sites;
CREATE POLICY "sites_authenticated_read"
  ON public.sites
  FOR SELECT
  TO authenticated
  USING (
    id = public.current_site_id()
    OR is_active = true
  );

-- Step 6: Add a helper function to get site_id from user profile (when safe to call)
CREATE OR REPLACE FUNCTION public.get_user_site_id(user_uuid uuid)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
STABLE
AS $$
DECLARE
  user_site_id uuid;
BEGIN
  -- Bypass RLS by using SECURITY DEFINER
  SELECT site_id INTO user_site_id
  FROM public.user_profiles
  WHERE id = user_uuid
  LIMIT 1;
  
  RETURN user_site_id;
END;
$$;

-- Step 7: Grant execute permissions
GRANT EXECUTE ON FUNCTION public.current_site_id() TO authenticated, anon;
GRANT EXECUTE ON FUNCTION public.get_user_site_id(uuid) TO authenticated;

-- Step 8: Recreate RLS policies for user_profiles to avoid recursion
-- These policies should NOT call current_site_id() directly

DO $$ 
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "user_profiles_site_isolation" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_insert_with_site" ON public.user_profiles;
  DROP POLICY IF EXISTS "user_profiles_update_own" ON public.user_profiles;
  
  -- Allow users to see profiles in their site (using JWT directly)
  CREATE POLICY "user_profiles_site_isolation"
    ON public.user_profiles
    FOR SELECT
    TO authenticated
    USING (
      site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      OR id = auth.uid()
    );
  
  -- Allow users to update their own profile
  CREATE POLICY "user_profiles_update_own"
    ON public.user_profiles
    FOR UPDATE
    TO authenticated
    USING (id = auth.uid());
  
  -- Allow insert with site_id from JWT
  CREATE POLICY "user_profiles_insert_with_site"
    ON public.user_profiles
    FOR INSERT
    TO authenticated
    WITH CHECK (
      site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND id = auth.uid()
    );
END $$;

-- Step 9: Add comment explaining the architecture
COMMENT ON FUNCTION public.current_site_id() IS 
  'Returns site_id from JWT app_metadata. Does NOT query user_profiles to avoid RLS recursion.';

COMMENT ON FUNCTION public.get_user_site_id(uuid) IS 
  'Safely retrieves site_id from user_profiles using SECURITY DEFINER to bypass RLS. Use when you already have a user UUID and need their site_id.';


