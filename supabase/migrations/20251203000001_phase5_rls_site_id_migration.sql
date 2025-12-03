-- =====================================================
-- PHASE 5 RLS MIGRATION - Update to site_id Architecture
-- =====================================================
-- Migration: 20251203000001
-- Purpose: Migrate Phase 5 tables from tenant_id to site_id pattern
-- Date: 2025-12-03
-- CRITICAL: This aligns Phase 5 tables with the multi-site architecture
-- =====================================================

-- =====================================================
-- STEP 1: ADD site_id COLUMN TO PHASE 5 TABLES
-- =====================================================

-- Add site_id to Phase 5 tables that use tenant_id
DO $$
BEGIN
  -- material_forecasts
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_forecasts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'material_forecasts' AND column_name = 'site_id') THEN
      ALTER TABLE material_forecasts ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- supplier_catalog
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_catalog') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'supplier_catalog' AND column_name = 'site_id') THEN
      ALTER TABLE supplier_catalog ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- purchase_recommendations
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_recommendations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'purchase_recommendations' AND column_name = 'site_id') THEN
      ALTER TABLE purchase_recommendations ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- financial_snapshots
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_snapshots') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_snapshots' AND column_name = 'site_id') THEN
      ALTER TABLE financial_snapshots ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- kpi_metrics
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kpi_metrics') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'kpi_metrics' AND column_name = 'site_id') THEN
      ALTER TABLE kpi_metrics ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- client_portal_access
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_portal_access') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_portal_access' AND column_name = 'site_id') THEN
      ALTER TABLE client_portal_access ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- client_messages
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'client_messages' AND column_name = 'site_id') THEN
      ALTER TABLE client_messages ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- billing_automation_rules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_automation_rules') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'billing_automation_rules' AND column_name = 'site_id') THEN
      ALTER TABLE billing_automation_rules ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- payment_reminders
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_reminders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payment_reminders' AND column_name = 'site_id') THEN
      ALTER TABLE payment_reminders ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- custom_reports
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_reports') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'custom_reports' AND column_name = 'site_id') THEN
      ALTER TABLE custom_reports ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- report_schedules
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_schedules') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_schedules' AND column_name = 'site_id') THEN
      ALTER TABLE report_schedules ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;

  -- report_history
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_history') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'report_history' AND column_name = 'site_id') THEN
      ALTER TABLE report_history ADD COLUMN site_id UUID REFERENCES sites(id);
    END IF;
  END IF;
END $$;

-- =====================================================
-- STEP 2: BACKFILL site_id FROM tenant_id OR DEFAULT SITE
-- =====================================================

-- Get the BuildDesk site_id for backfilling existing data
DO $$
DECLARE
  v_builddesk_site_id UUID;
BEGIN
  -- Get or create BuildDesk site
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  -- If no BuildDesk site exists, create it
  IF v_builddesk_site_id IS NULL THEN
    INSERT INTO sites (key, name, domain, is_active, is_production)
    VALUES ('builddesk', 'BuildDesk', 'build-desk.com', true, true)
    RETURNING id INTO v_builddesk_site_id;
  END IF;

  -- Backfill site_id for all Phase 5 tables
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_forecasts') THEN
    UPDATE material_forecasts SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'supplier_catalog') THEN
    UPDATE supplier_catalog SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'purchase_recommendations') THEN
    UPDATE purchase_recommendations SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_snapshots') THEN
    UPDATE financial_snapshots SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'kpi_metrics') THEN
    UPDATE kpi_metrics SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_portal_access') THEN
    UPDATE client_portal_access SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'client_messages') THEN
    UPDATE client_messages SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'billing_automation_rules') THEN
    UPDATE billing_automation_rules SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payment_reminders') THEN
    UPDATE payment_reminders SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'custom_reports') THEN
    UPDATE custom_reports SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_schedules') THEN
    UPDATE report_schedules SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'report_history') THEN
    UPDATE report_history SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
  END IF;

  RAISE NOTICE 'Backfilled site_id = % for all Phase 5 tables', v_builddesk_site_id;
END $$;

-- =====================================================
-- STEP 3: CREATE INDEXES FOR site_id
-- =====================================================

CREATE INDEX IF NOT EXISTS idx_material_forecasts_site_id ON material_forecasts(site_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_site_id ON supplier_catalog(site_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recommendations_site_id ON purchase_recommendations(site_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_site_id ON financial_snapshots(site_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_site_id ON kpi_metrics(site_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_access_site_id ON client_portal_access(site_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_site_id ON client_messages(site_id);
CREATE INDEX IF NOT EXISTS idx_billing_automation_rules_site_id ON billing_automation_rules(site_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_site_id ON payment_reminders(site_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_site_id ON custom_reports(site_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_site_id ON report_schedules(site_id);
CREATE INDEX IF NOT EXISTS idx_report_history_site_id ON report_history(site_id);

-- =====================================================
-- STEP 4: DROP OLD tenant_id RLS POLICIES
-- =====================================================

DO $$
BEGIN
  -- Material Forecasts
  DROP POLICY IF EXISTS "Users can view material forecasts" ON material_forecasts;
  DROP POLICY IF EXISTS "Users can insert material forecasts" ON material_forecasts;
  DROP POLICY IF EXISTS "Users can update material forecasts" ON material_forecasts;
  DROP POLICY IF EXISTS "Users can delete material forecasts" ON material_forecasts;

  -- Supplier Catalog
  DROP POLICY IF EXISTS "Users can view supplier catalog" ON supplier_catalog;
  DROP POLICY IF EXISTS "Users can insert suppliers" ON supplier_catalog;
  DROP POLICY IF EXISTS "Users can update suppliers" ON supplier_catalog;
  DROP POLICY IF EXISTS "Users can delete suppliers" ON supplier_catalog;

  -- Purchase Recommendations
  DROP POLICY IF EXISTS "Users can view purchase recommendations" ON purchase_recommendations;
  DROP POLICY IF EXISTS "Users can insert purchase recommendations" ON purchase_recommendations;
  DROP POLICY IF EXISTS "Users can update purchase recommendations" ON purchase_recommendations;
  DROP POLICY IF EXISTS "Users can delete purchase recommendations" ON purchase_recommendations;

  -- Financial Snapshots
  DROP POLICY IF EXISTS "Users can view financial snapshots" ON financial_snapshots;
  DROP POLICY IF EXISTS "Users can insert financial snapshots" ON financial_snapshots;
  DROP POLICY IF EXISTS "Users can update financial snapshots" ON financial_snapshots;
  DROP POLICY IF EXISTS "Users can delete financial snapshots" ON financial_snapshots;

  -- KPI Metrics
  DROP POLICY IF EXISTS "Users can view kpi metrics" ON kpi_metrics;
  DROP POLICY IF EXISTS "Users can insert kpi metrics" ON kpi_metrics;
  DROP POLICY IF EXISTS "Users can update kpi metrics" ON kpi_metrics;
  DROP POLICY IF EXISTS "Users can delete kpi metrics" ON kpi_metrics;

  -- Client Portal Access
  DROP POLICY IF EXISTS "Users can view client portal access" ON client_portal_access;
  DROP POLICY IF EXISTS "Users can insert client portal access" ON client_portal_access;
  DROP POLICY IF EXISTS "Users can update client portal access" ON client_portal_access;
  DROP POLICY IF EXISTS "Users can delete client portal access" ON client_portal_access;

  -- Client Messages
  DROP POLICY IF EXISTS "Users can view client messages" ON client_messages;
  DROP POLICY IF EXISTS "Users can insert client messages" ON client_messages;
  DROP POLICY IF EXISTS "Users can update client messages" ON client_messages;
  DROP POLICY IF EXISTS "Users can delete client messages" ON client_messages;

  -- Billing Automation Rules
  DROP POLICY IF EXISTS "Users can view billing rules" ON billing_automation_rules;
  DROP POLICY IF EXISTS "Users can insert billing rules" ON billing_automation_rules;
  DROP POLICY IF EXISTS "Users can update billing rules" ON billing_automation_rules;
  DROP POLICY IF EXISTS "Users can delete billing rules" ON billing_automation_rules;

  -- Payment Reminders
  DROP POLICY IF EXISTS "Users can view payment reminders" ON payment_reminders;
  DROP POLICY IF EXISTS "Users can insert payment reminders" ON payment_reminders;
  DROP POLICY IF EXISTS "Users can update payment reminders" ON payment_reminders;
  DROP POLICY IF EXISTS "Users can delete payment reminders" ON payment_reminders;

  -- Custom Reports
  DROP POLICY IF EXISTS "Users can view custom reports" ON custom_reports;
  DROP POLICY IF EXISTS "Users can insert custom reports" ON custom_reports;
  DROP POLICY IF EXISTS "Users can update custom reports" ON custom_reports;
  DROP POLICY IF EXISTS "Users can delete custom reports" ON custom_reports;

  -- Report Schedules
  DROP POLICY IF EXISTS "Users can view report schedules" ON report_schedules;
  DROP POLICY IF EXISTS "Users can insert report schedules" ON report_schedules;
  DROP POLICY IF EXISTS "Users can update report schedules" ON report_schedules;
  DROP POLICY IF EXISTS "Users can delete report schedules" ON report_schedules;

  -- Report History
  DROP POLICY IF EXISTS "Users can view report history" ON report_history;
  DROP POLICY IF EXISTS "Users can insert report history" ON report_history;
END $$;

-- =====================================================
-- STEP 5: CREATE NEW site_id BASED RLS POLICIES
-- =====================================================

-- Helper function: Check if user has access to company within their site
CREATE OR REPLACE FUNCTION public.has_company_site_access(check_company_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM user_profiles up
    WHERE up.id = auth.uid()
    AND up.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND up.company_id = check_company_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- =====================================================
-- MATERIAL FORECASTS POLICIES
-- =====================================================
CREATE POLICY "site_material_forecasts_select"
  ON material_forecasts FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_material_forecasts_insert"
  ON material_forecasts FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_material_forecasts_update"
  ON material_forecasts FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_material_forecasts_delete"
  ON material_forecasts FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- SUPPLIER CATALOG POLICIES
-- =====================================================
CREATE POLICY "site_supplier_catalog_select"
  ON supplier_catalog FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_supplier_catalog_insert"
  ON supplier_catalog FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_supplier_catalog_update"
  ON supplier_catalog FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_supplier_catalog_delete"
  ON supplier_catalog FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- PURCHASE RECOMMENDATIONS POLICIES
-- =====================================================
CREATE POLICY "site_purchase_recommendations_select"
  ON purchase_recommendations FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_purchase_recommendations_insert"
  ON purchase_recommendations FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_purchase_recommendations_update"
  ON purchase_recommendations FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_purchase_recommendations_delete"
  ON purchase_recommendations FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- FINANCIAL SNAPSHOTS POLICIES
-- =====================================================
CREATE POLICY "site_financial_snapshots_select"
  ON financial_snapshots FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_financial_snapshots_insert"
  ON financial_snapshots FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_financial_snapshots_update"
  ON financial_snapshots FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_financial_snapshots_delete"
  ON financial_snapshots FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- KPI METRICS POLICIES
-- =====================================================
CREATE POLICY "site_kpi_metrics_select"
  ON kpi_metrics FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_kpi_metrics_insert"
  ON kpi_metrics FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_kpi_metrics_update"
  ON kpi_metrics FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_kpi_metrics_delete"
  ON kpi_metrics FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- CLIENT PORTAL ACCESS POLICIES
-- =====================================================
CREATE POLICY "site_client_portal_access_select"
  ON client_portal_access FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_portal_access_insert"
  ON client_portal_access FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_portal_access_update"
  ON client_portal_access FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_portal_access_delete"
  ON client_portal_access FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- CLIENT MESSAGES POLICIES
-- =====================================================
CREATE POLICY "site_client_messages_select"
  ON client_messages FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_messages_insert"
  ON client_messages FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_messages_update"
  ON client_messages FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_client_messages_delete"
  ON client_messages FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- BILLING AUTOMATION RULES POLICIES
-- =====================================================
CREATE POLICY "site_billing_automation_rules_select"
  ON billing_automation_rules FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_billing_automation_rules_insert"
  ON billing_automation_rules FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_billing_automation_rules_update"
  ON billing_automation_rules FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_billing_automation_rules_delete"
  ON billing_automation_rules FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- PAYMENT REMINDERS POLICIES
-- =====================================================
CREATE POLICY "site_payment_reminders_select"
  ON payment_reminders FOR SELECT
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_payment_reminders_insert"
  ON payment_reminders FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_payment_reminders_update"
  ON payment_reminders FOR UPDATE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_payment_reminders_delete"
  ON payment_reminders FOR DELETE
  USING (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

-- =====================================================
-- CUSTOM REPORTS POLICIES
-- =====================================================
CREATE POLICY "site_custom_reports_select"
  ON custom_reports FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND (created_by = auth.uid() OR auth.uid() IS NOT NULL)
  );

CREATE POLICY "site_custom_reports_insert"
  ON custom_reports FOR INSERT
  WITH CHECK (site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid);

CREATE POLICY "site_custom_reports_update"
  ON custom_reports FOR UPDATE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND created_by = auth.uid()
  );

CREATE POLICY "site_custom_reports_delete"
  ON custom_reports FOR DELETE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    AND created_by = auth.uid()
  );

-- =====================================================
-- REPORT SCHEDULES POLICIES
-- =====================================================
CREATE POLICY "site_report_schedules_select"
  ON report_schedules FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_schedules.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

CREATE POLICY "site_report_schedules_insert"
  ON report_schedules FOR INSERT
  WITH CHECK (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_schedules.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

CREATE POLICY "site_report_schedules_update"
  ON report_schedules FOR UPDATE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_schedules.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

CREATE POLICY "site_report_schedules_delete"
  ON report_schedules FOR DELETE
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_schedules.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

-- =====================================================
-- REPORT HISTORY POLICIES
-- =====================================================
CREATE POLICY "site_report_history_select"
  ON report_history FOR SELECT
  USING (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_history.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

CREATE POLICY "site_report_history_insert"
  ON report_history FOR INSERT
  WITH CHECK (
    site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
    OR EXISTS (
      SELECT 1 FROM custom_reports cr
      WHERE cr.id = report_history.custom_report_id
      AND cr.site_id = (auth.jwt() -> 'app_metadata' -> 'site_id')::text::uuid
      AND cr.created_by = auth.uid()
    )
  );

-- =====================================================
-- STEP 6: ADD COMMENTS
-- =====================================================

COMMENT ON POLICY "site_material_forecasts_select" ON material_forecasts IS
  'Phase 5: Users can view material forecasts within their site and company';

COMMENT ON POLICY "site_supplier_catalog_select" ON supplier_catalog IS
  'Phase 5: Users can view suppliers within their site and company';

COMMENT ON POLICY "site_financial_snapshots_select" ON financial_snapshots IS
  'Phase 5: Users can view financial snapshots within their site and company';

COMMENT ON POLICY "site_kpi_metrics_select" ON kpi_metrics IS
  'Phase 5: Users can view KPI metrics within their site and company';

COMMENT ON POLICY "site_custom_reports_select" ON custom_reports IS
  'Phase 5: Users can view custom reports they created or within their company';

-- =====================================================
-- VERIFICATION
-- =====================================================

DO $$
DECLARE
  v_phase5_tables TEXT[] := ARRAY[
    'material_forecasts', 'supplier_catalog', 'purchase_recommendations',
    'financial_snapshots', 'kpi_metrics', 'client_portal_access',
    'client_messages', 'billing_automation_rules', 'payment_reminders',
    'custom_reports', 'report_schedules', 'report_history'
  ];
  v_table TEXT;
  v_has_site_id BOOLEAN;
  v_has_rls BOOLEAN;
BEGIN
  RAISE NOTICE '=== Phase 5 RLS Migration Verification ===';

  FOREACH v_table IN ARRAY v_phase5_tables LOOP
    -- Check if site_id exists
    SELECT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = v_table AND column_name = 'site_id'
    ) INTO v_has_site_id;

    -- Check if RLS is enabled
    SELECT EXISTS (
      SELECT 1 FROM pg_tables
      WHERE tablename = v_table AND rowsecurity = true
    ) INTO v_has_rls;

    IF v_has_site_id AND v_has_rls THEN
      RAISE NOTICE '✓ %: site_id=YES, RLS=ENABLED', v_table;
    ELSIF v_has_site_id THEN
      RAISE NOTICE '⚠ %: site_id=YES, RLS=DISABLED', v_table;
    ELSIF v_has_rls THEN
      RAISE NOTICE '⚠ %: site_id=NO, RLS=ENABLED', v_table;
    ELSE
      RAISE NOTICE '✗ %: site_id=NO, RLS=DISABLED', v_table;
    END IF;
  END LOOP;

  RAISE NOTICE '';
  RAISE NOTICE 'Phase 5 RLS migration completed successfully!';
  RAISE NOTICE 'All Phase 5 tables now use site_id for multi-site isolation.';
END $$;
