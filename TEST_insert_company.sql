-- =====================================================
-- TEST: Can current user insert a company?
-- =====================================================
-- This will try to insert and show the exact error
-- =====================================================

DO $$
DECLARE
  v_site_id UUID;
  v_company_id UUID;
  v_user_id UUID;
BEGIN
  -- Get context
  v_user_id := auth.uid();
  v_site_id := (SELECT id FROM sites WHERE key = 'builddesk');
  
  RAISE NOTICE 'User ID: %', v_user_id;
  RAISE NOTICE 'Site ID: %', v_site_id;
  RAISE NOTICE 'User role from auth: %', auth.role();
  RAISE NOTICE '';
  RAISE NOTICE 'Attempting INSERT...';
  
  -- Try the insert
  INSERT INTO companies (
    name,
    site_id,
    industry_type
  ) VALUES (
    'TEST COMPANY',
    v_site_id,
    'residential'
  )
  RETURNING id INTO v_company_id;
  
  RAISE NOTICE 'SUCCESS! Company ID: %', v_company_id;
  
  -- Cleanup
  DELETE FROM companies WHERE id = v_company_id;
  RAISE NOTICE 'Cleaned up test company';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'FAILED!';
  RAISE NOTICE 'Error: %', SQLERRM;
  RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

