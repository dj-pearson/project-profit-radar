-- Procurement, Dashboards, Client Portal, Billing & Reporting (FINAL FIX)
-- Migration: 20250202000026
-- Description: Phase 5 features with proper column existence checks

-- =====================================================
-- STEP 1: ENSURE TENANT_ID EXISTS FIRST
-- =====================================================
DO $$
BEGIN
  -- Add tenant_id to user_profiles if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'user_profiles' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE user_profiles ADD COLUMN tenant_id UUID;
    RAISE NOTICE 'Added tenant_id to user_profiles';
  END IF;

  -- Add tenant_id to projects if missing
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'projects' AND column_name = 'tenant_id'
  ) THEN
    ALTER TABLE projects ADD COLUMN tenant_id UUID;
    RAISE NOTICE 'Added tenant_id to projects';
  END IF;

  -- Populate tenant_id if there's a default tenant
  IF EXISTS (SELECT 1 FROM tenants LIMIT 1) THEN
    DECLARE
      default_tenant_id UUID;
    BEGIN
      SELECT id INTO default_tenant_id FROM tenants LIMIT 1;

      UPDATE user_profiles SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;
      UPDATE projects SET tenant_id = default_tenant_id WHERE tenant_id IS NULL;

      RAISE NOTICE 'Populated tenant_id with default tenant';
    END;
  END IF;
END $$;

-- =====================================================
-- STEP 2: NOW CREATE THE FUNCTION (after column exists)
-- =====================================================
CREATE OR REPLACE FUNCTION has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- Now we know tenant_id exists in user_profiles
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
-- STEP 3: CREATE ALL TABLES (without FK constraints)
-- =====================================================

-- MATERIAL FORECASTS TABLE
CREATE TABLE IF NOT EXISTS material_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  material_name TEXT NOT NULL,
  material_category TEXT,
  forecast_date DATE NOT NULL,
  forecast_quantity DECIMAL(12,2) NOT NULL,
  forecast_unit TEXT NOT NULL,
  confidence_score DECIMAL(5,2),
  based_on_projects_count INTEGER,
  estimated_lead_time_days INTEGER,
  recommended_order_date DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- SUPPLIER CATALOG TABLE
CREATE TABLE IF NOT EXISTS supplier_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,
  material_name TEXT NOT NULL,
  material_sku TEXT,
  unit_price DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL,
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_quantity DECIMAL(12,2),
  bulk_discount_threshold DECIMAL(12,2),
  bulk_discount_percentage DECIMAL(5,2),
  supplier_rating DECIMAL(3,2),
  last_order_date DATE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- PURCHASE RECOMMENDATIONS TABLE
CREATE TABLE IF NOT EXISTS purchase_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  material_name TEXT NOT NULL,
  recommended_quantity DECIMAL(12,2) NOT NULL,
  recommended_unit TEXT NOT NULL,
  recommended_supplier_id UUID,
  estimated_cost DECIMAL(12,2),
  estimated_savings DECIMAL(12,2),
  recommended_order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for purchase_recommendations -> supplier_catalog
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'purchase_recommendations_recommended_supplier_id_fkey'
  ) THEN
    ALTER TABLE purchase_recommendations
    ADD CONSTRAINT purchase_recommendations_recommended_supplier_id_fkey
    FOREIGN KEY (recommended_supplier_id) REFERENCES supplier_catalog(id);
  END IF;
END $$;

-- FINANCIAL SNAPSHOTS TABLE
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  snapshot_date DATE NOT NULL,
  total_revenue DECIMAL(14,2) DEFAULT 0,
  revenue_mtd DECIMAL(14,2) DEFAULT 0,
  revenue_ytd DECIMAL(14,2) DEFAULT 0,
  total_costs DECIMAL(14,2) DEFAULT 0,
  labor_costs DECIMAL(14,2) DEFAULT 0,
  material_costs DECIMAL(14,2) DEFAULT 0,
  overhead_costs DECIMAL(14,2) DEFAULT 0,
  gross_profit DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,
  cash_on_hand DECIMAL(14,2) DEFAULT 0,
  accounts_receivable DECIMAL(14,2) DEFAULT 0,
  accounts_payable DECIMAL(14,2) DEFAULT 0,
  active_projects_count INTEGER DEFAULT 0,
  completed_projects_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- KPI METRICS TABLE
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(14,2) NOT NULL,
  metric_target DECIMAL(14,2),
  previous_value DECIMAL(14,2),
  change_percentage DECIMAL(5,2),
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENT PORTAL ACCESS TABLE
CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,
  access_token TEXT UNIQUE NOT NULL,
  password_hash TEXT,
  can_view_financials BOOLEAN DEFAULT FALSE,
  can_approve_change_orders BOOLEAN DEFAULT FALSE,
  can_make_payments BOOLEAN DEFAULT TRUE,
  can_view_documents BOOLEAN DEFAULT TRUE,
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CLIENT MESSAGES TABLE
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  client_portal_id UUID,
  message_type TEXT CHECK (message_type IN ('message', 'update', 'notification')),
  subject TEXT,
  message TEXT NOT NULL,
  sent_by_client BOOLEAN DEFAULT FALSE,
  sent_by_user_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for client_messages -> client_portal_access
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'client_messages_client_portal_id_fkey'
  ) THEN
    ALTER TABLE client_messages
    ADD CONSTRAINT client_messages_client_portal_id_fkey
    FOREIGN KEY (client_portal_id) REFERENCES client_portal_access(id);
  END IF;
END $$;

-- BILLING AUTOMATION RULES TABLE
CREATE TABLE IF NOT EXISTS billing_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL,
  trigger_condition JSONB NOT NULL,
  invoice_template_id UUID,
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_percentage DECIMAL(5,2),
  auto_generate BOOLEAN DEFAULT TRUE,
  auto_send BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- PAYMENT REMINDERS TABLE
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  invoice_id UUID,
  project_id UUID,
  reminder_type TEXT CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'final_notice')),
  days_before_after INTEGER,
  sent_at TIMESTAMPTZ,
  delivery_method TEXT CHECK (delivery_method IN ('email', 'sms', 'both')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- CUSTOM REPORTS TABLE
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  created_by UUID,
  report_name TEXT NOT NULL,
  report_description TEXT,
  report_type TEXT NOT NULL,
  data_sources TEXT[] NOT NULL,
  filters JSONB,
  grouping JSONB,
  sorting JSONB,
  chart_type TEXT,
  columns JSONB NOT NULL,
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT,
  schedule_recipients TEXT[],
  is_public BOOLEAN DEFAULT FALSE,
  shared_with TEXT[],
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORT SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL,
  schedule_day_of_week INTEGER,
  schedule_day_of_month INTEGER,
  schedule_time TIME DEFAULT '09:00:00',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add FK for report_schedules -> custom_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'report_schedules_custom_report_id_fkey'
  ) THEN
    ALTER TABLE report_schedules
    ADD CONSTRAINT report_schedules_custom_report_id_fkey
    FOREIGN KEY (custom_report_id) REFERENCES custom_reports(id) ON DELETE CASCADE;
  END IF;
END $$;

-- REPORT HISTORY TABLE
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID,
  output_format TEXT CHECK (output_format IN ('pdf', 'excel', 'csv', 'json')),
  file_url TEXT,
  file_size_bytes INTEGER,
  delivered_to TEXT[],
  delivery_status TEXT CHECK (delivery_status IN ('success', 'failed', 'partial')),
  execution_time_ms INTEGER
);

-- Add FK for report_history -> custom_reports
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'report_history_custom_report_id_fkey'
  ) THEN
    ALTER TABLE report_history
    ADD CONSTRAINT report_history_custom_report_id_fkey
    FOREIGN KEY (custom_report_id) REFERENCES custom_reports(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- STEP 4: CREATE INDEXES
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_material_forecasts_tenant ON material_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_forecasts_project ON material_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_material_forecasts_date ON material_forecasts(forecast_date);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_tenant ON supplier_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_material ON supplier_catalog(material_name);

CREATE INDEX IF NOT EXISTS idx_purchase_recommendations_tenant ON purchase_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recommendations_status ON purchase_recommendations(status);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_tenant ON financial_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_tenant ON kpi_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON kpi_metrics(metric_date DESC);

CREATE INDEX IF NOT EXISTS idx_client_portal_tenant ON client_portal_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_project ON client_portal_access(project_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_token ON client_portal_access(access_token);

CREATE INDEX IF NOT EXISTS idx_client_messages_tenant ON client_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_project ON client_messages(project_id);

CREATE INDEX IF NOT EXISTS idx_billing_rules_tenant ON billing_automation_rules(tenant_id);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_tenant ON payment_reminders(tenant_id);

CREATE INDEX IF NOT EXISTS idx_custom_reports_tenant ON custom_reports(tenant_id);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report ON report_schedules(custom_report_id);

CREATE INDEX IF NOT EXISTS idx_report_history_report ON report_history(custom_report_id);

-- =====================================================
-- STEP 5: ENABLE RLS
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
-- STEP 6: CREATE POLICIES (now function exists)
-- =====================================================
DO $$
BEGIN
  -- Drop all existing policies first
  DROP POLICY IF EXISTS "Users can view their tenant's forecasts" ON material_forecasts;
  DROP POLICY IF EXISTS "Users can view supplier catalog" ON supplier_catalog;
  DROP POLICY IF EXISTS "Users can view financial snapshots" ON financial_snapshots;
  DROP POLICY IF EXISTS "Users can view KPI metrics" ON kpi_metrics;
  DROP POLICY IF EXISTS "Users can manage client access" ON client_portal_access;
  DROP POLICY IF EXISTS "Users can view client messages" ON client_messages;
  DROP POLICY IF EXISTS "Users can view and create reports" ON custom_reports;
  DROP POLICY IF EXISTS "Users can view report history" ON report_history;

  -- Now create new policies
  EXECUTE 'CREATE POLICY "Users can view their tenant''s forecasts" ON material_forecasts FOR SELECT USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view supplier catalog" ON supplier_catalog FOR SELECT USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view financial snapshots" ON financial_snapshots FOR SELECT USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view KPI metrics" ON kpi_metrics FOR SELECT USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can manage client access" ON client_portal_access FOR ALL USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view client messages" ON client_messages FOR SELECT USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view and create reports" ON custom_reports FOR ALL USING (tenant_id IS NULL OR has_tenant_access(tenant_id))';
  EXECUTE 'CREATE POLICY "Users can view report history" ON report_history FOR SELECT USING (EXISTS (SELECT 1 FROM custom_reports WHERE custom_reports.id = report_history.custom_report_id AND (custom_reports.tenant_id IS NULL OR has_tenant_access(custom_reports.tenant_id))))';
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error creating policies: %', SQLERRM;
END $$;

-- =====================================================
-- STEP 7: ADD COMMENTS
-- =====================================================
COMMENT ON TABLE material_forecasts IS 'AI-predicted material needs for projects';
COMMENT ON TABLE supplier_catalog IS 'Supplier pricing and availability catalog';
COMMENT ON TABLE purchase_recommendations IS 'AI-generated purchase recommendations';
COMMENT ON TABLE financial_snapshots IS 'Daily financial snapshots for dashboards';
COMMENT ON TABLE kpi_metrics IS 'Key performance indicators tracking';
COMMENT ON TABLE client_portal_access IS 'Client portal access credentials';
COMMENT ON TABLE client_messages IS 'Two-way messaging with clients';
COMMENT ON TABLE billing_automation_rules IS 'Automated billing rules and triggers';
COMMENT ON TABLE payment_reminders IS 'Automated payment reminder schedule';
COMMENT ON TABLE custom_reports IS 'User-defined custom reports';
COMMENT ON TABLE report_schedules IS 'Scheduled report generation';
COMMENT ON TABLE report_history IS 'Generated report history and delivery tracking';
