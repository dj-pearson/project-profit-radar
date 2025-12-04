-- =====================================================
-- COMPREHENSIVE 403 DIAGNOSTIC
-- =====================================================
-- This will check everything that could cause a 403
-- =====================================================

-- 1. Check if RLS is enabled on companies table
SELECT 
  schemaname,
  tablename,
  rowsecurity as "RLS Enabled"
FROM pg_tables 
WHERE tablename = 'companies';

-- 2. Check ALL policies on companies table (not just INSERT)
SELECT 
  policyname,
  cmd,
  permissive,
  roles,
  qual as "USING clause",
  with_check as "WITH CHECK clause"
FROM pg_policies 
WHERE tablename = 'companies'
ORDER BY cmd, policyname;

-- 3. Check table-level permissions
SELECT 
  grantee, 
  privilege_type
FROM information_schema.table_privileges 
WHERE table_name = 'companies'
  AND grantee = 'authenticated';

-- 4. Check if sites table has the builddesk site and if it's active
SELECT 
  id,
  key,
  name,
  is_active,
  is_production
FROM sites
WHERE key = 'builddesk';

-- 5. Check current user context
SELECT 
  auth.uid() as "Current User ID",
  auth.role() as "Current Role",
  current_user as "DB User";

-- 6. Check if user has a profile and what site_id they have
SELECT 
  id,
  email,
  role,
  site_id,
  company_id,
  tenant_id
FROM user_profiles 
WHERE id = auth.uid();

-- 7. Test the actual WITH CHECK condition
DO $$
DECLARE
  v_site_id UUID;
  v_site_exists BOOLEAN;
BEGIN
  -- Get builddesk site_id
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Site ID for builddesk: %', v_site_id;
  
  -- Test if this site_id would pass the WITH CHECK
  SELECT EXISTS(
    SELECT 1 FROM sites WHERE id = v_site_id AND is_active = true
  ) INTO v_site_exists;
  
  RAISE NOTICE 'Would builddesk site_id pass WITH CHECK? %', v_site_exists;
  RAISE NOTICE '==============================================';
END $$;

-- 8. Check for any triggers on companies table that might block INSERT
SELECT 
  trigger_name,
  event_manipulation,
  action_statement,
  action_timing
FROM information_schema.triggers
WHERE event_object_table = 'companies'
  AND event_manipulation = 'INSERT';

-- 9. Check for any CHECK constraints on companies table
SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'companies'::regclass
  AND contype = 'c';

-- 10. Try a test INSERT to see the exact error
DO $$
DECLARE
  v_site_id UUID;
  v_company_id UUID;
BEGIN
  -- Get builddesk site_id
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
  
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'ATTEMPTING TEST INSERT';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Using site_id: %', v_site_id;
  
  BEGIN
    INSERT INTO companies (
      name,
      site_id,
      industry_type
    ) VALUES (
      'TEST DIAGNOSTIC COMPANY',
      v_site_id,
      'residential'
    )
    RETURNING id INTO v_company_id;
    
    RAISE NOTICE '✓ SUCCESS! Company created with ID: %', v_company_id;
    
    -- Clean up
    DELETE FROM companies WHERE id = v_company_id;
    RAISE NOTICE '✓ Test company cleaned up';
    
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE '✗ FAILED!';
    RAISE NOTICE 'Error: %', SQLERRM;
    RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
  END;
  
  RAISE NOTICE '==============================================';
END $$;

