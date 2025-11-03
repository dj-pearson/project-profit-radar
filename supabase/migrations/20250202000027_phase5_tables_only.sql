-- Phase 5 Tables - Simple Version (No RLS, No Functions)
-- Migration: 20250202000027
-- Description: Create Phase 5 tables without complex dependencies

-- Drop tables if they exist (to start fresh)
DROP TABLE IF EXISTS report_history CASCADE;
DROP TABLE IF EXISTS report_schedules CASCADE;
DROP TABLE IF EXISTS custom_reports CASCADE;
DROP TABLE IF EXISTS payment_reminders CASCADE;
DROP TABLE IF EXISTS billing_automation_rules CASCADE;
DROP TABLE IF EXISTS client_messages CASCADE;
DROP TABLE IF EXISTS client_portal_access CASCADE;
DROP TABLE IF EXISTS kpi_metrics CASCADE;
DROP TABLE IF EXISTS financial_snapshots CASCADE;
DROP TABLE IF EXISTS purchase_recommendations CASCADE;
DROP TABLE IF EXISTS supplier_catalog CASCADE;
DROP TABLE IF EXISTS material_forecasts CASCADE;

-- MATERIAL FORECASTS
CREATE TABLE material_forecasts (
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

-- SUPPLIER CATALOG
CREATE TABLE supplier_catalog (
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

-- PURCHASE RECOMMENDATIONS
CREATE TABLE purchase_recommendations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  material_name TEXT NOT NULL,
  recommended_quantity DECIMAL(12,2) NOT NULL,
  recommended_unit TEXT NOT NULL,
  recommended_supplier_id UUID REFERENCES supplier_catalog(id),
  estimated_cost DECIMAL(12,2),
  estimated_savings DECIMAL(12,2),
  recommended_order_date DATE NOT NULL,
  expected_delivery_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'ordered', 'received', 'cancelled')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- FINANCIAL SNAPSHOTS
CREATE TABLE financial_snapshots (
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

-- KPI METRICS
CREATE TABLE kpi_metrics (
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

-- CLIENT PORTAL ACCESS
CREATE TABLE client_portal_access (
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

-- CLIENT MESSAGES
CREATE TABLE client_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID,
  project_id UUID,
  client_portal_id UUID REFERENCES client_portal_access(id),
  message_type TEXT CHECK (message_type IN ('message', 'update', 'notification')),
  subject TEXT,
  message TEXT NOT NULL,
  sent_by_client BOOLEAN DEFAULT FALSE,
  sent_by_user_id UUID,
  is_read BOOLEAN DEFAULT FALSE,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- BILLING AUTOMATION RULES
CREATE TABLE billing_automation_rules (
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

-- PAYMENT REMINDERS
CREATE TABLE payment_reminders (
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

-- CUSTOM REPORTS
CREATE TABLE custom_reports (
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

-- REPORT SCHEDULES
CREATE TABLE report_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  schedule_day_of_week INTEGER,
  schedule_day_of_month INTEGER,
  schedule_time TIME DEFAULT '09:00:00',
  last_run_at TIMESTAMPTZ,
  next_run_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- REPORT HISTORY
CREATE TABLE report_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  custom_report_id UUID NOT NULL REFERENCES custom_reports(id) ON DELETE CASCADE,
  generated_at TIMESTAMPTZ DEFAULT NOW(),
  generated_by UUID,
  output_format TEXT CHECK (output_format IN ('pdf', 'excel', 'csv', 'json')),
  file_url TEXT,
  file_size_bytes INTEGER,
  delivered_to TEXT[],
  delivery_status TEXT CHECK (delivery_status IN ('success', 'failed', 'partial')),
  execution_time_ms INTEGER
);

-- CREATE INDEXES
CREATE INDEX idx_material_forecasts_tenant ON material_forecasts(tenant_id);
CREATE INDEX idx_material_forecasts_date ON material_forecasts(forecast_date);

CREATE INDEX idx_supplier_catalog_tenant ON supplier_catalog(tenant_id);
CREATE INDEX idx_supplier_catalog_material ON supplier_catalog(material_name);

CREATE INDEX idx_purchase_recommendations_tenant ON purchase_recommendations(tenant_id);

CREATE INDEX idx_financial_snapshots_tenant ON financial_snapshots(tenant_id);
CREATE INDEX idx_financial_snapshots_date ON financial_snapshots(snapshot_date DESC);

CREATE INDEX idx_kpi_metrics_tenant ON kpi_metrics(tenant_id);
CREATE INDEX idx_kpi_metrics_date ON kpi_metrics(metric_date DESC);

CREATE INDEX idx_client_portal_tenant ON client_portal_access(tenant_id);
CREATE INDEX idx_client_portal_token ON client_portal_access(access_token);

CREATE INDEX idx_client_messages_tenant ON client_messages(tenant_id);

CREATE INDEX idx_billing_rules_tenant ON billing_automation_rules(tenant_id);

CREATE INDEX idx_payment_reminders_tenant ON payment_reminders(tenant_id);

CREATE INDEX idx_custom_reports_tenant ON custom_reports(tenant_id);

CREATE INDEX idx_report_schedules_report ON report_schedules(custom_report_id);

CREATE INDEX idx_report_history_report ON report_history(custom_report_id);

-- ADD COMMENTS
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
