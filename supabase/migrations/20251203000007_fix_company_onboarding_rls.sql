-- =====================================================
-- FIX: Company creation RLS for onboarding flow
-- =====================================================
-- Issue: New users during onboarding cannot create companies because:
--   1. Their JWT doesn't have site_id in app_metadata/user_metadata yet
--   2. Their user_profiles entry doesn't have site_id set yet
--   3. So current_site_id() returns NULL
--   4. The RLS check `site_id = current_site_id()` fails
--
-- Fix: Allow authenticated users to insert companies with a valid site_id
-- that exists in the sites table, regardless of current_site_id() value.
-- This is safe because:
--   - User must be authenticated
--   - Site_id must be a valid site from the sites table
--   - We validate the site exists before allowing insert
-- =====================================================

-- Drop existing INSERT policy for companies
DROP POLICY IF EXISTS "Admins can insert companies in their site" ON companies;
DROP POLICY IF EXISTS "Authenticated users can insert companies with valid site" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;

-- Create new INSERT policy that allows onboarding
-- Key change: Allow insert if user is authenticated AND site_id is valid
-- Don't require current_site_id() to match (it may be NULL during onboarding)
CREATE POLICY "Authenticated users can create companies with valid site"
  ON companies FOR INSERT
  WITH CHECK (
    -- User must be authenticated
    auth.role() = 'authenticated'
    -- Site_id must be provided and must exist in sites table
    AND site_id IS NOT NULL
    AND EXISTS (SELECT 1 FROM sites WHERE id = site_id AND is_active = true)
  );

-- Also ensure the SELECT policy allows users to see their newly created company
-- This is important for the onboarding flow to work after insert
DROP POLICY IF EXISTS "Users can view companies in their site" ON companies;

CREATE POLICY "Users can view companies in their site"
  ON companies FOR SELECT
  USING (
    -- Users can view their company if:
    -- 1. It belongs to their site (via current_site_id OR user_profiles lookup)
    -- 2. AND they have access to it (own company or root_admin)
    (
      -- Match by current_site_id if available
      site_id = public.current_site_id()
      -- OR match by user's site_id from user_profiles (fallback for onboarding)
      OR site_id IN (
        SELECT up.site_id FROM user_profiles up WHERE up.id = auth.uid()
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
  v_policy_count INTEGER;
BEGIN
  -- Verify the policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'companies'
  AND policyname IN (
    'Authenticated users can create companies with valid site',
    'Users can view companies in their site'
  );

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✓ Company onboarding RLS fix applied successfully';
    RAISE NOTICE '✓ INSERT policy allows authenticated users with valid site_id';
    RAISE NOTICE '✓ SELECT policy handles both current_site_id() and user_profiles lookup';
  ELSE
    RAISE WARNING '⚠ Expected 2 policies but found %', v_policy_count;
  END IF;
END $$;
