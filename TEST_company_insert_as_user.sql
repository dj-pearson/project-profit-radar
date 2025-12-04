-- =====================================================
-- SIMPLE TEST: Can authenticated users insert companies?
-- =====================================================
-- This simulates exactly what happens during onboarding
-- Run this in Supabase SQL Editor while logged in as a test user
-- =====================================================

-- Test 1: Can we read from sites table?
SELECT 
  'TEST 1: Reading sites table' as test,
  id, 
  key, 
  domain, 
  is_active
FROM sites 
WHERE key = 'builddesk';

-- Test 2: What does is_valid_site return?
SELECT 
  'TEST 2: is_valid_site() function' as test,
  public.is_valid_site((SELECT id FROM sites WHERE key = 'builddesk')) as result;

-- Test 3: What does current_site_id return?
SELECT 
  'TEST 3: current_site_id() function' as test,
  public.current_site_id() as result;

-- Test 4: What user am I?
SELECT 
  'TEST 4: Current user' as test,
  auth.uid() as user_id,
  auth.role() as user_role;

-- Test 5: Do I have a user_profile?
SELECT 
  'TEST 5: User profile' as test,
  id,
  email,
  role,
  company_id,
  site_id
FROM user_profiles 
WHERE id = auth.uid();

-- Test 6: List all INSERT policies on companies table
SELECT 
  'TEST 6: Companies INSERT policies' as test,
  policyname,
  roles::text,
  with_check::text
FROM pg_policies 
WHERE tablename = 'companies' 
AND cmd = 'INSERT';

-- Test 7: Try to insert a test company (will show the exact error)
-- IMPORTANT: This will actually try to insert, so we'll immediately delete it
DO $$
DECLARE
  v_site_id UUID;
  v_company_id UUID;
  v_error_message TEXT;
BEGIN
  -- Get BuildDesk site_id
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk' AND is_active = true;
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST 7: Attempting company INSERT';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Site ID: %', v_site_id;
  RAISE NOTICE 'User ID: %', auth.uid();
  RAISE NOTICE '';
  
  BEGIN
    -- Try to insert
    INSERT INTO companies (
      name,
      address,
      industry_type,
      site_id
    ) VALUES (
      'TEST COMPANY - DELETE ME',
      '123 Test Street',
      'residential',
      v_site_id
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✓ SUCCESS! Company created with ID: %', v_company_id;
    RAISE NOTICE '✓ Cleaning up test data...';
    
    -- Clean up
    DELETE FROM companies WHERE id = v_company_id;
    RAISE NOTICE '✓ Test company deleted';
    
  EXCEPTION WHEN OTHERS THEN
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE NOTICE '✗ FAILED! Error: %', v_error_message;
    RAISE NOTICE '✗ SQLSTATE: %', SQLSTATE;
  END;
  
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
END $$;

