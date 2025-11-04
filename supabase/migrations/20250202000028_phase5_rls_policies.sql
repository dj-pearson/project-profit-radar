-- Phase 5 RLS Policies
-- Migration: 20250202000028
-- Description: Add Row Level Security policies to Phase 5 tables

-- =====================================================
-- STEP 1: ENSURE has_tenant_access FUNCTION EXISTS
-- =====================================================
CREATE OR REPLACE FUNCTION has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.tenant_id = check_tenant_id
  );
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in has_tenant_access: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- STEP 2: ENABLE RLS ON ALL PHASE 5 TABLES
-- =====================================================
ALTER TABLE material_forecasts ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplier_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE purchase_recommendations ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_snapshots ENABLE ROW LEVEL SECURITY;
ALTER TABLE kpi_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE client_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing_automation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE payment_reminders ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_history ENABLE ROW LEVEL SECURITY;

-- =====================================================
-- STEP 3: DROP EXISTING POLICIES (IF ANY)
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
-- STEP 4: CREATE POLICIES FOR MATERIAL FORECASTS
-- =====================================================
CREATE POLICY "Users can view material forecasts"
  ON material_forecasts FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert material forecasts"
  ON material_forecasts FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update material forecasts"
  ON material_forecasts FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete material forecasts"
  ON material_forecasts FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 5: CREATE POLICIES FOR SUPPLIER CATALOG
-- =====================================================
CREATE POLICY "Users can view supplier catalog"
  ON supplier_catalog FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert suppliers"
  ON supplier_catalog FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update suppliers"
  ON supplier_catalog FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete suppliers"
  ON supplier_catalog FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 6: CREATE POLICIES FOR PURCHASE RECOMMENDATIONS
-- =====================================================
CREATE POLICY "Users can view purchase recommendations"
  ON purchase_recommendations FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert purchase recommendations"
  ON purchase_recommendations FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update purchase recommendations"
  ON purchase_recommendations FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete purchase recommendations"
  ON purchase_recommendations FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 7: CREATE POLICIES FOR FINANCIAL SNAPSHOTS
-- =====================================================
CREATE POLICY "Users can view financial snapshots"
  ON financial_snapshots FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert financial snapshots"
  ON financial_snapshots FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update financial snapshots"
  ON financial_snapshots FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete financial snapshots"
  ON financial_snapshots FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 8: CREATE POLICIES FOR KPI METRICS
-- =====================================================
CREATE POLICY "Users can view kpi metrics"
  ON kpi_metrics FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert kpi metrics"
  ON kpi_metrics FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update kpi metrics"
  ON kpi_metrics FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete kpi metrics"
  ON kpi_metrics FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 9: CREATE POLICIES FOR CLIENT PORTAL ACCESS
-- =====================================================
CREATE POLICY "Users can view client portal access"
  ON client_portal_access FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert client portal access"
  ON client_portal_access FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update client portal access"
  ON client_portal_access FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete client portal access"
  ON client_portal_access FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 10: CREATE POLICIES FOR CLIENT MESSAGES
-- =====================================================
CREATE POLICY "Users can view client messages"
  ON client_messages FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert client messages"
  ON client_messages FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update client messages"
  ON client_messages FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete client messages"
  ON client_messages FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 11: CREATE POLICIES FOR BILLING AUTOMATION RULES
-- =====================================================
CREATE POLICY "Users can view billing rules"
  ON billing_automation_rules FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert billing rules"
  ON billing_automation_rules FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update billing rules"
  ON billing_automation_rules FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete billing rules"
  ON billing_automation_rules FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 12: CREATE POLICIES FOR PAYMENT REMINDERS
-- =====================================================
CREATE POLICY "Users can view payment reminders"
  ON payment_reminders FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert payment reminders"
  ON payment_reminders FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update payment reminders"
  ON payment_reminders FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete payment reminders"
  ON payment_reminders FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 13: CREATE POLICIES FOR CUSTOM REPORTS
-- =====================================================
CREATE POLICY "Users can view custom reports"
  ON custom_reports FOR SELECT
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can insert custom reports"
  ON custom_reports FOR INSERT
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can update custom reports"
  ON custom_reports FOR UPDATE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id))
  WITH CHECK (tenant_id IS NULL OR has_tenant_access(tenant_id));

CREATE POLICY "Users can delete custom reports"
  ON custom_reports FOR DELETE
  USING (tenant_id IS NULL OR has_tenant_access(tenant_id));

-- =====================================================
-- STEP 14: CREATE POLICIES FOR REPORT SCHEDULES
-- =====================================================
CREATE POLICY "Users can view report schedules"
  ON report_schedules FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

CREATE POLICY "Users can insert report schedules"
  ON report_schedules FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

CREATE POLICY "Users can update report schedules"
  ON report_schedules FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

CREATE POLICY "Users can delete report schedules"
  ON report_schedules FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_schedules.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

-- =====================================================
-- STEP 15: CREATE POLICIES FOR REPORT HISTORY
-- =====================================================
CREATE POLICY "Users can view report history"
  ON report_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_history.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

CREATE POLICY "Users can insert report history"
  ON report_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_history.custom_report_id
      AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))
    )
  );

-- =====================================================
-- STEP 16: ADD COMMENTS
-- =====================================================
COMMENT ON POLICY "Users can view material forecasts" ON material_forecasts IS
  'Users can view material forecasts for their tenant';
COMMENT ON POLICY "Users can view supplier catalog" ON supplier_catalog IS
  'Users can view suppliers for their tenant';
COMMENT ON POLICY "Users can view purchase recommendations" ON purchase_recommendations IS
  'Users can view purchase recommendations for their tenant';
COMMENT ON POLICY "Users can view financial snapshots" ON financial_snapshots IS
  'Users can view financial snapshots for their tenant';
COMMENT ON POLICY "Users can view kpi metrics" ON kpi_metrics IS
  'Users can view KPI metrics for their tenant';
COMMENT ON POLICY "Users can view client portal access" ON client_portal_access IS
  'Users can view client portal access for their tenant';
COMMENT ON POLICY "Users can view client messages" ON client_messages IS
  'Users can view client messages for their tenant';
COMMENT ON POLICY "Users can view billing rules" ON billing_automation_rules IS
  'Users can view billing automation rules for their tenant';
COMMENT ON POLICY "Users can view payment reminders" ON payment_reminders IS
  'Users can view payment reminders for their tenant';
COMMENT ON POLICY "Users can view custom reports" ON custom_reports IS
  'Users can view custom reports for their tenant';
COMMENT ON POLICY "Users can view report schedules" ON report_schedules IS
  'Users can view report schedules for reports they have access to';
COMMENT ON POLICY "Users can view report history" ON report_history IS
  'Users can view report history for reports they have access to';
