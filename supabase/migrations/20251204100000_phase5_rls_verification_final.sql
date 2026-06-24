-- =====================================================
-- PHASE 5 RLS VERIFICATION - FINAL AUDIT
-- =====================================================
-- Migration: 20251204100000
-- Purpose: Final verification of RLS policies on all tenant tables
-- Date: 2025-12-04
-- Status: VERIFICATION ONLY - No schema changes
-- =====================================================

-- =====================================================
-- STEP 1: COMPREHENSIVE TABLE VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_table_name TEXT;
  v_has_rls BOOLEAN;
  v_has_site_id BOOLEAN;
  v_policy_count INTEGER;
  v_total_tables INTEGER := 0;
  v_compliant INTEGER := 0;
  v_critical INTEGER := 0;
  v_warning INTEGER := 0;

  -- All tables that should have RLS with site_id
  v_tenant_tables TEXT[] := ARRAY[
    -- User & Company Management
    'companies',
    'user_profiles',
    'tenants',
    'tenant_users',

    -- Project Management
    'projects',
    'project_templates',
    'tasks',
    'daily_reports',
    'daily_report_templates',
    'change_orders',

    -- Time & Attendance
    'time_entries',
    'timesheet_approvals',
    'crew_gps_checkins',

    -- Financial Core
    'financial_records',
    'invoices',
    'payments',
    'expenses',
    'expense_categories',
    'estimates',
    'estimate_templates',
    'estimate_line_items',

    -- Phase 5 Financial
    'material_forecasts',
    'supplier_catalog',
    'purchase_recommendations',
    'financial_snapshots',
    'kpi_metrics',
    'billing_automation_rules',
    'payment_reminders',

    -- Documents & Media
    'documents',
    'document_categories',
    'document_templates',
    'document_shares',
    'equipment_qr_codes',
    'equipment_scan_events',

    -- CRM & Sales
    'crm_contacts',
    'crm_leads',
    'crm_campaigns',
    'client_portal_access',
    'client_messages',

    -- Compliance & Security
    'audit_logs',
    'security_logs',
    'compliance_reports',
    'sso_configurations',
    'mfa_configurations',
    'permission_grants',

    -- Device Trust & Sessions
    'trusted_devices',
    'user_sessions',
    'mfa_devices',
    'sso_connections',

    -- Reports & Filters
    'custom_reports',
    'report_schedules',
    'report_history',
    'saved_filter_presets',

    -- API & Webhooks
    'api_keys',
    'webhook_endpoints',
    'integration_configurations',
    'api_request_logs',
    'webhook_delivery_logs',

    -- Communication
    'notifications',
    'email_templates',
    'sms_templates'
  ];
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║           PHASE 5 RLS VERIFICATION REPORT - 2025-12-04              ║';
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';
  RAISE NOTICE '┌────────────────────────────────┬─────────┬──────────┬──────────┬──────────┐';
  RAISE NOTICE '│ Table Name                     │ RLS     │ site_id  │ Policies │ Status   │';
  RAISE NOTICE '├────────────────────────────────┼─────────┼──────────┼──────────┼──────────┤';

  FOREACH v_table_name IN ARRAY v_tenant_tables LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_name = v_table_name AND table_schema = 'public'
    ) THEN
      CONTINUE;
    END IF;

    v_total_tables := v_total_tables + 1;

    -- Check RLS status
    SELECT t.rowsecurity INTO v_has_rls
    FROM pg_tables t
    WHERE t.tablename = v_table_name AND t.schemaname = 'public';

    -- Check site_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = v_table_name
      AND c.column_name = 'site_id'
      AND c.table_schema = 'public'
    ) INTO v_has_site_id;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies p
    WHERE p.tablename = v_table_name AND p.schemaname = 'public';

    -- Categorize and report
    IF v_has_rls AND v_has_site_id AND v_policy_count > 0 THEN
      v_compliant := v_compliant + 1;
      RAISE NOTICE '│ % │ ✓       │ ✓        │ %      │ OK       │',
        rpad(v_table_name, 30),
        lpad(v_policy_count::text, 8);
    ELSIF NOT v_has_rls THEN
      v_critical := v_critical + 1;
      RAISE NOTICE '│ % │ ✗       │ %        │ %      │ CRITICAL │',
        rpad(v_table_name, 30),
        CASE WHEN v_has_site_id THEN '✓' ELSE '✗' END,
        lpad(v_policy_count::text, 8);
    ELSIF NOT v_has_site_id THEN
      v_warning := v_warning + 1;
      RAISE NOTICE '│ % │ ✓       │ ✗        │ %      │ WARNING  │',
        rpad(v_table_name, 30),
        lpad(v_policy_count::text, 8);
    ELSIF v_policy_count = 0 THEN
      v_warning := v_warning + 1;
      RAISE NOTICE '│ % │ ✓       │ ✓        │ %      │ NO RULES │',
        rpad(v_table_name, 30),
        lpad(v_policy_count::text, 8);
    END IF;
  END LOOP;

  RAISE NOTICE '└────────────────────────────────┴─────────┴──────────┴──────────┴──────────┘';
  RAISE NOTICE '';
  RAISE NOTICE '╔══════════════════════════════════════════════════════════════════════╗';
  RAISE NOTICE '║                           SUMMARY                                    ║';
  RAISE NOTICE '╠══════════════════════════════════════════════════════════════════════╣';
  RAISE NOTICE '║  Total Tables Audited:  %                                         ║', lpad(v_total_tables::text, 4);
  RAISE NOTICE '║  Compliant:             % (%.1f%%)                                ║',
    lpad(v_compliant::text, 4),
    (v_compliant::numeric / GREATEST(v_total_tables, 1) * 100);
  RAISE NOTICE '║  Critical Issues:       %                                         ║', lpad(v_critical::text, 4);
  RAISE NOTICE '║  Warnings:              %                                         ║', lpad(v_warning::text, 4);
  RAISE NOTICE '╚══════════════════════════════════════════════════════════════════════╝';
  RAISE NOTICE '';

  IF v_critical = 0 AND v_warning = 0 THEN
    RAISE NOTICE '✅ ALL TABLES FULLY COMPLIANT - Phase 5 RLS verification passed!';
  ELSIF v_critical = 0 THEN
    RAISE NOTICE '⚠️  No critical issues, but % warnings require attention.', v_warning;
  ELSE
    RAISE NOTICE '❌ CRITICAL: % tables have RLS issues that need immediate attention!', v_critical;
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 2: VERIFY HELPER FUNCTIONS EXIST
-- =====================================================

DO $$
DECLARE
  v_functions_ok BOOLEAN := TRUE;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFYING HELPER FUNCTIONS';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';

  -- Check current_site_id
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'current_site_id' AND pronamespace = 'public'::regnamespace) THEN
    RAISE NOTICE '✓ public.current_site_id() exists';
  ELSE
    RAISE NOTICE '✗ MISSING: public.current_site_id()';
    v_functions_ok := FALSE;
  END IF;

  -- Check get_user_site_id
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_user_site_id' AND pronamespace = 'public'::regnamespace) THEN
    RAISE NOTICE '✓ public.get_user_site_id() exists';
  ELSE
    RAISE NOTICE '✗ MISSING: public.get_user_site_id()';
    v_functions_ok := FALSE;
  END IF;

  -- Check audit_rls_policies
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'audit_rls_policies' AND pronamespace = 'public'::regnamespace) THEN
    RAISE NOTICE '✓ public.audit_rls_policies() exists';
  ELSE
    RAISE NOTICE '⚠ MISSING: public.audit_rls_policies() (optional)';
  END IF;

  -- Check rls_compliance_status view
  IF EXISTS (SELECT 1 FROM pg_views WHERE viewname = 'rls_compliance_status' AND schemaname = 'public') THEN
    RAISE NOTICE '✓ public.rls_compliance_status view exists';
  ELSE
    RAISE NOTICE '⚠ MISSING: public.rls_compliance_status view (optional)';
  END IF;

  IF v_functions_ok THEN
    RAISE NOTICE '';
    RAISE NOTICE '✅ All required helper functions are present';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '❌ Some required functions are missing!';
  END IF;
  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 3: VERIFY SITES TABLE ACCESS
-- =====================================================

DO $$
DECLARE
  v_policy_count INTEGER;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFYING SITES TABLE ACCESS (Required for onboarding)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';

  SELECT COUNT(*) INTO v_policy_count
  FROM pg_policies
  WHERE tablename = 'sites' AND schemaname = 'public';

  RAISE NOTICE 'Sites table policies: %', v_policy_count;

  -- Check for anonymous access policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sites'
    AND 'anon' = ANY(roles)
  ) THEN
    RAISE NOTICE '✓ Anonymous users can access sites table (required for domain routing)';
  ELSE
    RAISE NOTICE '⚠ Anonymous access to sites may be restricted';
  END IF;

  -- Check for authenticated access policy
  IF EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'sites'
    AND 'authenticated' = ANY(roles)
  ) THEN
    RAISE NOTICE '✓ Authenticated users can access sites table';
  ELSE
    RAISE NOTICE '⚠ Authenticated access to sites may be restricted';
  END IF;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- STEP 4: VERIFY COMPANY CREATION WORKS (Critical for Onboarding)
-- =====================================================

DO $$
DECLARE
  v_insert_policy_exists BOOLEAN;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
  RAISE NOTICE 'VERIFYING COMPANY CREATION POLICIES (Critical for Onboarding)';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';

  -- Check for insert policy on companies
  SELECT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'companies'
    AND cmd = 'INSERT'
    AND schemaname = 'public'
  ) INTO v_insert_policy_exists;

  IF v_insert_policy_exists THEN
    RAISE NOTICE '✓ INSERT policy exists on companies table';
  ELSE
    RAISE NOTICE '✗ MISSING: INSERT policy on companies table';
  END IF;

  -- List all company policies
  RAISE NOTICE '';
  RAISE NOTICE 'Companies table policies:';
  FOR v_insert_policy_exists IN
    SELECT TRUE FROM pg_policies
    WHERE tablename = 'companies' AND schemaname = 'public'
  LOOP
    -- Just counting
  END LOOP;

  RAISE NOTICE '';
END $$;

-- =====================================================
-- FINAL SUMMARY
-- =====================================================

DO $$
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
  RAISE NOTICE '';
  RAISE NOTICE '                    PHASE 5 RLS VERIFICATION COMPLETE';
  RAISE NOTICE '';
  RAISE NOTICE '  Run the following query to check ongoing compliance:';
  RAISE NOTICE '';
  RAISE NOTICE '    SELECT * FROM rls_compliance_status';
  RAISE NOTICE '    WHERE compliance_status != ''COMPLIANT''';
  RAISE NOTICE '';
  RAISE NOTICE '  Or use the audit function:';
  RAISE NOTICE '';
  RAISE NOTICE '    SELECT * FROM audit_rls_policies()';
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════════════════';
END $$;
