-- =====================================================
-- HOTFIX: Fix sites table RLS policy syntax error
-- =====================================================
-- This is a standalone fix for the 403 Forbidden error during company setup
-- Run this directly in Supabase SQL Editor
-- =====================================================

-- Drop existing policies with incorrect syntax
DROP POLICY IF EXISTS "Public can view active sites" ON sites;
DROP POLICY IF EXISTS "sites_public_read" ON sites;
DROP POLICY IF EXISTS "sites_authenticated_read" ON sites;
DROP POLICY IF EXISTS "Users can view active sites" ON sites;

-- Create policy with CORRECT syntax (comma-separated roles, not repeated TO)
CREATE POLICY "Public can view active sites"
  ON sites FOR SELECT
  TO anon, authenticated
  USING (is_active = TRUE);

-- Verify root admin policy exists
DROP POLICY IF EXISTS "Root admins can manage sites" ON sites;

CREATE POLICY "Root admins can manage sites"
  ON sites FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_profiles.id = auth.uid()
      AND user_profiles.role = 'root_admin'
    )
  );

-- =====================================================
-- VERIFICATION
-- =====================================================
DO $$
DECLARE
  v_policy_count INTEGER;
  v_policy_roles TEXT[];
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'VERIFYING SITES TABLE RLS POLICIES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Check policy count
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'sites'
  AND policyname IN ('Public can view active sites', 'Root admins can manage sites');

  -- Get the roles for the public policy
  SELECT roles INTO v_policy_roles
  FROM pg_policies
  WHERE tablename = 'sites'
  AND policyname = 'Public can view active sites';

  RAISE NOTICE 'Policy count: %', v_policy_count;
  RAISE NOTICE 'Public policy roles: %', v_policy_roles;
  RAISE NOTICE '';

  IF v_policy_count >= 2 AND v_policy_roles @> ARRAY['anon', 'authenticated'] THEN
    RAISE NOTICE '✓✓✓ HOTFIX SUCCESSFUL ✓✓✓';
    RAISE NOTICE '✓ Anonymous users can read active sites';
    RAISE NOTICE '✓ Authenticated users can read active sites';
    RAISE NOTICE '✓ Company creation will now work during onboarding';
  ELSE
    RAISE WARNING '✗✗✗ HOTFIX MAY HAVE FAILED ✗✗✗';
    RAISE WARNING '  - Policy count: %', v_policy_count;
    RAISE WARNING '  - Policy roles: %', v_policy_roles;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

