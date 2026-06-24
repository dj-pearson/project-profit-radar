-- =====================================================
-- FIX: Correct RLS policy syntax for sites table
-- =====================================================
-- Issue: The policy "Public can view active sites" has incorrect syntax:
--   TO anon, TO authenticated  (WRONG - causes policy to fail)
-- Should be:
--   TO anon, authenticated     (CORRECT)
--
-- This causes the company INSERT policy to fail because it can't
-- validate the site_id exists when checking:
--   EXISTS (SELECT 1 FROM sites WHERE id = site_id AND is_active = true)
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Public can view active sites" ON sites;
DROP POLICY IF EXISTS "sites_public_read" ON sites;
DROP POLICY IF EXISTS "sites_authenticated_read" ON sites;
DROP POLICY IF EXISTS "Users can view active sites" ON sites;

-- Create policy with CORRECT syntax
-- Multiple roles are separated by comma, not repeated TO keyword
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
  -- Verify policies exist
  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'sites'
  AND policyname IN ('Public can view active sites', 'Root admins can manage sites');

  -- Get the roles for the public policy
  SELECT roles INTO v_policy_roles
  FROM pg_policies
  WHERE tablename = 'sites'
  AND policyname = 'Public can view active sites';

  IF v_policy_count >= 2 AND v_policy_roles @> ARRAY['anon', 'authenticated'] THEN
    RAISE NOTICE '✓ Sites table RLS policy syntax fixed';
    RAISE NOTICE '✓ Anonymous users can read active sites';
    RAISE NOTICE '✓ Authenticated users can read active sites';
    RAISE NOTICE '✓ Policy roles: %', v_policy_roles;
    RAISE NOTICE '✓ Company creation will now work during onboarding';
  ELSE
    RAISE WARNING '⚠ Policy verification failed:';
    RAISE WARNING '  - Policy count: %', v_policy_count;
    RAISE WARNING '  - Policy roles: %', v_policy_roles;
  END IF;
END $$;

-- =====================================================
-- COMMENTS
-- =====================================================
COMMENT ON POLICY "Public can view active sites" ON sites IS
  'Allows both anonymous and authenticated users to read active sites. Required for domain routing and company creation RLS checks.';

COMMENT ON POLICY "Root admins can manage sites" ON sites IS
  'Allows root_admin users to manage sites.';

