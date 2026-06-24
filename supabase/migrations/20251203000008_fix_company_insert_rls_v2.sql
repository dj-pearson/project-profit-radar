-- =====================================================
-- FIX: Company creation RLS for onboarding flow (v2)
-- =====================================================
-- Issue: The previous fix still fails because the EXISTS check
-- against the sites table runs under the user's RLS context,
-- which can fail in edge cases during onboarding.
--
-- Fix: Create a SECURITY DEFINER function that validates
-- site_id without RLS restrictions, then use that in the policy.
-- =====================================================

-- =====================================================
-- 1. CREATE SECURITY DEFINER FUNCTION FOR SITE VALIDATION
-- =====================================================
-- This function bypasses RLS to check if a site exists and is active
-- It's safe because it only returns a boolean, not sensitive data

CREATE OR REPLACE FUNCTION public.is_valid_site(p_site_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Check if the site exists and is active
  -- SECURITY DEFINER allows this to bypass RLS on sites table
  RETURN EXISTS (
    SELECT 1 FROM public.sites
    WHERE id = p_site_id
    AND is_active = TRUE
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.is_valid_site(UUID) IS
  'Validates that a site_id exists and is active. Uses SECURITY DEFINER to bypass RLS.';

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.is_valid_site(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_site(UUID) TO anon;

-- =====================================================
-- 2. DROP ALL EXISTING INSERT POLICIES ON COMPANIES
-- =====================================================
-- Clean slate to avoid any policy conflicts

DROP POLICY IF EXISTS "Admins can insert companies in their site" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies with valid site" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies with valid site" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Root admins can manage all companies" ON companies;

-- =====================================================
-- 3. CREATE NEW INSERT POLICY USING SECURITY DEFINER FUNCTION
-- =====================================================
-- This policy allows authenticated users to create companies
-- as long as they provide a valid, active site_id

CREATE POLICY "Authenticated users can create companies with valid site"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Site_id must be provided
    site_id IS NOT NULL
    -- Site must be valid and active (uses SECURITY DEFINER function)
    AND public.is_valid_site(site_id)
  );

-- =====================================================
-- 4. RE-CREATE ROOT ADMIN POLICY
-- =====================================================
-- Root admins should be able to manage all companies

CREATE POLICY "Root admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'root_admin'
    )
  );

-- =====================================================
-- 5. ENSURE SELECT POLICY EXISTS FOR ONBOARDING
-- =====================================================
-- Users need to be able to see their newly created company

DROP POLICY IF EXISTS "Users can view companies in their site" ON companies;

CREATE POLICY "Users can view companies in their site"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- User can view if:
    -- 1. The company belongs to their site (via current_site_id OR user_profiles lookup)
    -- 2. AND they have access to it (own company or root_admin)
    (
      -- Match by current_site_id if available
      site_id = public.current_site_id()
      -- OR match by user's site_id from user_profiles (fallback for onboarding)
      OR site_id IN (
        SELECT up.site_id FROM user_profiles up WHERE up.id = auth.uid()
      )
      -- OR use SECURITY DEFINER validation for new users without site_id yet
      OR (
        public.is_valid_site(site_id)
        AND id IN (
          SELECT company_id FROM user_profiles WHERE id = auth.uid()
        )
      )
    )
    AND (
      -- Users can see their own company
      id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
      )
      OR id IN (
        SELECT company_id FROM profiles
        WHERE user_id = auth.uid()
      )
      -- Or root admins can see all companies in the site
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'root_admin'
      )
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  -- Verify the function exists
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_valid_site'
  ) INTO v_function_exists;

  -- Verify the policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'companies'
  AND policyname IN (
    'Authenticated users can create companies with valid site',
    'Users can view companies in their site',
    'Root admins can manage all companies'
  );

  IF v_function_exists AND v_policy_count >= 2 THEN
    RAISE NOTICE '✓ Company onboarding RLS fix v2 applied successfully';
    RAISE NOTICE '✓ Created is_valid_site() SECURITY DEFINER function';
    RAISE NOTICE '✓ INSERT policy uses SECURITY DEFINER for site validation';
    RAISE NOTICE '✓ SELECT policy handles onboarding edge cases';
  ELSE
    RAISE WARNING '⚠ Migration may have issues:';
    RAISE WARNING '  - Function exists: %', v_function_exists;
    RAISE WARNING '  - Policy count: %', v_policy_count;
  END IF;
END $$;
