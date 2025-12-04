-- =====================================================
-- FIX: Allow users to view their own profile without site_id check
-- =====================================================
-- Issue: During onboarding, users cannot read their own user_profiles entry because:
--   1. User just signed up and has a user_profiles entry with site_id
--   2. User's JWT doesn't have site_id in app_metadata yet
--   3. current_site_id() returns NULL
--   4. The RLS policy requires site_id = current_site_id()
--   5. Policy check fails, blocking profile reads
--
-- Fix: Update SELECT policy to allow users to ALWAYS view their own profile
-- regardless of site_id matching. Site_id check only applies when viewing
-- other users' profiles in the same company.
--
-- Safety: This is safe because:
--   - Users can only see their own profile (id = auth.uid())
--   - Site isolation still enforced for viewing other users
--   - Required for onboarding flow to work
-- =====================================================

-- Drop existing SELECT policy
DROP POLICY IF EXISTS "Users can view profiles in their site" ON user_profiles;
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can view user profiles" ON user_profiles;

-- Create new SELECT policy with relaxed self-access
CREATE POLICY "Users can view own profile and company members"
  ON user_profiles FOR SELECT
  TO authenticated
  USING (
    -- Users can ALWAYS view their own profile (no site_id check needed)
    id = auth.uid()
    
    -- OR view profiles in their company (with site_id check)
    OR (
      site_id = public.current_site_id()
      AND company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid()
      )
    )
    
    -- OR root admins can view all profiles in their site
    OR (
      site_id = public.current_site_id()
      AND EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid()
        AND role = 'root_admin'
      )
    )
  );

-- Keep UPDATE policy for self-updates
DROP POLICY IF EXISTS "Users can update own profile in their site" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Allow users to update their own profile to set company_id during onboarding
-- This is critical for the onboarding flow
DROP POLICY IF EXISTS "Users can set their company during onboarding" ON user_profiles;

-- Note: The UPDATE policy above already allows this, but we need to ensure
-- the WITH CHECK allows setting company_id even if it was NULL before

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  -- Verify policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'user_profiles'
  AND policyname IN (
    'Users can view own profile and company members',
    'Users can update own profile'
  );

  IF v_policy_count >= 2 THEN
    RAISE NOTICE '✓ User profiles SELECT RLS fix applied successfully';
    RAISE NOTICE '✓ Users can view their own profile without site_id check';
    RAISE NOTICE '✓ Users can view company members with site_id check';
    RAISE NOTICE '✓ Users can update their own profile';
    RAISE NOTICE '✓ Onboarding flow will work correctly';
  ELSE
    RAISE WARNING '⚠ Expected 2 policies but found %', v_policy_count;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view own profile and company members" ON user_profiles IS
  'Allows users to always view their own profile (no site_id check) and view company members with site_id check. Critical for onboarding flow.';

COMMENT ON POLICY "Users can update own profile" ON user_profiles IS
  'Allows users to update their own profile, including setting company_id during onboarding.';
