-- =====================================================
-- COMPREHENSIVE FIX: Company creation RLS for onboarding
-- =====================================================
-- This fixes the 403 Forbidden error during company setup
-- Run this in Supabase SQL Editor
-- =====================================================

-- Step 1: Ensure is_valid_site() function exists with SECURITY DEFINER
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

-- Grant execute to authenticated and anon users
GRANT EXECUTE ON FUNCTION public.is_valid_site(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_valid_site(UUID) TO anon;

-- Step 2: Fix sites table RLS to allow reading
DROP POLICY IF EXISTS "Public can view active sites" ON sites;
DROP POLICY IF EXISTS "sites_public_read" ON sites;
DROP POLICY IF EXISTS "sites_authenticated_read" ON sites;
DROP POLICY IF EXISTS "Users can view active sites" ON sites;

CREATE POLICY "Public can view active sites"
  ON sites FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Step 3: Drop ALL existing INSERT policies on companies
DO $$
DECLARE
  v_policy RECORD;
BEGIN
  FOR v_policy IN 
    SELECT policyname 
    FROM pg_policies 
    WHERE tablename = 'companies' 
    AND cmd = 'INSERT'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON companies', v_policy.policyname);
    RAISE NOTICE 'Dropped policy: %', v_policy.policyname;
  END LOOP;
END $$;

-- Step 4: Create a single, clear INSERT policy
CREATE POLICY "Authenticated users can create companies"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Site_id must be provided and valid
    site_id IS NOT NULL
    AND public.is_valid_site(site_id)
  );

-- Step 5: Ensure SELECT policy allows users to see their newly created company
DROP POLICY IF EXISTS "Users can view companies in their site" ON companies;

CREATE POLICY "Users can view their companies"
  ON companies FOR SELECT
  TO authenticated
  USING (
    -- User can view companies where they belong (via user_profiles)
    id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND company_id IS NOT NULL
    )
    -- OR root admins can view all companies
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'root_admin'
    )
  );

-- Step 6: Ensure root admin policy exists
DROP POLICY IF EXISTS "Root admins can manage all companies" ON companies;

CREATE POLICY "Root admins can manage all companies"
  ON companies FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'root_admin'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_function_exists BOOLEAN;
  v_insert_policy_count INTEGER;
  v_select_policy_count INTEGER;
  v_sites_policy_count INTEGER;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFICATION RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check function
  SELECT EXISTS (
    SELECT 1 FROM pg_proc
    WHERE proname = 'is_valid_site'
  ) INTO v_function_exists;

  -- Check policies
  SELECT COUNT(*) INTO v_insert_policy_count
  FROM pg_policies
  WHERE tablename = 'companies' AND cmd = 'INSERT';

  SELECT COUNT(*) INTO v_select_policy_count
  FROM pg_policies
  WHERE tablename = 'companies' AND cmd = 'SELECT';

  SELECT COUNT(*) INTO v_sites_policy_count
  FROM pg_policies
  WHERE tablename = 'sites' AND policyname = 'Public can view active sites';

  -- Report
  RAISE NOTICE 'is_valid_site() function: %', CASE WHEN v_function_exists THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE 'Companies INSERT policies: % (expected: 1-2)', v_insert_policy_count;
  RAISE NOTICE 'Companies SELECT policies: % (expected: 1-2)', v_select_policy_count;
  RAISE NOTICE 'Sites public policy: %', CASE WHEN v_sites_policy_count > 0 THEN '✓ EXISTS' ELSE '✗ MISSING' END;
  RAISE NOTICE '';

  IF v_function_exists AND v_insert_policy_count > 0 AND v_sites_policy_count > 0 THEN
    RAISE NOTICE '✓✓✓ FIX APPLIED SUCCESSFULLY ✓✓✓';
    RAISE NOTICE '';
    RAISE NOTICE 'Company creation should now work!';
    RAISE NOTICE 'Try refreshing your browser and submitting the setup form again.';
  ELSE
    RAISE WARNING '⚠ Some components may be missing. Check the counts above.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

-- List all company policies for reference
SELECT 
  'Company Policies' as info,
  policyname,
  cmd,
  roles::text
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

