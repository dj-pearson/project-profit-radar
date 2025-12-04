-- =====================================================
-- CHECK ALL RLS POLICIES FOR SETUP FLOW
-- =====================================================
-- This checks RLS for all tables touched during company setup
-- =====================================================

-- 1. Companies table (main INSERT)
SELECT 
  '=== COMPANIES TABLE POLICIES ===' as section,
  policyname,
  cmd,
  roles::text,
  with_check::text as condition
FROM pg_policies
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

-- 2. User_profiles table (UPDATE after company creation)
SELECT 
  '=== USER_PROFILES TABLE POLICIES ===' as section,
  policyname,
  cmd,
  roles::text,
  with_check::text as condition
FROM pg_policies
WHERE tablename = 'user_profiles'
ORDER BY cmd, policyname;

-- 3. Cost_codes table (INSERT default codes)
SELECT 
  '=== COST_CODES TABLE POLICIES ===' as section,
  policyname,
  cmd,
  roles::text,
  with_check::text as condition
FROM pg_policies
WHERE tablename = 'cost_codes'
ORDER BY cmd, policyname;

-- 4. Chart_of_accounts table (triggered INSERT)
SELECT 
  '=== CHART_OF_ACCOUNTS TABLE POLICIES ===' as section,
  policyname,
  cmd,
  roles::text,
  with_check::text as condition
FROM pg_policies
WHERE tablename = 'chart_of_accounts'
ORDER BY cmd, policyname;

-- 5. Check if tables have RLS enabled
SELECT 
  '=== RLS STATUS ===' as section,
  schemaname,
  tablename,
  CASE WHEN rowsecurity THEN '✓ ENABLED' ELSE '✗ DISABLED' END as rls_status
FROM pg_tables
WHERE tablename IN ('companies', 'user_profiles', 'cost_codes', 'chart_of_accounts')
ORDER BY tablename;

-- 6. Test actual INSERT permissions for current user
DO $$
DECLARE
  v_site_id UUID;
  v_test_result TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PERMISSION TESTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
  RAISE NOTICE 'Testing as user: %', auth.uid();
  RAISE NOTICE 'Site ID: %', v_site_id;
  RAISE NOTICE '';
  
  -- Test companies INSERT
  BEGIN
    PERFORM 1 FROM companies WHERE false; -- Just test SELECT permission
    INSERT INTO companies (name, site_id, industry_type) 
    VALUES ('TEST', v_site_id, 'residential')
    RETURNING id INTO v_site_id;
    DELETE FROM companies WHERE id = v_site_id;
    RAISE NOTICE '✓ Can INSERT into companies';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ CANNOT INSERT into companies: %', SQLERRM;
  END;
  
  -- Test user_profiles UPDATE
  BEGIN
    UPDATE user_profiles SET site_id = v_site_id WHERE id = auth.uid();
    RAISE NOTICE '✓ Can UPDATE user_profiles';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ CANNOT UPDATE user_profiles: %', SQLERRM;
  END;
  
  -- Test cost_codes INSERT
  BEGIN
    SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
    -- We need a company_id, so skip this test
    RAISE NOTICE '⊘ Skipping cost_codes test (needs company_id)';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ CANNOT INSERT into cost_codes: %', SQLERRM;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

