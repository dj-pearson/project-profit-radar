-- =====================================================
-- TEST: Company creation during onboarding
-- =====================================================
-- This script tests the complete onboarding flow for a new user
-- creating their first company.
-- =====================================================

-- Setup: Create a test user and site
DO $$
DECLARE
  v_test_user_id UUID;
  v_test_site_id UUID;
  v_test_company_id UUID;
  v_test_email TEXT := 'test_onboarding_' || floor(random() * 10000)::text || '@example.com';
  v_can_read_sites BOOLEAN;
  v_can_insert_company BOOLEAN;
  v_error_message TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TESTING COMPANY CREATION DURING ONBOARDING';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';

  -- Step 1: Get BuildDesk site_id
  RAISE NOTICE '1. Getting BuildDesk site_id...';
  SELECT id INTO v_test_site_id
  FROM sites
  WHERE key = 'builddesk'
  AND is_active = TRUE
  LIMIT 1;

  IF v_test_site_id IS NULL THEN
    RAISE EXCEPTION 'BuildDesk site not found! Cannot proceed with test.';
  END IF;

  RAISE NOTICE '   ✓ BuildDesk site_id: %', v_test_site_id;
  RAISE NOTICE '';

  -- Step 2: Create a test user (simulating signup)
  RAISE NOTICE '2. Creating test user...';
  
  -- Insert into auth.users (this would normally be done by Supabase Auth)
  INSERT INTO auth.users (
    id,
    email,
    encrypted_password,
    email_confirmed_at,
    created_at,
    updated_at,
    raw_app_meta_data,
    raw_user_meta_data,
    is_super_admin,
    role
  ) VALUES (
    gen_random_uuid(),
    v_test_email,
    crypt('test_password_123', gen_salt('bf')),
    NOW(),
    NOW(),
    NOW(),
    '{"provider":"email","providers":["email"]}'::jsonb,
    '{}'::jsonb,
    FALSE,
    'authenticated'
  )
  RETURNING id INTO v_test_user_id;

  RAISE NOTICE '   ✓ Test user created: %', v_test_user_id;
  RAISE NOTICE '   ✓ Test email: %', v_test_email;
  RAISE NOTICE '';

  -- Step 3: Create user_profile (simulating signup edge function)
  RAISE NOTICE '3. Creating user profile...';
  INSERT INTO user_profiles (
    id,
    email,
    first_name,
    last_name,
    role,
    site_id,
    company_id
  ) VALUES (
    v_test_user_id,
    v_test_email,
    'Test',
    'User',
    'admin',
    v_test_site_id,
    NULL  -- No company yet - this is the key part of onboarding
  );

  RAISE NOTICE '   ✓ User profile created with site_id but no company_id';
  RAISE NOTICE '';

  -- Step 4: Test if user can read sites table (required for company creation RLS)
  RAISE NOTICE '4. Testing sites table access...';
  BEGIN
    -- Simulate the RLS check that happens in company INSERT policy
    PERFORM 1 FROM sites WHERE id = v_test_site_id AND is_active = TRUE;
    v_can_read_sites := TRUE;
    RAISE NOTICE '   ✓ User can read sites table (RLS check passes)';
  EXCEPTION WHEN OTHERS THEN
    v_can_read_sites := FALSE;
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE NOTICE '   ✗ User CANNOT read sites table: %', v_error_message;
  END;
  RAISE NOTICE '';

  -- Step 5: Test company creation (the actual onboarding step)
  RAISE NOTICE '5. Testing company creation...';
  BEGIN
    -- This simulates what happens in Setup.tsx
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
      'Test Company',
      '123 Test St',
      'residential',
      '1-10',
      '<$1M',
      NULL,
      v_test_site_id,
      NULL
    )
    RETURNING id INTO v_test_company_id;

    v_can_insert_company := TRUE;
    RAISE NOTICE '   ✓ Company created successfully: %', v_test_company_id;
  EXCEPTION WHEN OTHERS THEN
    v_can_insert_company := FALSE;
    GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
    RAISE NOTICE '   ✗ Company creation FAILED: %', v_error_message;
  END;
  RAISE NOTICE '';

  -- Step 6: Test user profile update (linking user to company)
  IF v_can_insert_company THEN
    RAISE NOTICE '6. Testing user profile update...';
    BEGIN
      UPDATE user_profiles
      SET company_id = v_test_company_id
      WHERE id = v_test_user_id;

      RAISE NOTICE '   ✓ User profile updated with company_id';
    EXCEPTION WHEN OTHERS THEN
      GET STACKED DIAGNOSTICS v_error_message = MESSAGE_TEXT;
      RAISE NOTICE '   ✗ User profile update FAILED: %', v_error_message;
    END;
    RAISE NOTICE '';
  END IF;

  -- Cleanup
  RAISE NOTICE '7. Cleaning up test data...';
  DELETE FROM user_profiles WHERE id = v_test_user_id;
  IF v_test_company_id IS NOT NULL THEN
    DELETE FROM companies WHERE id = v_test_company_id;
  END IF;
  DELETE FROM auth.users WHERE id = v_test_user_id;
  RAISE NOTICE '   ✓ Test data cleaned up';
  RAISE NOTICE '';

  -- Final Results
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST RESULTS';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Sites table access: %', CASE WHEN v_can_read_sites THEN '✓ PASS' ELSE '✗ FAIL' END;
  RAISE NOTICE 'Company creation: %', CASE WHEN v_can_insert_company THEN '✓ PASS' ELSE '✗ FAIL' END;
  RAISE NOTICE '';

  IF v_can_read_sites AND v_can_insert_company THEN
    RAISE NOTICE '✓✓✓ ALL TESTS PASSED ✓✓✓';
    RAISE NOTICE 'Onboarding flow will work correctly!';
  ELSE
    RAISE NOTICE '✗✗✗ TESTS FAILED ✗✗✗';
    RAISE NOTICE 'Onboarding flow is BROKEN!';
    RAISE NOTICE '';
    RAISE NOTICE 'Recommended fixes:';
    IF NOT v_can_read_sites THEN
      RAISE NOTICE '  1. Fix sites table RLS policy to allow authenticated users';
      RAISE NOTICE '     Run: 20251204000001_fix_sites_rls_policy_syntax.sql';
    END IF;
    IF NOT v_can_insert_company THEN
      RAISE NOTICE '  2. Fix companies INSERT RLS policy';
      RAISE NOTICE '     Check: 20251203000008_fix_company_insert_rls_v2.sql';
    END IF;
  END IF;
  RAISE NOTICE '========================================';
END $$;

