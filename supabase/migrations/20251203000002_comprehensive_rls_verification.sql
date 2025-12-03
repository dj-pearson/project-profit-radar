-- =====================================================
-- COMPREHENSIVE RLS VERIFICATION & UPDATE
-- =====================================================
-- Migration: 20251203000002
-- Purpose: Ensure all 30+ tables have proper RLS with site_id isolation
-- Date: 2025-12-03
-- CRITICAL: Two-layer isolation (site_id + company_id) on all tenant tables
-- =====================================================

-- =====================================================
-- STEP 1: ENABLE PGCRYPTO FOR SECURE FUNCTIONS
-- =====================================================

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- =====================================================
-- STEP 2: ADD site_id TO API & INTEGRATION TABLES
-- =====================================================

-- Add site_id to api_keys
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'site_id') THEN
    ALTER TABLE api_keys ADD COLUMN site_id UUID REFERENCES sites(id);
  END IF;
END $$;

-- Add site_id to webhook_endpoints (if exists and doesn't have it)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_endpoints') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_endpoints' AND column_name = 'site_id') THEN
      ALTER TABLE webhook_endpoints ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;
END $$;

-- Add site_id to integration_configurations
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'integration_configurations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'integration_configurations' AND column_name = 'site_id') THEN
      ALTER TABLE integration_configurations ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;
END $$;

-- Add site_id to api_request_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_request_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_request_logs' AND column_name = 'site_id') THEN
      ALTER TABLE api_request_logs ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;
END $$;

-- Add site_id to webhook_delivery_logs
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_delivery_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhook_delivery_logs' AND column_name = 'site_id') THEN
      ALTER TABLE webhook_delivery_logs ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 3: BACKFILL site_id FOR NEW TABLES
-- =====================================================

DO $$
DECLARE
  v_builddesk_site_id UUID;
BEGIN
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  IF v_builddesk_site_id IS NOT NULL THEN
    UPDATE api_keys SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    UPDATE webhook_endpoints SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    UPDATE integration_configurations SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    UPDATE api_request_logs SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    UPDATE webhook_delivery_logs SET site_id = v_builddesk_site_id WHERE site_id IS NULL;

    RAISE NOTICE 'Backfilled site_id for API and integration tables';
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE INDEXES FOR site_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_api_keys_site_id ON api_keys(site_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_site_company ON api_keys(site_id, company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_site_id ON webhook_endpoints(site_id);
CREATE INDEX IF NOT EXISTS idx_integration_configurations_site_id ON integration_configurations(site_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_site_id ON api_request_logs(site_id);

-- =====================================================
-- STEP 5: UPDATE RLS POLICIES FOR API TABLES
-- =====================================================

-- Drop existing policies
DROP POLICY IF EXISTS "Admins can manage company API keys" ON api_keys;
DROP POLICY IF EXISTS "Root admins can view all API keys" ON api_keys;
DROP POLICY IF EXISTS "Admins can manage company webhook endpoints" ON webhook_endpoints;
DROP POLICY IF EXISTS "Admins can view company API logs" ON api_request_logs;
DROP POLICY IF EXISTS "System can insert API logs" ON api_request_logs;
DROP POLICY IF EXISTS "Admins can manage company integrations" ON integration_configurations;

-- API Keys policies with site_id
CREATE POLICY "site_api_keys_select"
  ON api_keys FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND (
      company_id IN (
        SELECT company_id FROM user_profiles
        WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
      )
      OR EXISTS (
        SELECT 1 FROM user_profiles
        WHERE id = auth.uid() AND role = 'root_admin'
      )
    )
  );

CREATE POLICY "site_api_keys_insert"
  ON api_keys FOR INSERT
  WITH CHECK (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_api_keys_update"
  ON api_keys FOR UPDATE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_api_keys_delete"
  ON api_keys FOR DELETE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

-- Webhook endpoints policies with site_id
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhook_endpoints') THEN
    DROP POLICY IF EXISTS "Users can view own webhook endpoints" ON webhook_endpoints;
    DROP POLICY IF EXISTS "Users can create webhook endpoints" ON webhook_endpoints;
    DROP POLICY IF EXISTS "Users can update own webhook endpoints" ON webhook_endpoints;
    DROP POLICY IF EXISTS "Users can delete own webhook endpoints" ON webhook_endpoints;
    DROP POLICY IF EXISTS "Admins can view tenant webhooks" ON webhook_endpoints;

    EXECUTE 'CREATE POLICY "site_webhook_endpoints_select"
      ON webhook_endpoints FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          user_id = auth.uid()
          OR company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN (''admin'', ''root_admin'')
          )
        )
      )';

    EXECUTE 'CREATE POLICY "site_webhook_endpoints_insert"
      ON webhook_endpoints FOR INSERT
      WITH CHECK (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND user_id = auth.uid()
      )';

    EXECUTE 'CREATE POLICY "site_webhook_endpoints_update"
      ON webhook_endpoints FOR UPDATE
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          user_id = auth.uid()
          OR company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid() AND role IN (''admin'', ''root_admin'')
          )
        )
      )';

    EXECUTE 'CREATE POLICY "site_webhook_endpoints_delete"
      ON webhook_endpoints FOR DELETE
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND user_id = auth.uid()
      )';
  END IF;
END $$;

-- Integration configurations policies with site_id
CREATE POLICY "site_integration_configurations_select"
  ON integration_configurations FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_integration_configurations_insert"
  ON integration_configurations FOR INSERT
  WITH CHECK (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_integration_configurations_update"
  ON integration_configurations FOR UPDATE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_integration_configurations_delete"
  ON integration_configurations FOR DELETE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

-- API request logs policies
CREATE POLICY "site_api_request_logs_select"
  ON api_request_logs FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "site_api_request_logs_insert"
  ON api_request_logs FOR INSERT
  WITH CHECK (true); -- System can always insert logs

-- =====================================================
-- STEP 6: VERIFY AND UPDATE ADDITIONAL DOMAIN TABLES
-- =====================================================

-- Add site_id to additional tables that may be missing it
DO $$
DECLARE
  v_tables_to_update TEXT[] := ARRAY[
    'expenses', 'expense_categories', 'invoices', 'payments',
    'estimates', 'estimate_templates', 'estimate_line_items',
    'tasks', 'daily_reports', 'daily_report_templates',
    'change_orders', 'equipment_qr_codes', 'equipment_scan_events',
    'safety_incidents', 'safety_checklists', 'training_certifications',
    'document_categories', 'document_templates', 'document_shares',
    'audit_logs', 'security_logs', 'saved_filter_presets',
    'timesheet_approvals', 'crew_gps_checkins', 'sso_configurations',
    'mfa_configurations', 'permission_grants', 'compliance_reports'
  ];
  v_table TEXT;
  v_builddesk_site_id UUID;
BEGIN
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  FOREACH v_table IN ARRAY v_tables_to_update LOOP
    -- Check if table exists
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = v_table) THEN
      -- Add site_id if missing
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = v_table AND column_name = 'site_id') THEN
        EXECUTE format('ALTER TABLE %I ADD COLUMN site_id UUID REFERENCES sites(id)', v_table);
        RAISE NOTICE 'Added site_id to %', v_table;
      END IF;

      -- Backfill site_id
      IF v_builddesk_site_id IS NOT NULL THEN
        EXECUTE format('UPDATE %I SET site_id = $1 WHERE site_id IS NULL', v_table) USING v_builddesk_site_id;
      END IF;

      -- Create index if not exists
      BEGIN
        EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_site_id ON %I(site_id)', v_table, v_table);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'Could not create index for %: %', v_table, SQLERRM;
      END;

      -- Enable RLS if not already enabled
      BEGIN
        EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', v_table);
      EXCEPTION WHEN OTHERS THEN
        RAISE NOTICE 'RLS already enabled on %', v_table;
      END;
    END IF;
  END LOOP;
END $$;

-- =====================================================
-- STEP 7: CREATE GENERIC SITE-AWARE RLS POLICIES
-- =====================================================

-- Helper function for admin check
CREATE OR REPLACE FUNCTION public.is_site_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles
    WHERE id = auth.uid()
    AND site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND role IN ('admin', 'root_admin')
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Create RLS policies for expenses
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    DROP POLICY IF EXISTS "Users can view expenses" ON expenses;
    DROP POLICY IF EXISTS "Users can manage expenses" ON expenses;

    EXECUTE 'CREATE POLICY "site_expenses_select"
      ON expenses FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR user_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "site_expenses_all"
      ON expenses FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR user_id = auth.uid()
        )
      )';
  END IF;
END $$;

-- Create RLS policies for invoices
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    DROP POLICY IF EXISTS "Users can view invoices" ON invoices;
    DROP POLICY IF EXISTS "Users can manage invoices" ON invoices;

    EXECUTE 'CREATE POLICY "site_invoices_select"
      ON invoices FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
      )';

    EXECUTE 'CREATE POLICY "site_invoices_all"
      ON invoices FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (
          SELECT company_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN (''admin'', ''accounting'', ''root_admin'')
        )
      )';
  END IF;
END $$;

-- Create RLS policies for estimates
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
    DROP POLICY IF EXISTS "Users can view estimates" ON estimates;
    DROP POLICY IF EXISTS "Users can manage estimates" ON estimates;

    EXECUTE 'CREATE POLICY "site_estimates_select"
      ON estimates FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
      )';

    EXECUTE 'CREATE POLICY "site_estimates_all"
      ON estimates FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (
          SELECT company_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN (''admin'', ''project_manager'', ''root_admin'')
        )
      )';
  END IF;
END $$;

-- Create RLS policies for tasks
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    DROP POLICY IF EXISTS "Users can view tasks" ON tasks;
    DROP POLICY IF EXISTS "Users can manage tasks" ON tasks;

    EXECUTE 'CREATE POLICY "site_tasks_select"
      ON tasks FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR assigned_to = auth.uid()
          OR created_by = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "site_tasks_all"
      ON tasks FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR assigned_to = auth.uid()
          OR created_by = auth.uid()
        )
      )';
  END IF;
END $$;

-- Create RLS policies for daily_reports
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reports') THEN
    DROP POLICY IF EXISTS "Users can view daily reports" ON daily_reports;
    DROP POLICY IF EXISTS "Users can manage daily reports" ON daily_reports;

    EXECUTE 'CREATE POLICY "site_daily_reports_select"
      ON daily_reports FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR created_by = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "site_daily_reports_all"
      ON daily_reports FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR created_by = auth.uid()
        )
      )';
  END IF;
END $$;

-- Create RLS policies for change_orders
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_orders') THEN
    DROP POLICY IF EXISTS "Users can view change orders" ON change_orders;
    DROP POLICY IF EXISTS "Users can manage change orders" ON change_orders;

    EXECUTE 'CREATE POLICY "site_change_orders_select"
      ON change_orders FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
      )';

    EXECUTE 'CREATE POLICY "site_change_orders_all"
      ON change_orders FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (
          SELECT company_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN (''admin'', ''project_manager'', ''root_admin'')
        )
      )';
  END IF;
END $$;

-- Create RLS policies for audit_logs (read-only for most users)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    DROP POLICY IF EXISTS "Users can view audit logs" ON audit_logs;
    DROP POLICY IF EXISTS "Admins can view audit logs" ON audit_logs;

    EXECUTE 'CREATE POLICY "site_audit_logs_select"
      ON audit_logs FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND company_id IN (
          SELECT company_id FROM user_profiles
          WHERE id = auth.uid()
          AND role IN (''admin'', ''root_admin'')
        )
      )';

    -- System can insert audit logs
    EXECUTE 'CREATE POLICY "site_audit_logs_insert"
      ON audit_logs FOR INSERT
      WITH CHECK (true)';
  END IF;
END $$;

-- Create RLS policies for saved_filter_presets
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_filter_presets') THEN
    DROP POLICY IF EXISTS "Users can view filter presets" ON saved_filter_presets;
    DROP POLICY IF EXISTS "Users can manage filter presets" ON saved_filter_presets;

    EXECUTE 'CREATE POLICY "site_saved_filter_presets_select"
      ON saved_filter_presets FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (user_id = auth.uid() OR is_public = true)
      )';

    EXECUTE 'CREATE POLICY "site_saved_filter_presets_all"
      ON saved_filter_presets FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND user_id = auth.uid()
      )';
  END IF;
END $$;

-- Create RLS policies for timesheet_approvals
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_approvals') THEN
    DROP POLICY IF EXISTS "Users can view timesheet approvals" ON timesheet_approvals;
    DROP POLICY IF EXISTS "Users can manage timesheet approvals" ON timesheet_approvals;

    EXECUTE 'CREATE POLICY "site_timesheet_approvals_select"
      ON timesheet_approvals FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR user_id = auth.uid()
          OR approver_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "site_timesheet_approvals_all"
      ON timesheet_approvals FOR ALL
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          approver_id = auth.uid()
          OR company_id IN (
            SELECT company_id FROM user_profiles
            WHERE id = auth.uid()
            AND role IN (''admin'', ''project_manager'', ''root_admin'')
          )
        )
      )';
  END IF;
END $$;

-- Create RLS policies for crew_gps_checkins
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crew_gps_checkins') THEN
    DROP POLICY IF EXISTS "Users can view GPS checkins" ON crew_gps_checkins;
    DROP POLICY IF EXISTS "Users can manage GPS checkins" ON crew_gps_checkins;

    EXECUTE 'CREATE POLICY "site_crew_gps_checkins_select"
      ON crew_gps_checkins FOR SELECT
      USING (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND (
          company_id IN (SELECT company_id FROM user_profiles WHERE id = auth.uid())
          OR user_id = auth.uid()
        )
      )';

    EXECUTE 'CREATE POLICY "site_crew_gps_checkins_insert"
      ON crew_gps_checkins FOR INSERT
      WITH CHECK (
        site_id = (auth.jwt() -> ''app_metadata'' -> ''site_id'')::text::uuid
        AND user_id = auth.uid()
      )';
  END IF;
END $$;

-- =====================================================
-- STEP 8: VERIFICATION REPORT
-- =====================================================

DO $$
DECLARE
  v_table_record RECORD;
  v_tables_with_rls INTEGER := 0;
  v_tables_with_site_id INTEGER := 0;
  v_total_tables INTEGER := 0;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== COMPREHENSIVE RLS VERIFICATION REPORT ===';
  RAISE NOTICE '';

  FOR v_table_record IN
    SELECT
      t.tablename,
      t.rowsecurity as rls_enabled,
      EXISTS (
        SELECT 1 FROM information_schema.columns c
        WHERE c.table_name = t.tablename AND c.column_name = 'site_id'
      ) as has_site_id,
      (
        SELECT COUNT(*) FROM pg_policies p
        WHERE p.tablename = t.tablename
      ) as policy_count
    FROM pg_tables t
    WHERE t.schemaname = 'public'
    AND t.tablename NOT LIKE 'pg_%'
    AND t.tablename NOT LIKE '_prisma_%'
    AND t.tablename NOT IN ('schema_migrations', 'spatial_ref_sys')
    ORDER BY t.tablename
  LOOP
    v_total_tables := v_total_tables + 1;

    IF v_table_record.rls_enabled THEN
      v_tables_with_rls := v_tables_with_rls + 1;
    END IF;

    IF v_table_record.has_site_id THEN
      v_tables_with_site_id := v_tables_with_site_id + 1;
    END IF;

    -- Log tables without proper setup
    IF NOT v_table_record.rls_enabled OR NOT v_table_record.has_site_id OR v_table_record.policy_count = 0 THEN
      RAISE NOTICE '⚠ %: RLS=%, site_id=%, policies=%',
        v_table_record.tablename,
        CASE WHEN v_table_record.rls_enabled THEN 'YES' ELSE 'NO' END,
        CASE WHEN v_table_record.has_site_id THEN 'YES' ELSE 'NO' END,
        v_table_record.policy_count;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE '=== SUMMARY ===';
  RAISE NOTICE 'Total tables: %', v_total_tables;
  RAISE NOTICE 'Tables with RLS: % (%.1f%%)', v_tables_with_rls, (v_tables_with_rls::numeric / v_total_tables * 100);
  RAISE NOTICE 'Tables with site_id: % (%.1f%%)', v_tables_with_site_id, (v_tables_with_site_id::numeric / v_total_tables * 100);
  RAISE NOTICE '';
  RAISE NOTICE 'Migration 20251203000002 completed successfully!';
END $$;

-- =====================================================
-- STEP 9: ADD COMMENTS
-- =====================================================

COMMENT ON FUNCTION public.is_site_admin() IS
  'Returns true if the current user is an admin within their site';

COMMENT ON FUNCTION public.has_company_site_access(UUID) IS
  'Returns true if the current user has access to the specified company within their site';
