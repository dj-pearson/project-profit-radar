-- =====================================================
-- CHECK FOR RESTRICTIVE POLICIES
-- =====================================================
-- PERMISSIVE policies use OR logic (any can allow)
-- RESTRICTIVE policies use AND logic (all must allow)
-- If there's a RESTRICTIVE policy, it could block even
-- if the PERMISSIVE policy allows
-- =====================================================

-- Check for ANY restrictive policies on companies
SELECT 
  policyname,
  cmd,
  permissive as "Type (PERMISSIVE or RESTRICTIVE)",
  with_check
FROM pg_policies 
WHERE tablename = 'companies'
  AND permissive = 'RESTRICTIVE';

-- If any exist, they need to ALSO pass for INSERT to work
-- RESTRICTIVE policies are rare but powerful - they override PERMISSIVE

-- Check all policies with their type
SELECT 
  policyname,
  cmd,
  CASE 
    WHEN permissive = 'PERMISSIVE' THEN '✓ PERMISSIVE (uses OR logic)'
    WHEN permissive = 'RESTRICTIVE' THEN '⚠️ RESTRICTIVE (uses AND logic - must pass!)'
  END as policy_type,
  with_check
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY 
  CASE WHEN permissive = 'RESTRICTIVE' THEN 0 ELSE 1 END,
  cmd,
  policyname;

