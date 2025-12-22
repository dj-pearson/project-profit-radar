-- ============================================================================
-- ROLLBACK MULTI-TENANT ARCHITECTURE TO SINGLE-TENANT
-- ============================================================================
-- This migration removes all multi-tenant infrastructure and reverts to
-- single-tenant architecture where BuildDesk operates independently.
--
-- WARNING: This is a destructive operation. Backup your database first!
--
-- Execution time: ~5-10 minutes
-- Tables affected: 30+ tables
-- ============================================================================

-- Step 1: Drop the auth.current_site_id() helper function
-- ============================================================================
DROP FUNCTION IF EXISTS auth.current_site_id();

-- Step 2: Revert RLS Policies to Company-Only Isolation
-- ============================================================================

-- Companies Table
DROP POLICY IF EXISTS "Site isolation" ON companies;
DROP POLICY IF EXISTS "Users can view companies in their site" ON companies;
DROP POLICY IF EXISTS "Users can insert companies in their site" ON companies;
DROP POLICY IF EXISTS "Users can update companies in their site" ON companies;

CREATE POLICY "Users can view own company"
  ON companies FOR SELECT
  USING (
    id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Admins can insert companies"
  ON companies FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin')
    )
  );

CREATE POLICY "Admins can update own company"
  ON companies FOR UPDATE
  USING (
    id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin')
    )
  );

-- User Profiles Table
DROP POLICY IF EXISTS "Site isolation" ON user_profiles;
DROP POLICY IF EXISTS "Users can view profiles in their site and company" ON user_profiles;

CREATE POLICY "Users can view own profile"
  ON user_profiles FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "Users can update own profile"
  ON user_profiles FOR UPDATE
  USING (user_id = auth.uid());

-- Projects Table
DROP POLICY IF EXISTS "Site isolation" ON projects;
DROP POLICY IF EXISTS "Users can view projects in their site and company" ON projects;
DROP POLICY IF EXISTS "Users can insert projects in their site and company" ON projects;
DROP POLICY IF EXISTS "Users can update projects in their site and company" ON projects;

CREATE POLICY "Users can view company projects"
  ON projects FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can insert projects"
  ON projects FOR INSERT
  WITH CHECK (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager')
    )
  );

CREATE POLICY "Users can update projects"
  ON projects FOR UPDATE
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin', 'project_manager')
    )
  );

-- Time Entries Table
DROP POLICY IF EXISTS "Site isolation" ON time_entries;
DROP POLICY IF EXISTS "Users can view time entries in their site and company" ON time_entries;

CREATE POLICY "Users can view own time entries"
  ON time_entries FOR SELECT
  USING (
    user_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM user_profiles
      WHERE user_id = auth.uid()
      AND company_id = time_entries.company_id
      AND role IN ('root_admin', 'admin', 'project_manager')
    )
  );

CREATE POLICY "Users can insert own time entries"
  ON time_entries FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- Financial Records Table
DROP POLICY IF EXISTS "Site isolation" ON financial_records;
DROP POLICY IF EXISTS "Users can view financial records in their site and company" ON financial_records;

CREATE POLICY "Accounting can view financial records"
  ON financial_records FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin', 'accounting')
    )
  );

-- Documents Table
DROP POLICY IF EXISTS "Site isolation" ON documents;
DROP POLICY IF EXISTS "Users can view documents in their site and company" ON documents;

CREATE POLICY "Users can view company documents"
  ON documents FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Expenses Table
DROP POLICY IF EXISTS "Site isolation" ON expenses;
DROP POLICY IF EXISTS "Users can view expenses in their site and company" ON expenses;

CREATE POLICY "Users can view company expenses"
  ON expenses FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Invoices Table
DROP POLICY IF EXISTS "Site isolation" ON invoices;
DROP POLICY IF EXISTS "Users can view invoices in their site and company" ON invoices;

CREATE POLICY "Users can view company invoices"
  ON invoices FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Estimates Table
DROP POLICY IF EXISTS "Site isolation" ON estimates;
DROP POLICY IF EXISTS "Users can view estimates in their site and company" ON estimates;

CREATE POLICY "Users can view company estimates"
  ON estimates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Tasks Table
DROP POLICY IF EXISTS "Site isolation" ON tasks;
DROP POLICY IF EXISTS "Users can view tasks in their site and company" ON tasks;

CREATE POLICY "Users can view project tasks"
  ON tasks FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- CRM Contacts Table
DROP POLICY IF EXISTS "Site isolation" ON crm_contacts;
DROP POLICY IF EXISTS "Users can view contacts in their site and company" ON crm_contacts;

CREATE POLICY "Users can view company contacts"
  ON crm_contacts FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- CRM Leads Table
DROP POLICY IF EXISTS "Site isolation" ON crm_leads;
DROP POLICY IF EXISTS "Users can view leads in their site and company" ON crm_leads;

CREATE POLICY "Users can view company leads"
  ON crm_leads FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Notifications Table
DROP POLICY IF EXISTS "Site isolation" ON notifications;
DROP POLICY IF EXISTS "Users can view notifications in their site" ON notifications;

CREATE POLICY "Users can view own notifications"
  ON notifications FOR SELECT
  USING (user_id = auth.uid());

-- Audit Logs Table
DROP POLICY IF EXISTS "Site isolation" ON audit_logs;
DROP POLICY IF EXISTS "Admins can view audit logs in their site" ON audit_logs;

CREATE POLICY "Admins can view company audit logs"
  ON audit_logs FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
      AND role IN ('root_admin', 'admin')
    )
  );

-- Crew GPS Check-ins Table
DROP POLICY IF EXISTS "Site isolation" ON crew_gps_checkins;
DROP POLICY IF EXISTS "Users can view GPS check-ins in their site" ON crew_gps_checkins;

CREATE POLICY "Users can view company GPS check-ins"
  ON crew_gps_checkins FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Daily Reports Table
DROP POLICY IF EXISTS "Site isolation" ON daily_reports;
DROP POLICY IF EXISTS "Users can view daily reports in their site" ON daily_reports;

CREATE POLICY "Users can view project daily reports"
  ON daily_reports FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Change Orders Table
DROP POLICY IF EXISTS "Site isolation" ON change_orders;
DROP POLICY IF EXISTS "Users can view change orders in their site" ON change_orders;

CREATE POLICY "Users can view project change orders"
  ON change_orders FOR SELECT
  USING (
    project_id IN (
      SELECT id FROM projects
      WHERE company_id IN (
        SELECT company_id FROM user_profiles
        WHERE user_id = auth.uid()
      )
    )
  );

-- Project Templates
DROP POLICY IF EXISTS "Site isolation" ON project_templates;
DROP POLICY IF EXISTS "Users can view templates in their site" ON project_templates;

CREATE POLICY "Users can view company templates"
  ON project_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Estimate Templates
DROP POLICY IF EXISTS "Site isolation" ON estimate_templates;
DROP POLICY IF EXISTS "Users can view estimate templates in their site" ON estimate_templates;

CREATE POLICY "Users can view company estimate templates"
  ON estimate_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Daily Report Templates
DROP POLICY IF EXISTS "Site isolation" ON daily_report_templates;
DROP POLICY IF EXISTS "Users can view daily report templates in their site" ON daily_report_templates;

CREATE POLICY "Users can view company daily report templates"
  ON daily_report_templates FOR SELECT
  USING (
    company_id IN (
      SELECT company_id FROM user_profiles
      WHERE user_id = auth.uid()
    )
  );

-- Step 3: Drop site_id Indexes
-- ============================================================================

DROP INDEX IF EXISTS idx_companies_site_id;
DROP INDEX IF EXISTS idx_companies_site_company;
DROP INDEX IF EXISTS idx_user_profiles_site_id;
DROP INDEX IF EXISTS idx_user_profiles_site_company;
DROP INDEX IF EXISTS idx_projects_site_id;
DROP INDEX IF EXISTS idx_projects_site_company;
DROP INDEX IF EXISTS idx_time_entries_site_id;
DROP INDEX IF EXISTS idx_time_entries_site_company;
DROP INDEX IF EXISTS idx_financial_records_site_id;
DROP INDEX IF EXISTS idx_financial_records_site_company;
DROP INDEX IF EXISTS idx_documents_site_id;
DROP INDEX IF EXISTS idx_documents_site_company;
DROP INDEX IF EXISTS idx_expenses_site_id;
DROP INDEX IF EXISTS idx_expenses_site_company;
DROP INDEX IF EXISTS idx_invoices_site_id;
DROP INDEX IF EXISTS idx_invoices_site_company;
DROP INDEX IF EXISTS idx_estimates_site_id;
DROP INDEX IF EXISTS idx_estimates_site_company;
DROP INDEX IF EXISTS idx_tasks_site_id;
DROP INDEX IF EXISTS idx_crm_contacts_site_id;
DROP INDEX IF EXISTS idx_crm_contacts_site_company;
DROP INDEX IF EXISTS idx_crm_leads_site_id;
DROP INDEX IF EXISTS idx_crm_leads_site_company;
DROP INDEX IF EXISTS idx_notifications_site_id;
DROP INDEX IF EXISTS idx_audit_logs_site_id;
DROP INDEX IF EXISTS idx_crew_gps_checkins_site_id;
DROP INDEX IF EXISTS idx_daily_reports_site_id;
DROP INDEX IF EXISTS idx_change_orders_site_id;

-- Step 4: Remove site_id Columns
-- ============================================================================

-- Core tables
ALTER TABLE companies DROP COLUMN IF EXISTS site_id;
ALTER TABLE user_profiles DROP COLUMN IF EXISTS site_id;
ALTER TABLE projects DROP COLUMN IF EXISTS site_id;
ALTER TABLE time_entries DROP COLUMN IF EXISTS site_id;
ALTER TABLE financial_records DROP COLUMN IF EXISTS site_id;
ALTER TABLE documents DROP COLUMN IF EXISTS site_id;
ALTER TABLE expenses DROP COLUMN IF EXISTS site_id;
ALTER TABLE invoices DROP COLUMN IF EXISTS site_id;
ALTER TABLE estimates DROP COLUMN IF EXISTS site_id;
ALTER TABLE tasks DROP COLUMN IF EXISTS site_id;
ALTER TABLE crm_contacts DROP COLUMN IF EXISTS site_id;
ALTER TABLE crm_leads DROP COLUMN IF EXISTS site_id;
ALTER TABLE notifications DROP COLUMN IF EXISTS site_id;
ALTER TABLE audit_logs DROP COLUMN IF EXISTS site_id;
ALTER TABLE crew_gps_checkins DROP COLUMN IF EXISTS site_id;
ALTER TABLE daily_reports DROP COLUMN IF EXISTS site_id;
ALTER TABLE change_orders DROP COLUMN IF EXISTS site_id;

-- Extended tables
ALTER TABLE project_templates DROP COLUMN IF EXISTS site_id;
ALTER TABLE estimate_templates DROP COLUMN IF EXISTS site_id;
ALTER TABLE daily_report_templates DROP COLUMN IF EXISTS site_id;
ALTER TABLE timesheet_approvals DROP COLUMN IF EXISTS site_id;
ALTER TABLE equipment_qr_codes DROP COLUMN IF EXISTS site_id;
ALTER TABLE saved_filter_presets DROP COLUMN IF EXISTS site_id;
ALTER TABLE payments DROP COLUMN IF EXISTS site_id;

-- Check if these tables exist before dropping columns
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quickbooks_expenses') THEN
    ALTER TABLE quickbooks_expenses DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quickbooks_payments') THEN
    ALTER TABLE quickbooks_payments DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seo_keywords') THEN
    ALTER TABLE seo_keywords DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    ALTER TABLE blog_posts DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    ALTER TABLE email_campaigns DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    ALTER TABLE api_keys DROP COLUMN IF EXISTS site_id;
  END IF;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    ALTER TABLE webhooks DROP COLUMN IF EXISTS site_id;
  END IF;
END $$;

-- Step 5: Drop Site-Related Helper Functions
-- ============================================================================

DROP FUNCTION IF EXISTS get_site_by_domain(TEXT);
DROP FUNCTION IF EXISTS get_site_by_key(TEXT);

-- Step 6: Drop Sites Table
-- ============================================================================

DROP TABLE IF EXISTS sites CASCADE;

-- ============================================================================
-- ROLLBACK COMPLETE
-- ============================================================================

-- Verify rollback
DO $$
DECLARE
  site_id_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO site_id_count
  FROM information_schema.columns
  WHERE column_name = 'site_id';
  
  RAISE NOTICE 'Rollback complete!';
  RAISE NOTICE 'Remaining tables with site_id column: %', site_id_count;
  RAISE NOTICE 'Expected: 0 (if all tables were cleaned up)';
  
  IF site_id_count > 0 THEN
    RAISE WARNING 'Some tables still have site_id column. Review manually.';
  END IF;
END $$;

