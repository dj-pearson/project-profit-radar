-- =====================================================
-- TEST SCRIPT: Verify Multi-Tenant RLS Architecture
-- =====================================================
-- Tests site isolation, RLS policies, and data access
-- Compatible with Supabase SQL Editor
-- =====================================================

-- TEST 1: Check sites configuration
SELECT 
  '=== TEST 1: Sites Configuration ===' as test_name;

SELECT 
  id, 
  key, 
  name, 
  domain,
  is_active,
  is_production
FROM sites 
WHERE key IN ('builddesk', 'stylist')
ORDER BY key;

-- Expected: Should show both BuildDesk and Stylist sites


-- TEST 2: Verify site_id columns exist on core tables
SELECT 
  '=== TEST 2: Site ID Columns ===' as test_name;

SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'site_id'
  AND table_name IN (
    'companies', 'user_profiles', 'projects', 'time_entries',
    'documents', 'invoices', 'expenses', 'estimates',
    'leads', 'listings', 'testimonials', 'subscriptions'
  )
ORDER BY table_name;

-- Expected: All listed tables should have site_id UUID column with NOT NULL


-- TEST 3: Check RLS is enabled on core tables
SELECT 
  '=== TEST 3: RLS Enabled ===' as test_name;

SELECT 
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'sites', 'companies', 'user_profiles', 'projects',
    'leads', 'listings', 'testimonials'
  )
ORDER BY tablename;

-- Expected: rls_enabled should be TRUE for all tables


-- TEST 4: Verify current_site_id() function exists
SELECT 
  '=== TEST 4: Helper Function ===' as test_name;

SELECT 
  proname as function_name,
  pronamespace::regnamespace as schema,
  prokind as kind,
  pg_get_function_result(oid) as return_type
FROM pg_proc
WHERE proname = 'current_site_id'
  AND pronamespace = 'public'::regnamespace;

-- Expected: Should return function 'current_site_id' returning UUID


-- TEST 5: Check companies RLS policies
SELECT 
  '=== TEST 5: Companies RLS Policies ===' as test_name;

SELECT 
  policyname,
  ARRAY_TO_STRING(roles, ', ') as roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_with_check
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

-- Expected: Policies should filter by site_id


-- TEST 6: Check user_profiles RLS policies
SELECT 
  '=== TEST 6: User Profiles RLS Policies ===' as test_name;

SELECT 
  policyname,
  ARRAY_TO_STRING(roles, ', ') as roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_using_clause
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- Expected: Policies should allow users to view own profile with site_id check


-- TEST 7: Verify site_id indexes exist
SELECT 
  '=== TEST 7: Site ID Indexes ===' as test_name;

SELECT 
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%site%'
ORDER BY tablename, indexname;

-- Expected: Should show indexes on site_id for major tables


-- TEST 8: Check data distribution across sites
SELECT 
  '=== TEST 8: Data Distribution by Site ===' as test_name;

WITH site_data AS (
  SELECT s.key as site_key, s.name as site_name,
    (SELECT COUNT(*) FROM companies c WHERE c.site_id = s.id) as companies_count,
    (SELECT COUNT(*) FROM user_profiles up WHERE up.site_id = s.id) as users_count,
    (SELECT COUNT(*) FROM projects p WHERE p.site_id = s.id) as projects_count
  FROM sites s
  WHERE s.is_active = TRUE
)
SELECT * FROM site_data
ORDER BY site_key;

-- Expected: BuildDesk should have data, Stylist should have 0 (new site)


-- TEST 9: Verify Stylist-specific tables have site_id
SELECT 
  '=== TEST 9: Stylist Tables ===' as test_name;

SELECT 
  table_name,
  column_name,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND column_name = 'site_id'
  AND table_name IN ('leads', 'listings', 'testimonials', 'subscriptions')
ORDER BY table_name;

-- Expected: All Stylist tables should have site_id NOT NULL


-- TEST 10: Check RLS on Stylist leads table
SELECT 
  '=== TEST 10: Leads RLS Policies ===' as test_name;

SELECT 
  policyname,
  ARRAY_TO_STRING(roles, ', ') as roles,
  cmd as command,
  CASE 
    WHEN qual IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_using_clause,
  CASE 
    WHEN with_check IS NOT NULL THEN 'YES' 
    ELSE 'NO' 
  END as has_with_check
FROM pg_policies
WHERE tablename = 'leads'
ORDER BY cmd, policyname;

-- Expected: Should show site isolation policies


-- TEST 11: Verify SEO tables have site_id (sample check)
SELECT 
  '=== TEST 11: SEO Tables Sample ===' as test_name;

SELECT 
  c.table_name,
  COUNT(*) as columns_with_site_id
FROM information_schema.columns c
JOIN information_schema.tables t 
  ON c.table_name = t.table_name 
  AND c.table_schema = t.table_schema
WHERE c.table_schema = 'public'
  AND c.table_name LIKE 'seo_%'
  AND t.table_type = 'BASE TABLE'  -- Filter out views
  AND c.column_name = 'site_id'
GROUP BY c.table_name
ORDER BY c.table_name
LIMIT 10;

-- Expected: SEO tables should have site_id column


-- TEST 12: Check auth.users for site_id in metadata
SELECT 
  '=== TEST 12: Users with Site ID ===' as test_name;

SELECT 
  email,
  CASE 
    WHEN raw_app_meta_data->>'site_id' IS NOT NULL THEN '✅ Has site_id'
    ELSE '❌ Missing site_id'
  END as site_id_status,
  raw_app_meta_data->>'site_id' as site_id_value,
  created_at
FROM auth.users
ORDER BY created_at DESC
LIMIT 5;

-- Expected: Users should have site_id in app_metadata


-- =====================================================
-- SUMMARY OF EXPECTED RESULTS
-- =====================================================
-- 
-- ✅ TEST 1: Both BuildDesk and Stylist sites should exist
-- ✅ TEST 2: All major tables should have site_id column
-- ✅ TEST 3: RLS should be enabled on all tenant tables
-- ✅ TEST 4: current_site_id() helper function should exist
-- ✅ TEST 5: Companies policies should filter by site_id
-- ✅ TEST 6: User profiles policies should enforce site isolation
-- ✅ TEST 7: Performance indexes should exist on site_id
-- ✅ TEST 8: BuildDesk should have data, Stylist should be empty
-- ✅ TEST 9: Stylist tables should have site_id
-- ✅ TEST 10: Leads table should have site isolation RLS
-- ✅ TEST 11: SEO tables should have site_id
-- ✅ TEST 12: Auth users should have site_id in metadata
-- 
-- If all tests pass, your multi-tenant architecture is working!
-- =====================================================

