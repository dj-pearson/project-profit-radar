-- =====================================================
-- QUICK DIAGNOSTIC: What's blocking company INSERT?
-- =====================================================
-- Run this FIRST to see exactly what's wrong
-- =====================================================

-- Show all INSERT policies on companies
SELECT 
  '=== COMPANIES INSERT POLICIES ===' as section,
  policyname,
  roles::text as applies_to_roles,
  with_check::text as check_condition
FROM pg_policies
WHERE tablename = 'companies' AND cmd = 'INSERT'

UNION ALL

-- Show if is_valid_site exists
SELECT 
  '=== FUNCTIONS ===' as section,
  proname as policyname,
  'N/A' as applies_to_roles,
  prosecdef::text || ' (SECURITY DEFINER)' as check_condition
FROM pg_proc
WHERE proname = 'is_valid_site'

UNION ALL

-- Show sites table policies
SELECT 
  '=== SITES SELECT POLICIES ===' as section,
  policyname,
  roles::text as applies_to_roles,
  qual::text as check_condition
FROM pg_policies
WHERE tablename = 'sites' AND cmd = 'SELECT';

-- Test if we can read sites table
SELECT '=== TEST: Can read sites? ===' as test;
SELECT id, key, is_active FROM sites WHERE key = 'builddesk';

-- Test is_valid_site function
SELECT '=== TEST: is_valid_site() ===' as test;
SELECT public.is_valid_site((SELECT id FROM sites WHERE key = 'builddesk'));

