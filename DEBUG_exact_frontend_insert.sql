-- =====================================================
-- DEBUG: Simulate frontend company INSERT
-- =====================================================
-- This simulates EXACTLY what the Setup.tsx component does
-- Run this while authenticated as the test user
-- =====================================================

-- Step 1: Show current user context
SELECT 
  '=== STEP 1: Current User Context ===' as step,
  auth.uid() as user_id,
  auth.role() as auth_role,
  auth.jwt() -> 'role' as jwt_role;

-- Step 2: Show user profile
SELECT 
  '=== STEP 2: User Profile ===' as step,
  id,
  email,
  role,
  company_id,
  site_id
FROM user_profiles
WHERE id = auth.uid();

-- Step 3: Get BuildDesk site_id (what frontend gets from AuthContext)
SELECT 
  '=== STEP 3: BuildDesk Site ID ===' as step,
  id as site_id,
  key,
  domain,
  is_active
FROM sites
WHERE key = 'builddesk';

-- Step 4: Test is_valid_site with BuildDesk site_id
SELECT 
  '=== STEP 4: Test is_valid_site() ===' as step,
  public.is_valid_site((SELECT id FROM sites WHERE key = 'builddesk')) as is_valid;

-- Step 5: Show the WITH CHECK condition details
SELECT 
  '=== STEP 5: INSERT Policy WITH CHECK ===' as step,
  policyname,
  with_check
FROM pg_policies
WHERE tablename = 'companies' 
AND cmd = 'INSERT'
AND policyname = 'Authenticated users can create companies';

-- Step 6: Attempt actual INSERT (with EXPLAIN)
DO $$
DECLARE
  v_site_id UUID;
  v_user_id UUID;
  v_company_id UUID;
  v_site_valid BOOLEAN;
  v_error_detail TEXT;
  v_error_hint TEXT;
BEGIN
  RAISE NOTICE '=== STEP 6: Attempting INSERT ===';
  RAISE NOTICE '';
  
  -- Get context
  v_user_id := auth.uid();
  v_site_id := (SELECT id FROM sites WHERE key = 'builddesk');
  v_site_valid := public.is_valid_site(v_site_id);
  
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Site ID: %', v_site_id;
  RAISE NOTICE 'Site valid: %', v_site_valid;
  RAISE NOTICE '';
  
  IF v_user_id IS NULL THEN
    RAISE NOTICE '✗ ERROR: No authenticated user! You must run this while logged in.';
    RETURN;
  END IF;
  
  IF v_site_id IS NULL THEN
    RAISE NOTICE '✗ ERROR: BuildDesk site not found!';
    RETURN;
  END IF;
  
  IF NOT v_site_valid THEN
    RAISE NOTICE '✗ ERROR: is_valid_site() returned FALSE!';
    RETURN;
  END IF;
  
  -- Try INSERT
  RAISE NOTICE 'Attempting INSERT with:';
  RAISE NOTICE '  name: Test Company';
  RAISE NOTICE '  industry_type: residential';
  RAISE NOTICE '  site_id: %', v_site_id;
  RAISE NOTICE '  tenant_id: NULL';
  RAISE NOTICE '';
  
  BEGIN
    INSERT INTO companies (
      name,
      address,
      industry_type,
      company_size,
      annual_revenue_range,
      license_numbers,
      site_id,
      tenant_id
    ) VALUES (
      'TEST COMPANY - DELETE ME',
      '123 Test Street',
      'residential',
      '1-10',
      '<$1M',
      NULL,
      v_site_id,
      NULL
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✓✓✓ SUCCESS! Company created with ID: %', v_company_id;
    RAISE NOTICE '';
    RAISE NOTICE 'Cleaning up...';
    
    -- Cleanup
    DELETE FROM companies WHERE id = v_company_id;
    RAISE NOTICE '✓ Test company deleted';
    RAISE NOTICE '';
    RAISE NOTICE '=== RESULT: INSERT WORKS! ===';
    RAISE NOTICE 'The RLS policies are correct.';
    RAISE NOTICE 'The issue must be with the frontend or authentication.';
    
  EXCEPTION 
    WHEN insufficient_privilege THEN
      GET STACKED DIAGNOSTICS 
        v_error_detail = PG_EXCEPTION_DETAIL,
        v_error_hint = PG_EXCEPTION_HINT;
      RAISE NOTICE '✗ FAILED: Insufficient privilege (RLS blocked)';
      RAISE NOTICE '  Error: %', SQLERRM;
      RAISE NOTICE '  Detail: %', v_error_detail;
      RAISE NOTICE '  Hint: %', v_error_hint;
      RAISE NOTICE '';
      RAISE NOTICE '=== RESULT: RLS POLICY BLOCKING INSERT ===';
      
    WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS 
        v_error_detail = PG_EXCEPTION_DETAIL,
        v_error_hint = PG_EXCEPTION_HINT;
      RAISE NOTICE '✗ FAILED: %', SQLERRM;
      RAISE NOTICE '  SQLSTATE: %', SQLSTATE;
      RAISE NOTICE '  Detail: %', v_error_detail;
      RAISE NOTICE '  Hint: %', v_error_hint;
      RAISE NOTICE '';
      RAISE NOTICE '=== RESULT: OTHER ERROR (not RLS) ===';
  END;
  
END $$;

-- Step 7: Check for triggers that might block INSERT
SELECT 
  '=== STEP 7: Triggers on companies table ===' as step,
  trigger_name,
  event_manipulation,
  action_timing,
  action_statement
FROM information_schema.triggers
WHERE event_object_table = 'companies'
ORDER BY action_timing, event_manipulation;

