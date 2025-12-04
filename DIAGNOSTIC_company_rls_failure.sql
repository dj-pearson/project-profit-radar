-- =====================================================
-- DIAGNOSTIC: Debug company creation RLS failure
-- =====================================================
-- This script will test each part of the RLS chain to find the exact failure point
-- Run this in Supabase SQL Editor
-- =====================================================

-- First, let's see what policies exist
DO $$
DECLARE
  v_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 1: CHECK SITES TABLE POLICIES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR v_record IN 
    SELECT policyname, cmd, roles::text, qual::text as using_clause, with_check::text
    FROM pg_policies 
    WHERE tablename = 'sites'
  LOOP
    RAISE NOTICE 'Policy: %', v_record.policyname;
    RAISE NOTICE '  Command: %', v_record.cmd;
    RAISE NOTICE '  Roles: %', v_record.roles;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- Check companies table policies
DO $$
DECLARE
  v_record RECORD;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 2: CHECK COMPANIES TABLE POLICIES';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  FOR v_record IN 
    SELECT policyname, cmd, roles::text, qual::text as using_clause, with_check::text
    FROM pg_policies 
    WHERE tablename = 'companies'
  LOOP
    RAISE NOTICE 'Policy: %', v_record.policyname;
    RAISE NOTICE '  Command: %', v_record.cmd;
    RAISE NOTICE '  Roles: %', v_record.roles;
    RAISE NOTICE '';
  END LOOP;
END $$;

-- Check if is_valid_site function exists
DO $$
DECLARE
  v_function_exists BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 3: CHECK is_valid_site() FUNCTION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  SELECT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public'
    AND p.proname = 'is_valid_site'
  ) INTO v_function_exists;
  
  IF v_function_exists THEN
    RAISE NOTICE '✓ is_valid_site() function EXISTS';
  ELSE
    RAISE NOTICE '✗ is_valid_site() function DOES NOT EXIST';
  END IF;
  RAISE NOTICE '';
END $$;

-- Test the is_valid_site function with BuildDesk site_id
DO $$
DECLARE
  v_builddesk_site_id UUID;
  v_is_valid BOOLEAN;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 4: TEST is_valid_site() FUNCTION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  -- Get BuildDesk site_id
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;
  
  IF v_builddesk_site_id IS NULL THEN
    RAISE NOTICE '✗ BuildDesk site not found!';
  ELSE
    RAISE NOTICE 'BuildDesk site_id: %', v_builddesk_site_id;
    
    -- Test the function
    BEGIN
      SELECT public.is_valid_site(v_builddesk_site_id) INTO v_is_valid;
      RAISE NOTICE '✓ is_valid_site() returned: %', v_is_valid;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE '✗ is_valid_site() FAILED: %', SQLERRM;
    END;
  END IF;
  RAISE NOTICE '';
END $$;

-- Check current_site_id() function
DO $$
DECLARE
  v_current_site_id UUID;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 5: TEST current_site_id() FUNCTION';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  BEGIN
    SELECT public.current_site_id() INTO v_current_site_id;
    IF v_current_site_id IS NULL THEN
      RAISE NOTICE '⚠ current_site_id() returned NULL (expected for migration script)';
    ELSE
      RAISE NOTICE '✓ current_site_id() returned: %', v_current_site_id;
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ current_site_id() FAILED: %', SQLERRM;
  END;
  RAISE NOTICE '';
END $$;

-- Show the exact WITH CHECK clause for company INSERT
DO $$
DECLARE
  v_with_check TEXT;
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'STEP 6: SHOW COMPANY INSERT POLICY DETAILS';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  
  SELECT with_check INTO v_with_check
  FROM pg_policies
  WHERE tablename = 'companies'
  AND cmd = 'INSERT'
  LIMIT 1;
  
  IF v_with_check IS NOT NULL THEN
    RAISE NOTICE 'WITH CHECK clause:';
    RAISE NOTICE '%', v_with_check;
  ELSE
    RAISE NOTICE '✗ No INSERT policy found for companies table!';
  END IF;
  RAISE NOTICE '';
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'DIAGNOSTIC COMPLETE';
  RAISE NOTICE '========================================';
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Review the policy details above';
  RAISE NOTICE '2. Check if sites table is readable by authenticated users';
  RAISE NOTICE '3. Verify is_valid_site() function works';
  RAISE NOTICE '4. Check the WITH CHECK clause matches expected logic';
  RAISE NOTICE '';
END $$;

