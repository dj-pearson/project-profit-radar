-- =====================================================
-- SIMPLE DIAGNOSTIC: Show all company INSERT policies
-- =====================================================

-- Just the INSERT policies for companies
SELECT 
  policyname,
  cmd,
  roles::text,
  with_check::text as check_condition
FROM pg_policies
WHERE tablename = 'companies' 
AND cmd = 'INSERT';

