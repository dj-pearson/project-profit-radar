-- Procurement, Dashboards, Client Portal, Billing & Reporting (FIXED)
-- Migration: 20250202000024
-- Description: Final Phase 5 features with fixed RLS policies

-- =====================================================
-- HELPER FUNCTION FOR TENANT ACCESS
-- =====================================================
-- Create or replace the has_tenant_access function
CREATE OR REPLACE FUNCTION has_tenant_access(check_tenant_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1
    FROM user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.tenant_id = check_tenant_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- MATERIAL FORECASTS TABLE (Procurement)
-- =====================================================
CREATE TABLE IF NOT EXISTS material_forecasts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  material_name TEXT NOT NULL,
  material_category TEXT,

  -- Forecast
  forecast_date DATE NOT NULL,
  forecast_quantity DECIMAL(12,2) NOT NULL,
  forecast_unit TEXT NOT NULL,

  -- Confidence
  confidence_score DECIMAL(5,2),
  based_on_projects_count INTEGER,

  -- Lead time
  estimated_lead_time_days INTEGER,
  recommended_order_date DATE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_material_forecasts_tenant ON material_forecasts(tenant_id);
CREATE INDEX IF NOT EXISTS idx_material_forecasts_project ON material_forecasts(project_id);
CREATE INDEX IF NOT EXISTS idx_material_forecasts_date ON material_forecasts(forecast_date);

-- =====================================================
-- SUPPLIER CATALOG TABLE (Procurement)
-- =====================================================
CREATE TABLE IF NOT EXISTS supplier_catalog (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  supplier_name TEXT NOT NULL,
  supplier_contact TEXT,

  material_name TEXT NOT NULL,
  material_sku TEXT,

  unit_price DECIMAL(12,2) NOT NULL,
  unit TEXT NOT NULL,

  -- Availability
  lead_time_days INTEGER DEFAULT 7,
  minimum_order_quantity DECIMAL(12,2),

  -- Pricing
  bulk_discount_threshold DECIMAL(12,2),
  bulk_discount_percentage DECIMAL(5,2),

  -- Quality
  supplier_rating DECIMAL(3,2), -- 0-5 stars
  last_order_date DATE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_supplier_catalog_tenant ON supplier_catalog(tenant_id);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_material ON supplier_catalog(material_name);
CREATE INDEX IF NOT EXISTS idx_supplier_catalog_price ON supplier_catalog(unit_price);

-- =====================================================
-- PURCHASE RECOMMENDATIONS TABLE (Procurement)
-- =====================================================
CREATE TABLE IF NOT EXISTS purchase_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id),

  material_name TEXT NOT NULL,
  recommended_quantity DECIMAL(12,2) NOT NULL,
  recommended_unit TEXT NOT NULL,

  -- Best supplier
  recommended_supplier_id UUID REFERENCES supplier_catalog(id),
  estimated_cost DECIMAL(12,2),
  estimated_savings DECIMAL(12,2),

  -- Timing
  recommended_order_date DATE NOT NULL,
  expected_delivery_date DATE,

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_purchase_recommendations_tenant ON purchase_recommendations(tenant_id);
CREATE INDEX IF NOT EXISTS idx_purchase_recommendations_status ON purchase_recommendations(status);

-- =====================================================
-- FINANCIAL SNAPSHOTS TABLE (Dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS financial_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  snapshot_date DATE NOT NULL,

  -- Revenue
  total_revenue DECIMAL(14,2) DEFAULT 0,
  revenue_mtd DECIMAL(14,2) DEFAULT 0,
  revenue_ytd DECIMAL(14,2) DEFAULT 0,

  -- Costs
  total_costs DECIMAL(14,2) DEFAULT 0,
  labor_costs DECIMAL(14,2) DEFAULT 0,
  material_costs DECIMAL(14,2) DEFAULT 0,
  overhead_costs DECIMAL(14,2) DEFAULT 0,

  -- Profit
  gross_profit DECIMAL(14,2) DEFAULT 0,
  net_profit DECIMAL(14,2) DEFAULT 0,
  profit_margin DECIMAL(5,2) DEFAULT 0,

  -- Cash
  cash_on_hand DECIMAL(14,2) DEFAULT 0,
  accounts_receivable DECIMAL(14,2) DEFAULT 0,
  accounts_payable DECIMAL(14,2) DEFAULT 0,

  -- Projects
  active_projects_count INTEGER DEFAULT 0,
  completed_projects_count INTEGER DEFAULT 0,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_financial_snapshots_tenant ON financial_snapshots(tenant_id);
CREATE INDEX IF NOT EXISTS idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);

-- =====================================================
-- KPI METRICS TABLE (Dashboards)
-- =====================================================
CREATE TABLE IF NOT EXISTS kpi_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  metric_date DATE NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value DECIMAL(14,2) NOT NULL,
  metric_target DECIMAL(14,2),

  -- Trend
  previous_value DECIMAL(14,2),
  change_percentage DECIMAL(5,2),
  trend TEXT CHECK (trend IN ('up', 'down', 'stable')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_kpi_metrics_tenant ON kpi_metrics(tenant_id);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_date ON kpi_metrics(metric_date DESC);
CREATE INDEX IF NOT EXISTS idx_kpi_metrics_name ON kpi_metrics(metric_name);

-- =====================================================
-- CLIENT PORTAL ACCESS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_portal_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,

  client_email TEXT NOT NULL,
  client_name TEXT NOT NULL,

  -- Access credentials
  access_token TEXT UNIQUE NOT NULL,
  password_hash TEXT,

  -- Permissions
  can_view_financials BOOLEAN DEFAULT FALSE,
  can_approve_change_orders BOOLEAN DEFAULT FALSE,
  can_make_payments BOOLEAN DEFAULT TRUE,
  can_view_documents BOOLEAN DEFAULT TRUE,

  -- Status
  is_active BOOLEAN DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  login_count INTEGER DEFAULT 0,

  -- Expiry
  expires_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_portal_tenant ON client_portal_access(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_project ON client_portal_access(project_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_token ON client_portal_access(access_token);
CREATE INDEX IF NOT EXISTS idx_client_portal_email ON client_portal_access(client_email);

-- =====================================================
-- CLIENT MESSAGES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  client_portal_id UUID REFERENCES client_portal_access(id),

  message_type TEXT CHECK (message_type IN ('message', 'update', 'notification')),

  subject TEXT,
  message TEXT NOT NULL,

  -- Sender
  sent_by_client BOOLEAN DEFAULT FALSE,
  sent_by_user_id UUID REFERENCES user_profiles(id),

  -- Status
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_client_messages_tenant ON client_messages(tenant_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_project ON client_messages(project_id);
CREATE INDEX IF NOT EXISTS idx_client_messages_unread ON client_messages(is_read) WHERE is_read = FALSE;

-- =====================================================
-- BILLING AUTOMATION RULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS billing_automation_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL, -- 'progress', 'milestone', 'time_materials', 'recurring'

  -- Trigger conditions
  trigger_condition JSONB NOT NULL,

  -- Invoice details
  invoice_template_id UUID,
  payment_terms_days INTEGER DEFAULT 30,
  late_fee_percentage DECIMAL(5,2),

  -- Automation
  auto_generate BOOLEAN DEFAULT TRUE,
  auto_send BOOLEAN DEFAULT FALSE,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_billing_rules_tenant ON billing_automation_rules(tenant_id);
CREATE INDEX IF NOT EXISTS idx_billing_rules_type ON billing_automation_rules(rule_type);

-- =====================================================
-- PAYMENT REMINDERS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS payment_reminders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,

  invoice_id UUID, -- Reference to invoices table
  project_id UUID REFERENCES projects(id),

  reminder_type TEXT CHECK (reminder_type IN ('upcoming', 'due_today', 'overdue', 'final_notice')),
  days_before_after INTEGER, -- Negative for before, positive for after

  sent_at TIMESTAMPTZ,
  delivery_method TEXT CHECK (delivery_method IN ('email', 'sms', 'both')),

  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed')),

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_payment_reminders_tenant ON payment_reminders(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payment_reminders_status ON payment_reminders(status);

-- =====================================================
-- CUSTOM REPORTS TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS custom_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  created_by UUID REFERENCES user_profiles(id),

  report_name TEXT NOT NULL,
  report_description TEXT,

  -- Report definition
  report_type TEXT NOT NULL, -- 'financial', 'project', 'labor', 'safety', 'custom'
  data_sources TEXT[] NOT NULL,
  filters JSONB,
  grouping JSONB,
  sorting JSONB,

  -- Visualization
  chart_type TEXT, -- 'table', 'bar', 'line', 'pie', 'area'
  columns JSONB NOT NULL,

  -- Scheduling
  is_scheduled BOOLEAN DEFAULT FALSE,
  schedule_frequency TEXT, -- 'daily', 'weekly', 'monthly'
  schedule_recipients TEXT[],

  -- Access
  is_public BOOLEAN DEFAULT FALSE,
  shared_with TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_custom_reports_tenant ON custom_reports(tenant_id);
CREATE INDEX IF NOT EXISTS idx_custom_reports_type ON custom_reports(report_type);
CREATE INDEX IF NOT EXISTS idx_custom_reports_creator ON custom_reports(created_by);

-- =====================================================
-- REPORT SCHEDULES TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,

  schedule_day_of_week INTEGER, -- 0-6 (Sunday-Saturday)
  schedule_day_of_month INTEGER, -- 1-31
  schedule_time TIME DEFAULT '09:00:00',

  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,

  is_active BOOLEAN DEFAULT TRUE,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_report_schedules_report ON report_schedules(custom_report_id);
CREATE INDEX IF NOT EXISTS idx_report_schedules_next_run ON report_schedules(next_run_at) WHERE is_active = TRUE;

-- =====================================================
-- REPORT HISTORY TABLE
-- =====================================================
CREATE TABLE IF NOT EXISTS report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,

  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID REFERENCES user_profiles(id),

  -- Output
  output_format TEXT CHECK (output_format IN ('pdf', 'excel', 'csv', 'json')),
  file_url TEXT,
  file_size_bytes INTEGER,

  -- Delivery
  delivered_to TEXT[],
  delivery_status TEXT CHECK (delivery_status IN ('success', 'failed', 'partial')),

  execution_time_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_report_history_report ON report_history(custom_report_id);
CREATE INDEX IF NOT EXISTS idx_report_history_date ON report_history(generated_at DESC);

-- =====================================================
-- RLS POLICIES
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

-- Drop existing policies if they exist (to avoid conflicts)
DO $$
BEGIN
  DROP POLICY IF EXISTS "Users can view their tenant's forecasts" ON material_forecasts;
  DROP POLICY IF EXISTS "Users can view supplier catalog" ON supplier_catalog;
  DROP POLICY IF EXISTS "Users can view financial snapshots" ON financial_snapshots;
  DROP POLICY IF EXISTS "Users can view KPI metrics" ON kpi_metrics;
  DROP POLICY IF EXISTS "Users can manage client access" ON client_portal_access;
  DROP POLICY IF EXISTS "Users can view client messages" ON client_messages;
  DROP POLICY IF EXISTS "Users can view and create reports" ON custom_reports;
  DROP POLICY IF EXISTS "Users can view report history" ON report_history;
EXCEPTION
  WHEN OTHERS THEN NULL;
END $$;

-- Procurement policies
CREATE POLICY "Users can view their tenant's forecasts"
  ON material_forecasts FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can view supplier catalog"
  ON supplier_catalog FOR SELECT
  USING (has_tenant_access(tenant_id));

-- Dashboard policies
CREATE POLICY "Users can view financial snapshots"
  ON financial_snapshots FOR SELECT
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can view KPI metrics"
  ON kpi_metrics FOR SELECT
  USING (has_tenant_access(tenant_id));

-- Client portal policies
CREATE POLICY "Users can manage client access"
  ON client_portal_access FOR ALL
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can view client messages"
  ON client_messages FOR SELECT
  USING (has_tenant_access(tenant_id));

-- Reporting policies
CREATE POLICY "Users can view and create reports"
  ON custom_reports FOR ALL
  USING (has_tenant_access(tenant_id));

CREATE POLICY "Users can view report history"
  ON report_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM custom_reports
      WHERE custom_reports.id = report_history.custom_report_id
      AND has_tenant_access(custom_reports.tenant_id)
    )
  );

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
