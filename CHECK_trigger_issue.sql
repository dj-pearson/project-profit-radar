-- =====================================================
-- CHECK: auto_create_coa_for_company trigger
-- =====================================================
-- This trigger runs AFTER INSERT on companies
-- If it fails, the entire INSERT transaction will fail
-- =====================================================

-- Check if the function exists and what it does
SELECT 
  '=== Trigger Function Details ===' as info,
  p.proname as function_name,
  pg_get_functiondef(p.oid) as function_definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.proname = 'auto_create_coa_for_company';

-- Check what tables it might insert into
SELECT 
  '=== Chart of Accounts Table Check ===' as info,
  tablename,
  schemaname
FROM pg_tables
WHERE tablename LIKE '%chart%' OR tablename LIKE '%coa%' OR tablename LIKE '%account%'
ORDER BY tablename;

-- Disable the trigger temporarily to test if it's causing the issue
ALTER TABLE companies DISABLE TRIGGER trg_auto_create_coa;

-- Try a test insert with trigger disabled
DO $$
DECLARE
  v_site_id UUID;
  v_company_id UUID;
BEGIN
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'TEST: INSERT with trigger DISABLED';
  RAISE NOTICE '========================================';
  
  INSERT INTO companies (
    name,
    site_id,
    industry_type
  ) VALUES (
    'TEST TRIGGER DISABLED',
    v_site_id,
    'residential'
  )
  RETURNING id INTO v_company_id;
  
  RAISE NOTICE '✓ SUCCESS! Company ID: %', v_company_id;
  
  -- Clean up
  DELETE FROM companies WHERE id = v_company_id;
  RAISE NOTICE '✓ Cleanup done';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✗ FAILED even with trigger disabled: %', SQLERRM;
END $$;

-- Re-enable the trigger
ALTER TABLE companies ENABLE TRIGGER trg_auto_create_coa;

RAISE NOTICE '========================================';
RAISE NOTICE 'If the test succeeded, the trigger might be the issue.';
RAISE NOTICE 'Check the auto_create_coa_for_company() function for RLS issues.';
RAISE NOTICE '========================================';

