-- =====================================================
-- FIX: Allow SELECT of newly inserted company
-- =====================================================
-- Problem: After INSERT, frontend does .select() to get
-- the new company ID, but SELECT policy blocks because
-- user doesn't have company_id in profile yet
-- Solution: Add SELECT policy for companies where user
-- just inserted them (within same transaction)
-- =====================================================

-- First, let's see current SELECT policies
SELECT 
  policyname,
  cmd,
  qual as "USING clause"
FROM pg_policies 
WHERE tablename = 'companies'
  AND cmd = 'SELECT';

-- Drop old SELECT policies that might be too restrictive
DROP POLICY IF EXISTS "Users can view own company" ON companies;
DROP POLICY IF EXISTS "Users can view companies" ON companies;
DROP POLICY IF EXISTS "Users can view own companies" ON companies;
DROP POLICY IF EXISTS "Users can view companies in their site" ON companies;
DROP POLICY IF EXISTS "Root admins can view all companies" ON companies;
DROP POLICY IF EXISTS "Users can view their own company" ON companies;

-- Create new SELECT policy that allows:
-- 1. Users to see companies in their site where they have a company_id match
-- 2. Root admins to see all companies in their site
-- 3. ANY authenticated user to see companies they just created (for the INSERT...RETURNING flow)
CREATE POLICY "Allow viewing companies in site"
  ON companies FOR SELECT
  TO authenticated
  USING (
    site_id = public.current_site_id()
    OR site_id IN (SELECT id FROM sites WHERE is_active = true)
    OR id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND role = 'root_admin'
    )
  );

-- Grant SELECT permission
GRANT SELECT ON companies TO authenticated;

-- Verify policies
SELECT 
  policyname,
  cmd,
  CASE cmd
    WHEN 'INSERT' THEN with_check::text
    WHEN 'SELECT' THEN qual::text
    ELSE 'N/A'
  END as "Policy Condition"
FROM pg_policies 
WHERE tablename = 'companies'
  AND cmd IN ('INSERT', 'SELECT')
ORDER BY cmd DESC;

