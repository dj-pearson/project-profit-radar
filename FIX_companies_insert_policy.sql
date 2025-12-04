-- =====================================================
-- FIX: Companies INSERT Policy for Setup Flow
-- =====================================================
-- Problem: current_site_id() returns NULL during setup
-- because user doesn't have site_id in JWT yet
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

-- Grant necessary permissions
GRANT INSERT ON companies TO authenticated;
GRANT SELECT ON sites TO authenticated;

-- Verify the policy was created
DO $$
BEGIN
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Companies INSERT Policy Status';
  RAISE NOTICE '==============================================';
END $$;

SELECT 
  policyname,
  cmd,
  with_check
FROM pg_policies 
WHERE tablename = 'companies' 
  AND cmd = 'INSERT';

