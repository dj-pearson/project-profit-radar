-- Phase 5 Sample Data
-- Migration: 20250202000029
-- Description: Insert sample data for testing Phase 5 features

-- Note: This uses the first tenant_id from the tenants table
-- If no tenants exist, this will create sample data without tenant_id

DO $$
DECLARE
  sample_tenant_id UUID;
  sample_project_id UUID;
  sample_supplier_id UUID;
  sample_report_id UUID;
  sample_forecast_id UUID;
BEGIN
  -- Get first tenant (or null if none exist)
  SELECT id INTO sample_tenant_id FROM tenants LIMIT 1;

  -- Get first project (or null if none exist)
  SELECT id INTO sample_project_id FROM projects LIMIT 1;

  RAISE NOTICE 'Using tenant_id: %, project_id: %', sample_tenant_id, sample_project_id;

  -- =====================================================
  -- SUPPLIER CATALOG
  -- =====================================================
  INSERT INTO supplier_catalog (tenant_id, supplier_name, supplier_contact, material_name, material_sku, unit_price, unit, lead_time_days, minimum_order_quantity, bulk_discount_threshold, bulk_discount_percentage, supplier_rating, is_active)
  VALUES
    (sample_tenant_id, 'ABC Building Supply', 'john@abcsupply.com', '2x4 Lumber', 'LMB-001', 8.50, 'piece', 5, 100, 500, 10, 4.5, true),
    (sample_tenant_id, 'ABC Building Supply', 'john@abcsupply.com', 'Concrete Mix', 'CON-001', 125.00, 'bag', 3, 10, 50, 15, 4.5, true),
    (sample_tenant_id, 'XYZ Materials Co', 'sales@xyzmaterials.com', '2x4 Lumber', 'XYZ-LMB-100', 8.25, 'piece', 7, 50, 300, 8, 4.2, true),
    (sample_tenant_id, 'XYZ Materials Co', 'sales@xyzmaterials.com', 'Drywall Sheets', 'DRY-001', 15.00, 'sheet', 5, 20, 100, 12, 4.2, true),
    (sample_tenant_id, 'BuildPro Depot', 'orders@buildpro.com', 'Rebar #4', 'RBR-004', 12.00, 'piece', 10, 50, 200, 10, 4.7, true),
    (sample_tenant_id, 'BuildPro Depot', 'orders@buildpro.com', 'PVC Pipe 4"', 'PVC-004', 22.00, 'piece', 7, 10, 50, 15, 4.7, true),
    (sample_tenant_id, 'Premier Concrete', 'info@premierconcrete.com', 'Concrete Mix', 'PC-CONC-80', 120.00, 'bag', 2, 20, 100, 20, 4.9, true),
    (sample_tenant_id, 'FastTrade Lumber', 'sales@fasttrade.com', '2x6 Lumber', 'FT-2X6', 12.00, 'piece', 4, 100, 400, 12, 4.3, true)
  ON CONFLICT DO NOTHING;

  -- Get a supplier ID for foreign key reference
  SELECT id INTO sample_supplier_id FROM supplier_catalog WHERE tenant_id = sample_tenant_id LIMIT 1;

  -- =====================================================
  -- MATERIAL FORECASTS
  -- =====================================================
  INSERT INTO material_forecasts (tenant_id, project_id, material_name, material_category, forecast_date, forecast_quantity, forecast_unit, confidence_score, based_on_projects_count, estimated_lead_time_days, recommended_order_date)
  VALUES
    (sample_tenant_id, sample_project_id, '2x4 Lumber', 'Lumber', (CURRENT_DATE + INTERVAL '30 days')::DATE, 500, 'piece', 85.5, 8, 7, (CURRENT_DATE + INTERVAL '23 days')::DATE),
    (sample_tenant_id, sample_project_id, 'Concrete Mix', 'Concrete', (CURRENT_DATE + INTERVAL '45 days')::DATE, 150, 'bag', 78.3, 5, 3, (CURRENT_DATE + INTERVAL '42 days')::DATE),
    (sample_tenant_id, sample_project_id, 'Drywall Sheets', 'Drywall', (CURRENT_DATE + INTERVAL '60 days')::DATE, 300, 'sheet', 82.1, 7, 5, (CURRENT_DATE + INTERVAL '55 days')::DATE),
    (sample_tenant_id, sample_project_id, 'Rebar #4', 'Steel', (CURRENT_DATE + INTERVAL '35 days')::DATE, 250, 'piece', 88.9, 10, 10, (CURRENT_DATE + INTERVAL '25 days')::DATE),
    (sample_tenant_id, sample_project_id, 'PVC Pipe 4"', 'Plumbing', (CURRENT_DATE + INTERVAL '50 days')::DATE, 100, 'piece', 75.0, 4, 7, (CURRENT_DATE + INTERVAL '43 days')::DATE)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PURCHASE RECOMMENDATIONS
  -- =====================================================
  INSERT INTO purchase_recommendations (tenant_id, project_id, material_name, recommended_quantity, recommended_unit, recommended_supplier_id, estimated_cost, estimated_savings, recommended_order_date, expected_delivery_date, status)
  VALUES
    (sample_tenant_id, sample_project_id, '2x4 Lumber', 500, 'piece', sample_supplier_id, 4250.00, 125.00, (CURRENT_DATE + INTERVAL '5 days')::DATE, (CURRENT_DATE + INTERVAL '12 days')::DATE, 'pending'),
    (sample_tenant_id, sample_project_id, 'Concrete Mix', 150, 'bag', sample_supplier_id, 18750.00, 750.00, (CURRENT_DATE + INTERVAL '10 days')::DATE, (CURRENT_DATE + INTERVAL '13 days')::DATE, 'pending'),
    (sample_tenant_id, sample_project_id, 'Drywall Sheets', 300, 'sheet', sample_supplier_id, 4500.00, 180.00, (CURRENT_DATE + INTERVAL '15 days')::DATE, (CURRENT_DATE + INTERVAL '20 days')::DATE, 'approved')
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- FINANCIAL SNAPSHOTS
  -- =====================================================
  INSERT INTO financial_snapshots (tenant_id, snapshot_date, total_revenue, revenue_mtd, revenue_ytd, total_costs, labor_costs, material_costs, overhead_costs, gross_profit, net_profit, profit_margin, cash_on_hand, accounts_receivable, accounts_payable, active_projects_count, completed_projects_count)
  VALUES
    (sample_tenant_id, CURRENT_DATE, 1250000.00, 350000.00, 4500000.00, 950000.00, 420000.00, 380000.00, 150000.00, 300000.00, 250000.00, 20.0, 750000.00, 420000.00, 180000.00, 12, 28),
    (sample_tenant_id, (CURRENT_DATE - INTERVAL '1 day')::DATE, 1230000.00, 330000.00, 4480000.00, 935000.00, 415000.00, 375000.00, 145000.00, 295000.00, 245000.00, 19.9, 735000.00, 410000.00, 175000.00, 12, 28),
    (sample_tenant_id, (CURRENT_DATE - INTERVAL '7 days')::DATE, 1180000.00, 280000.00, 4430000.00, 895000.00, 395000.00, 355000.00, 145000.00, 285000.00, 235000.00, 19.9, 705000.00, 395000.00, 170000.00, 11, 27)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- KPI METRICS
  -- =====================================================
  INSERT INTO kpi_metrics (tenant_id, metric_date, metric_name, metric_value, metric_target, previous_value, change_percentage, trend)
  VALUES
    (sample_tenant_id, CURRENT_DATE, 'Gross Profit Margin', 24.5, 25.0, 24.2, 1.2, 'up'),
    (sample_tenant_id, CURRENT_DATE, 'Project Completion Rate', 88.5, 90.0, 87.3, 1.4, 'up'),
    (sample_tenant_id, CURRENT_DATE, 'Customer Satisfaction', 4.6, 4.5, 4.5, 2.2, 'up'),
    (sample_tenant_id, CURRENT_DATE, 'Safety Incident Rate', 1.2, 1.0, 1.3, -7.7, 'down'),
    (sample_tenant_id, CURRENT_DATE, 'On-Time Delivery', 92.3, 95.0, 91.8, 0.5, 'up'),
    (sample_tenant_id, (CURRENT_DATE - INTERVAL '7 days')::DATE, 'Gross Profit Margin', 24.2, 25.0, 23.8, 1.7, 'up'),
    (sample_tenant_id, (CURRENT_DATE - INTERVAL '7 days')::DATE, 'Project Completion Rate', 87.3, 90.0, 86.5, 0.9, 'up')
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- CLIENT PORTAL ACCESS
  -- =====================================================
  INSERT INTO client_portal_access (tenant_id, project_id, client_email, client_name, access_token, can_view_financials, can_approve_change_orders, can_make_payments, can_view_documents, is_active, login_count, expires_at)
  VALUES
    (sample_tenant_id, sample_project_id, 'client1@example.com', 'John Smith', encode(gen_random_bytes(32), 'hex'), true, true, true, true, true, 15, (CURRENT_DATE + INTERVAL '90 days')::TIMESTAMPTZ),
    (sample_tenant_id, sample_project_id, 'client2@example.com', 'Jane Doe', encode(gen_random_bytes(32), 'hex'), false, false, true, true, true, 8, (CURRENT_DATE + INTERVAL '90 days')::TIMESTAMPTZ)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- CLIENT MESSAGES
  -- =====================================================
  INSERT INTO client_messages (tenant_id, project_id, message_type, subject, message, sent_by_client, is_read)
  VALUES
    (sample_tenant_id, sample_project_id, 'message', 'Question about timeline', 'When do you expect to complete the foundation work?', true, false),
    (sample_tenant_id, sample_project_id, 'update', 'Foundation Complete', 'We have completed the foundation work ahead of schedule.', false, true),
    (sample_tenant_id, sample_project_id, 'notification', 'Inspection Scheduled', 'Building inspection scheduled for next Tuesday at 10 AM.', false, true)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- BILLING AUTOMATION RULES
  -- =====================================================
  INSERT INTO billing_automation_rules (tenant_id, rule_name, rule_type, trigger_condition, payment_terms_days, late_fee_percentage, auto_generate, auto_send, is_active)
  VALUES
    (sample_tenant_id, 'Monthly Progress Billing', 'progress_billing', '{"trigger": "monthly", "day": 1}'::JSONB, 30, 2.5, true, true, true),
    (sample_tenant_id, 'Milestone Completion', 'milestone', '{"trigger": "milestone_complete"}'::JSONB, 15, 3.0, true, false, true),
    (sample_tenant_id, 'Final Payment', 'final_payment', '{"trigger": "project_complete"}'::JSONB, 45, 1.5, true, true, true)
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- PAYMENT REMINDERS
  -- =====================================================
  INSERT INTO payment_reminders (tenant_id, invoice_id, project_id, reminder_type, days_before_after, delivery_method, status)
  VALUES
    (sample_tenant_id, 'INV-2025-001', sample_project_id, 'upcoming', 7, 'email', 'pending'),
    (sample_tenant_id, 'INV-2025-002', sample_project_id, 'due_today', 0, 'email', 'sent'),
    (sample_tenant_id, 'INV-2025-003', sample_project_id, 'overdue', -3, 'both', 'pending')
  ON CONFLICT DO NOTHING;

  -- =====================================================
  -- CUSTOM REPORTS
  -- =====================================================
  INSERT INTO custom_reports (tenant_id, report_name, report_description, report_type, data_sources, filters, columns, is_scheduled, schedule_frequency, schedule_recipients, is_public)
  VALUES
    (sample_tenant_id, 'Weekly Project Status', 'Summary of all active projects with budget vs actual', 'project_status', ARRAY['projects', 'financial_records'], '{"projects": {"status": {"operator": "eq", "value": "active"}}}'::JSONB, '[{"name": "name", "label": "Project Name"}, {"name": "budget", "label": "Budget"}, {"name": "actual_cost", "label": "Actual Cost"}]'::JSONB, true, 'weekly', ARRAY['manager@example.com'], false),
    (sample_tenant_id, 'Material Cost Analysis', 'Detailed material costs by category', 'financial', ARRAY['material_forecasts', 'supplier_catalog'], NULL, '[{"name": "material_name", "label": "Material"}, {"name": "forecast_quantity", "label": "Quantity"}, {"name": "unit_price", "label": "Unit Price"}]'::JSONB, false, NULL, NULL, false),
    (sample_tenant_id, 'Monthly Financial Summary', 'Monthly revenue, costs, and profit margins', 'financial', ARRAY['financial_snapshots'], NULL, '[{"name": "snapshot_date", "label": "Date"}, {"name": "total_revenue", "label": "Revenue"}, {"name": "total_costs", "label": "Costs"}, {"name": "net_profit", "label": "Profit"}]'::JSONB, true, 'monthly', ARRAY['accounting@example.com', 'ceo@example.com'], false)
  ON CONFLICT DO NOTHING
  RETURNING id INTO sample_report_id;

  -- =====================================================
  -- REPORT SCHEDULES
  -- =====================================================
  IF sample_report_id IS NOT NULL THEN
    INSERT INTO report_schedules (custom_report_id, schedule_day_of_week, schedule_time, is_active)
    VALUES
      (sample_report_id, 1, '09:00:00', true)  -- Every Monday at 9 AM
    ON CONFLICT DO NOTHING;
  END IF;

  -- =====================================================
  -- REPORT HISTORY
  -- =====================================================
  IF sample_report_id IS NOT NULL THEN
    INSERT INTO report_history (custom_report_id, output_format, file_size_bytes, delivered_to, delivery_status, execution_time_ms)
    VALUES
      (sample_report_id, 'csv', 15234, ARRAY['manager@example.com'], 'success', 234),
      (sample_report_id, 'pdf', 45678, ARRAY['manager@example.com', 'ceo@example.com'], 'success', 456)
    ON CONFLICT DO NOTHING;
  END IF;

  RAISE NOTICE 'Phase 5 sample data inserted successfully';

EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error inserting Phase 5 sample data: %', SQLERRM;
END $$;
