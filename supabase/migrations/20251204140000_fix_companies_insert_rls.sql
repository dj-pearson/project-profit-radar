-- =====================================================
-- FIX: Companies INSERT Policy for Setup Flow
-- =====================================================
-- Migration: 20251204140000
-- Purpose: Fix 403 error during company creation in setup flow
-- Problem: current_site_id() returns NULL during initial setup
--          because user doesn't have site_id in JWT yet
-- Solution: Allow INSERT if site_id matches any active site
-- =====================================================

-- Drop ALL existing INSERT policies to avoid conflicts
DROP POLICY IF EXISTS "Admins can insert companies in their site" ON companies;
DROP POLICY IF EXISTS "Authenticated users can create companies" ON companies;
DROP POLICY IF EXISTS "Allow authenticated users to create companies" ON companies;
DROP POLICY IF EXISTS "Users can create companies" ON companies;
DROP POLICY IF EXISTS "Allow company creation" ON companies;

-- Create a new INSERT policy that allows authenticated users to insert
-- companies with ANY valid site_id (for initial setup)
CREATE POLICY "Allow company creation for authenticated users"
  ON companies FOR INSERT
  TO authenticated
  WITH CHECK (
    -- Allow if site_id is provided and matches any active site
    -- This is safe because:
    -- 1. User must be authenticated
    -- 2. site_id must exist in sites table
    -- 3. site_id must be active
    -- 4. After company creation, other RLS policies restrict access
    site_id IN (SELECT id FROM sites WHERE is_active = true)
  );

-- Ensure necessary permissions are granted
GRANT INSERT ON companies TO authenticated;
GRANT SELECT ON sites TO authenticated;

-- Add helpful comment
COMMENT ON POLICY "Allow company creation for authenticated users" ON companies IS
  'Allows authenticated users to create companies during initial setup. Requires valid site_id from sites table.';

-- Verify the policy was created
DO $$
DECLARE
  policy_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies 
  WHERE tablename = 'companies' 
    AND cmd = 'INSERT'
    AND policyname = 'Allow company creation for authenticated users';
  
  IF policy_count = 1 THEN
    RAISE NOTICE '✓ Companies INSERT policy created successfully';
  ELSE
    RAISE EXCEPTION 'Failed to create companies INSERT policy';
  END IF;
END $$;

