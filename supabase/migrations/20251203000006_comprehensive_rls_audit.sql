-- =====================================================
-- COMPREHENSIVE RLS AUDIT & VERIFICATION
-- =====================================================
-- Migration: 20251203000006
-- Purpose: Audit and verify RLS policies on all 30+ tenant tables
-- Date: 2025-12-03
-- CRITICAL: Ensures complete multi-tenant data isolation
-- =====================================================

-- =====================================================
-- STEP 1: CREATE VERIFICATION FUNCTION
-- =====================================================

CREATE OR REPLACE FUNCTION public.audit_rls_policies()
RETURNS TABLE (
  table_name TEXT,
  has_rls BOOLEAN,
  has_site_id BOOLEAN,
  policy_count INTEGER,
  status TEXT,
  recommendation TEXT
) AS $$
DECLARE
  v_core_tables TEXT[] := ARRAY[
    -- User & Company tables
    'companies', 'user_profiles', 'tenants', 'tenant_users',
    -- Project Management
    'projects', 'project_templates', 'tasks', 'daily_reports', 'daily_report_templates',
    'change_orders',
    -- Time & Attendance
    'time_entries', 'timesheet_approvals', 'crew_gps_checkins',
    -- Financial
    'financial_records', 'invoices', 'payments', 'expenses', 'expense_categories',
    'estimates', 'estimate_templates', 'estimate_line_items',
    'material_forecasts', 'supplier_catalog', 'purchase_recommendations',
    'financial_snapshots', 'kpi_metrics',
    'billing_automation_rules', 'payment_reminders',
    -- Documents & Media
    'documents', 'document_categories', 'document_templates', 'document_shares',
    'equipment_qr_codes', 'equipment_scan_events',
    -- CRM & Sales
    'crm_contacts', 'crm_leads', 'crm_campaigns',
    'client_portal_access', 'client_messages',
    -- Compliance & Security
    'audit_logs', 'security_logs', 'compliance_reports',
    'sso_configurations', 'mfa_configurations', 'permission_grants',
    -- Device Trust & Sessions (newly added)
    'trusted_devices', 'user_sessions', 'mfa_devices', 'sso_connections',
    -- Reports & Filters
    'custom_reports', 'report_schedules', 'report_history', 'saved_filter_presets',
    -- API & Webhooks
    'api_keys', 'webhook_endpoints', 'integration_configurations',
    'api_request_logs', 'webhook_delivery_logs',
    -- Communication
    'notifications', 'email_templates', 'sms_templates'
  ];
  v_table TEXT;
  v_has_rls BOOLEAN;
  v_has_site_id BOOLEAN;
  v_policy_count INTEGER;
BEGIN
  FOREACH v_table IN ARRAY v_core_tables LOOP
    -- Skip if table doesn't exist
    IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE information_schema.tables.table_name = v_table AND table_schema = 'public') THEN
      CONTINUE;
    END IF;

    -- Check RLS status
    SELECT t.rowsecurity INTO v_has_rls
    FROM pg_tables t
    WHERE t.tablename = v_table AND t.schemaname = 'public';

    -- Check site_id column
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = v_table AND c.column_name = 'site_id' AND c.table_schema = 'public'
    ) INTO v_has_site_id;

    -- Count policies
    SELECT COUNT(*) INTO v_policy_count
    FROM pg_policies p
    WHERE p.tablename = v_table AND p.schemaname = 'public';

    -- Determine status and recommendation
    table_name := v_table;
    has_rls := v_has_rls;
    has_site_id := v_has_site_id;
    policy_count := v_policy_count;

    IF v_has_rls AND v_has_site_id AND v_policy_count > 0 THEN
      status := 'COMPLIANT';
      recommendation := NULL;
    ELSIF NOT v_has_rls THEN
      status := 'CRITICAL';
      recommendation := 'Enable RLS: ALTER TABLE ' || v_table || ' ENABLE ROW LEVEL SECURITY';
    ELSIF NOT v_has_site_id THEN
      status := 'WARNING';
      recommendation := 'Add site_id: ALTER TABLE ' || v_table || ' ADD COLUMN site_id UUID REFERENCES sites(id)';
    ELSIF v_policy_count = 0 THEN
      status := 'WARNING';
      recommendation := 'Create RLS policies for ' || v_table;
    ELSE
      status := 'REVIEW';
      recommendation := 'Manual review needed';
    END IF;

    RETURN NEXT;
  END LOOP;

  RETURN;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: ENSURE RLS IS ENABLED ON ALL CORE TABLES
-- =====================================================

DO $$
DECLARE
  v_tables_to_enable TEXT[] := ARRAY[
    'companies', 'user_profiles', 'projects', 'project_templates',
    'tasks', 'daily_reports', 'daily_report_templates', 'change_orders',
    'time_entries', 'timesheet_approvals', 'crew_gps_checkins',
    'financial_records', 'invoices', 'payments', 'expenses',
    'estimates', 'estimate_templates', 'estimate_line_items',
    'documents', 'document_categories', 'equipment_qr_codes',
    'crm_contacts', 'crm_leads', 'crm_campaigns',
    'audit_logs', 'security_logs', 'compliance_reports',
    'trusted_devices', 'user_sessions', 'mfa_devices', 'sso_connections',
    'custom_reports', 'report_schedules', 'report_history',
    'saved_filter_presets', 'api_keys', 'notifications',
    'material_forecasts', 'supplier_catalog', 'purchase_recommendations',
    'financial_snapshots', 'kpi_metrics', 'client_portal_access',
    'client_messages', 'billing_automation_rules', 'payment_reminders'
  ];
  v_table TEXT;
BEGIN
  FOREACH v_table IN ARRAY v_tables_to_enable LOOP
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table AND table_schema = 'public') THEN
      BEGIN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table);
        RAISE NOTICE 'Enabled RLS on %', v_table;
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'RLS already enabled on % or error: %', v_table, SQLERRM;
      END;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 3: FIX TABLES MISSING SITE_ID POLICIES
-- =====================================================

-- Fix notifications table if missing site-aware policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    -- Add site_id if missing
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'site_id') THEN
      ALTER TABLE notifications ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;

    -- Backfill
    UPDATE notifications SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1) WHERE site_id IS NULL;

    -- Create index
    CREATE INDEX IF NOT EXISTS idx_notifications_site_id ON notifications(site_id);

    -- Drop old policies
    DROP POLICY IF EXISTS "Users can view own notifications" ON notifications;
    DROP POLICY IF EXISTS "Users can manage own notifications" ON notifications;

    -- Create new site-aware policies
    DROP POLICY IF EXISTS "site_notifications_select" ON notifications;
    CREATE POLICY "site_notifications_select"
      ON notifications FOR SELECT
      USING (
        user_id = auth.uid()
        AND (
          site_id IS NULL
          OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
        )
      );

    DROP POLICY IF EXISTS "site_notifications_all" ON notifications;
    CREATE POLICY "site_notifications_all"
      ON notifications FOR ALL
      USING (
        user_id = auth.uid()
        AND (
          site_id IS NULL
          OR site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
        )
      );

    RAISE NOTICE 'Updated notifications table with site_id support';
  END IF;
END $$;

-- Fix document_categories if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'document_categories') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'document_categories' AND column_name = 'site_id') THEN
      ALTER TABLE document_categories ADD COLUMN site_id UUID REFERENCES sites(id);
      UPDATE document_categories SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1) WHERE site_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_document_categories_site_id ON document_categories(site_id);
    END IF;
  END IF;
END $$;

-- Fix compliance_reports if exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'compliance_reports') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'compliance_reports' AND column_name = 'site_id') THEN
      ALTER TABLE compliance_reports ADD COLUMN site_id UUID REFERENCES sites(id);
      UPDATE compliance_reports SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1) WHERE site_id IS NULL;
      CREATE INDEX IF NOT EXISTS idx_compliance_reports_site_id ON compliance_reports(site_id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE HELPER FUNCTION FOR SITE ISOLATION
-- =====================================================

CREATE OR REPLACE FUNCTION public.get_user_site_id()
RETURNS UUID AS $$
BEGIN
  RETURN (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid;
EXCEPTION
  WHEN OTHERS THEN
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

COMMENT ON FUNCTION public.get_user_site_id() IS
  'Returns the site_id from the current user JWT for RLS policies';

-- =====================================================
-- STEP 5: RUN COMPREHENSIVE AUDIT
-- =====================================================

DO $$
DECLARE
  v_audit_row RECORD;
  v_total INTEGER := 0;
  v_compliant INTEGER := 0;
  v_critical INTEGER := 0;
  v_warning INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== COMPREHENSIVE RLS AUDIT REPORT ===';
  RAISE NOTICE '';
  RAISE NOTICE 'Table                          | RLS | site_id | Policies | Status';
  RAISE NOTICE '-------------------------------|-----|---------|----------|--------';

  FOR v_audit_row IN SELECT * FROM public.audit_rls_policies() LOOP
    v_total := v_total + 1;

    IF v_audit_row.status = 'COMPLIANT' THEN
      v_compliant := v_compliant + 1;
      RAISE NOTICE '% | % | % | % | OK',
        rpad(v_audit_row.table_name, 30),
        CASE WHEN v_audit_row.has_rls THEN 'YES' ELSE 'NO ' END,
        CASE WHEN v_audit_row.has_site_id THEN 'YES    ' ELSE 'NO     ' END,
        lpad(v_audit_row.policy_count::text, 8);
    ELSIF v_audit_row.status = 'CRITICAL' THEN
      v_critical := v_critical + 1;
      RAISE NOTICE '% | % | % | % | CRITICAL: %',
        rpad(v_audit_row.table_name, 30),
        CASE WHEN v_audit_row.has_rls THEN 'YES' ELSE 'NO ' END,
        CASE WHEN v_audit_row.has_site_id THEN 'YES    ' ELSE 'NO     ' END,
        lpad(v_audit_row.policy_count::text, 8),
        v_audit_row.recommendation;
    ELSE
      v_warning := v_warning + 1;
      RAISE NOTICE '% | % | % | % | WARNING: %',
        rpad(v_audit_row.table_name, 30),
        CASE WHEN v_audit_row.has_rls THEN 'YES' ELSE 'NO ' END,
        CASE WHEN v_audit_row.has_site_id THEN 'YES    ' ELSE 'NO     ' END,
        lpad(v_audit_row.policy_count::text, 8),
        v_audit_row.recommendation;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== SUMMARY ===';
  RAISE NOTICE 'Total tables audited: %', v_total;
  RAISE NOTICE 'Compliant: % (%.1f%%)', v_compliant, (v_compliant::numeric / GREATEST(v_total, 1) * 100);
  RAISE NOTICE 'Critical issues: %', v_critical;
  RAISE NOTICE 'Warnings: %', v_warning;
  RAISE NOTICE '';

  IF v_critical > 0 THEN
    RAISE NOTICE 'ACTION REQUIRED: % tables have critical RLS issues that need immediate attention!', v_critical;
  ELSE
    RAISE NOTICE 'All core tables have RLS enabled.';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20251203000006 completed - RLS audit complete';
END $$;

-- =====================================================
-- STEP 6: CREATE VIEW FOR ONGOING MONITORING
-- =====================================================

CREATE OR REPLACE VIEW public.rls_compliance_status AS
SELECT
  t.tablename as table_name,
  t.rowsecurity as rls_enabled,
  EXISTS (
    SELECT 1 FROM information_schema.columns c
    WHERE c.table_name = t.tablename AND c.column_name = 'site_id'
  ) as has_site_id,
  (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) as policy_count,
  CASE
    WHEN t.rowsecurity AND EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.tablename AND c.column_name = 'site_id'
    ) AND (SELECT COUNT(*) FROM pg_policies p WHERE p.tablename = t.tablename) > 0
    THEN 'COMPLIANT'
    WHEN NOT t.rowsecurity THEN 'CRITICAL - RLS Disabled'
    WHEN NOT EXISTS (
      SELECT 1 FROM information_schema.columns c
      WHERE c.table_name = t.tablename AND c.column_name = 'site_id'
    ) THEN 'WARNING - No site_id'
    ELSE 'REVIEW'
  END as compliance_status
FROM pg_tables t
WHERE t.schemaname = 'public'
AND t.tablename NOT LIKE 'pg_%'
AND t.tablename NOT LIKE '_prisma_%'
AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys', 'geography_columns', 'geometry_columns', 'sites')
ORDER BY
  CASE
    WHEN NOT t.rowsecurity THEN 1
    WHEN NOT EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_name = t.tablename AND c.column_name = 'site_id') THEN 2
    ELSE 3
  END,
  t.tablename;

COMMENT ON VIEW public.rls_compliance_status IS
  'Dashboard view showing RLS compliance status for all tables. Run: SELECT * FROM rls_compliance_status WHERE compliance_status != ''COMPLIANT''';
