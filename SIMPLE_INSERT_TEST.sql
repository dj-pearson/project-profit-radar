-- =====================================================
-- SIMPLE TEST: Can YOU create a company right now?
-- =====================================================
-- This is the simplest possible test
-- Run this in Supabase SQL Editor while logged in
-- =====================================================

-- This will attempt to create a test company
-- If it works, the problem is with the FRONTEND, not the database
-- If it fails, the problem is with the DATABASE/RLS

DO $$
DECLARE
  v_site_id UUID;
  v_company_id UUID;
BEGIN
  -- Get BuildDesk site
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk';
  
  RAISE NOTICE '========================================';
  RAISE NOTICE 'SIMPLE INSERT TEST';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'User: %', auth.uid();
  RAISE NOTICE 'Site: %', v_site_id;
  RAISE NOTICE '';
  RAISE NOTICE 'Attempting INSERT...';
  
  -- Try to insert
  INSERT INTO companies (
    name,
    site_id,
    industry_type
  ) VALUES (
    'TEST - DELETE ME',
    v_site_id,
    'residential'
  )
  RETURNING id INTO v_company_id;
  
  RAISE NOTICE '✓✓✓ SUCCESS! Company ID: %', v_company_id;
  
  -- Clean up
  DELETE FROM companies WHERE id = v_company_id;
  RAISE NOTICE '✓ Cleanup done';
  RAISE NOTICE '';
  RAISE NOTICE '=== CONCLUSION ===';
  RAISE NOTICE 'Database RLS is working correctly!';
  RAISE NOTICE 'The problem is with the FRONTEND.';
  RAISE NOTICE 'Check:';
  RAISE NOTICE '  1. Is siteId NULL in the frontend?';
  RAISE NOTICE '  2. Is the user actually authenticated?';
  RAISE NOTICE '  3. Is the JWT token valid?';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE '✗✗✗ FAILED: %', SQLERRM;
  RAISE NOTICE '';
  RAISE NOTICE '=== CONCLUSION ===';
  RAISE NOTICE 'Database RLS is BLOCKING the insert.';
  RAISE NOTICE 'Error: %', SQLERRM;
  RAISE NOTICE 'SQLSTATE: %', SQLSTATE;
END $$;

