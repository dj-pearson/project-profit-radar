-- =====================================================
-- TEST SCRIPT: Verify Onboarding RLS Fixes
-- =====================================================
-- This script tests the RLS policies to ensure new users can:
--   1. Resolve site_id before authentication
--   2. Read their own user_profiles entry
--   3. Create a company with site_id
--   4. Update their user_profiles with company_id
--
-- Usage:
--   psql <connection_string> -f test-onboarding-rls.sql
-- =====================================================

\echo '========================================'
\echo 'TEST 1: Anonymous can read active sites'
\echo '========================================'
SET ROLE anon;
SELECT 
  id, 
  key, 
  name, 
  domain,
  is_active
FROM sites 
WHERE key = 'builddesk';

\echo ''
\echo 'Expected: Should return 1 row with BuildDesk site'
\echo ''

\echo '========================================'
\echo 'TEST 2: Verify is_valid_site() function'
\echo '========================================'
RESET ROLE;
SELECT public.is_valid_site(id) as is_valid, key, name
FROM sites 
WHERE key = 'builddesk';

\echo ''
\echo 'Expected: Should return TRUE for BuildDesk'
\echo ''

\echo '========================================'
\echo 'TEST 3: Check user_profiles trigger'
\echo '========================================'
SELECT 
  tgname as trigger_name,
  tgenabled as enabled,
  proname as function_name
FROM pg_trigger t
JOIN pg_proc p ON t.tgfoid = p.oid
WHERE tgname = 'on_auth_user_created';

\echo ''
\echo 'Expected: Should show trigger exists and is enabled'
\echo ''

\echo '========================================'
\echo 'TEST 4: Check companies INSERT policy'
\echo '========================================'
SELECT 
  policyname,
  roles,
  cmd,
  qual IS NOT NULL as has_using,
  with_check IS NOT NULL as has_with_check
FROM pg_policies
WHERE tablename = 'companies'
AND cmd = 'INSERT'
ORDER BY policyname;

\echo ''
\echo 'Expected: Should show policy that allows authenticated users to insert with valid site_id'
\echo ''

\echo '========================================'
\echo 'TEST 5: Check user_profiles SELECT policy'
\echo '========================================'
SELECT 
  policyname,
  roles,
  cmd,
  qual IS NOT NULL as has_using
FROM pg_policies
WHERE tablename = 'user_profiles'
AND cmd = 'SELECT'
ORDER BY policyname;

\echo ''
\echo 'Expected: Should show policy that allows users to view own profile'
\echo ''

\echo '========================================'
\echo 'TEST 6: Simulate authenticated user creating company'
\echo '========================================'
-- Note: This test requires a real authenticated user UUID
-- Replace <test_user_uuid> and <builddesk_site_id> with actual values

\echo 'To manually test company creation:'
\echo '1. Sign up a test user'
\echo '2. Get their UUID from auth.users'
\echo '3. Get BuildDesk site_id from sites table'
\echo '4. Run this query as the authenticated user:'
\echo ''
\echo 'SET ROLE authenticated;'
\echo 'SET request.jwt.claim.sub = ''<user_uuid>'';'
\echo ''
\echo 'INSERT INTO companies ('
\echo '  name, site_id, industry_type, company_size, annual_revenue_range'
\echo ') VALUES ('
\echo '  ''Test Company'', ''<builddesk_site_id>'', ''residential'', ''1-10'', ''startup'''
\echo ') RETURNING id, name, site_id;'
\echo ''

\echo '========================================'
\echo 'TEST 7: Check site_id on existing tables'
\echo '========================================'
SELECT 
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
AND column_name = 'site_id'
AND table_name IN ('companies', 'user_profiles', 'projects', 'sites')
ORDER BY table_name;

\echo ''
\echo 'Expected: All listed tables should have site_id column'
\echo ''

\echo '========================================'
\echo 'TEST SUMMARY'
\echo '========================================'
\echo 'If all tests pass, onboarding should work:'
\echo '  ✓ Anonymous users can resolve site from domain'
\echo '  ✓ is_valid_site() function exists and works'
\echo '  ✓ New users get user_profiles entry automatically'
\echo '  ✓ Authenticated users can create companies'
\echo '  ✓ Users can read their own profile'
\echo '  ✓ Site isolation is enforced via site_id'
\echo ''
\echo 'Next steps:'
\echo '  1. Apply migrations if not already applied'
\echo '  2. Test signup flow in browser'
\echo '  3. Monitor Supabase logs for RLS violations'
\echo '  4. Check Sentry for frontend errors'
\echo ''
