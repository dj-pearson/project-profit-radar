-- =====================================================
-- MULTI-SITE ARCHITECTURE - Phase 2
-- =====================================================
-- Purpose: Add site_id column to all tenant-visible tables
-- Migration: Phase 2 - Add site_id columns with foreign keys
-- Date: 2025-11-28
-- IMPORTANT: This migration adds site_id to core tables and backfills with Build-Desk site_id
-- =====================================================

-- =====================================================
-- 1. ADD SITE_ID TO CORE TENANT TABLES
-- =====================================================

DO $$
DECLARE
  v_builddesk_site_id UUID;
BEGIN
  -- Get Build-Desk site_id
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;
  
  IF v_builddesk_site_id IS NULL THEN
    RAISE EXCEPTION 'Build-Desk site not found. Run migration 20251128000001_create_sites_table.sql first.';
  END IF;
  
  RAISE NOTICE 'Using Build-Desk site_id: %', v_builddesk_site_id;
  
  -- =====================================================
  -- COMPANIES TABLE
  -- =====================================================
  -- Companies are the primary tenant entity
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'companies' AND column_name = 'site_id') THEN
    ALTER TABLE companies ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
    
    -- Backfill existing companies with Build-Desk site_id
    UPDATE companies SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
    
    -- Make site_id required for new records
    ALTER TABLE companies ALTER COLUMN site_id SET NOT NULL;
    
    -- Add index for performance
    CREATE INDEX idx_companies_site_id ON companies(site_id);
    
    RAISE NOTICE '✓ Added site_id to companies table';
  END IF;

  -- =====================================================
  -- USER_PROFILES TABLE (or PROFILES)
  -- =====================================================
  -- Check both table names as they might vary
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'user_profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'user_profiles' AND column_name = 'site_id') THEN
      ALTER TABLE user_profiles ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      -- Backfill via company relationship
      UPDATE user_profiles up
      SET site_id = c.site_id
      FROM companies c
      WHERE up.company_id = c.id
      AND up.site_id IS NULL;
      
      -- For users without company, use Build-Desk
      UPDATE user_profiles SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE user_profiles ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_user_profiles_site_id ON user_profiles(site_id);
      
      RAISE NOTICE '✓ Added site_id to user_profiles table';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'site_id') THEN
      ALTER TABLE profiles ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE profiles p
      SET site_id = c.site_id
      FROM companies c
      WHERE p.company_id = c.id
      AND p.site_id IS NULL;
      
      UPDATE profiles SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE profiles ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_profiles_site_id ON profiles(site_id);
      
      RAISE NOTICE '✓ Added site_id to profiles table';
    END IF;
  END IF;

  -- =====================================================
  -- PROJECTS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'projects') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'projects' AND column_name = 'site_id') THEN
      ALTER TABLE projects ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE projects p
      SET site_id = c.site_id
      FROM companies c
      WHERE p.company_id = c.id
      AND p.site_id IS NULL;
      
      ALTER TABLE projects ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_projects_site_id ON projects(site_id);
      CREATE INDEX idx_projects_site_company ON projects(site_id, company_id);
      
      RAISE NOTICE '✓ Added site_id to projects table';
    END IF;
  END IF;

  -- =====================================================
  -- TIME_ENTRIES TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'time_entries') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'time_entries' AND column_name = 'site_id') THEN
      ALTER TABLE time_entries ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE time_entries te
      SET site_id = p.site_id
      FROM projects p
      WHERE te.project_id = p.id
      AND te.site_id IS NULL;
      
      ALTER TABLE time_entries ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_time_entries_site_id ON time_entries(site_id);
      
      RAISE NOTICE '✓ Added site_id to time_entries table';
    END IF;
  END IF;

  -- =====================================================
  -- FINANCIAL_RECORDS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'financial_records') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'financial_records' AND column_name = 'site_id') THEN
      ALTER TABLE financial_records ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE financial_records fr
      SET site_id = p.site_id
      FROM projects p
      WHERE fr.project_id = p.id
      AND fr.site_id IS NULL;
      
      ALTER TABLE financial_records ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_financial_records_site_id ON financial_records(site_id);
      
      RAISE NOTICE '✓ Added site_id to financial_records table';
    END IF;
  END IF;

  -- =====================================================
  -- DOCUMENTS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'documents') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'documents' AND column_name = 'site_id') THEN
      ALTER TABLE documents ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      -- Backfill via company or project relationship
      UPDATE documents d
      SET site_id = c.site_id
      FROM companies c
      WHERE d.company_id = c.id
      AND d.site_id IS NULL;
      
      UPDATE documents d
      SET site_id = p.site_id
      FROM projects p
      WHERE d.project_id = p.id
      AND d.site_id IS NULL;
      
      UPDATE documents SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE documents ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_documents_site_id ON documents(site_id);
      
      RAISE NOTICE '✓ Added site_id to documents table';
    END IF;
  END IF;

  -- =====================================================
  -- EXPENSES TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'expenses' AND column_name = 'site_id') THEN
      ALTER TABLE expenses ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE expenses e
      SET site_id = p.site_id
      FROM projects p
      WHERE e.project_id = p.id
      AND e.site_id IS NULL;
      
      UPDATE expenses e
      SET site_id = c.site_id
      FROM companies c
      WHERE e.company_id = c.id
      AND e.site_id IS NULL;
      
      UPDATE expenses SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE expenses ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_expenses_site_id ON expenses(site_id);
      
      RAISE NOTICE '✓ Added site_id to expenses table';
    END IF;
  END IF;

  -- =====================================================
  -- INVOICES TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'invoices') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'invoices' AND column_name = 'site_id') THEN
      ALTER TABLE invoices ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE invoices i
      SET site_id = c.site_id
      FROM companies c
      WHERE i.company_id = c.id
      AND i.site_id IS NULL;
      
      UPDATE invoices i
      SET site_id = p.site_id
      FROM projects p
      WHERE i.project_id = p.id
      AND i.site_id IS NULL;
      
      UPDATE invoices SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE invoices ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_invoices_site_id ON invoices(site_id);
      
      RAISE NOTICE '✓ Added site_id to invoices table';
    END IF;
  END IF;

  -- =====================================================
  -- ESTIMATES TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimates' AND column_name = 'site_id') THEN
      ALTER TABLE estimates ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE estimates e
      SET site_id = c.site_id
      FROM companies c
      WHERE e.company_id = c.id
      AND e.site_id IS NULL;
      
      UPDATE estimates e
      SET site_id = p.site_id
      FROM projects p
      WHERE e.project_id = p.id
      AND e.site_id IS NULL;
      
      UPDATE estimates SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE estimates ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_estimates_site_id ON estimates(site_id);
      
      RAISE NOTICE '✓ Added site_id to estimates table';
    END IF;
  END IF;

  -- =====================================================
  -- TASKS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'tasks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'tasks' AND column_name = 'site_id') THEN
      ALTER TABLE tasks ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE tasks t
      SET site_id = p.site_id
      FROM projects p
      WHERE t.project_id = p.id
      AND t.site_id IS NULL;
      
      UPDATE tasks SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE tasks ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_tasks_site_id ON tasks(site_id);
      
      RAISE NOTICE '✓ Added site_id to tasks table';
    END IF;
  END IF;

  -- =====================================================
  -- CRM TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_contacts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_contacts' AND column_name = 'site_id') THEN
      ALTER TABLE crm_contacts ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE crm_contacts cc
      SET site_id = c.site_id
      FROM companies c
      WHERE cc.company_id = c.id
      AND cc.site_id IS NULL;
      
      UPDATE crm_contacts SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE crm_contacts ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_crm_contacts_site_id ON crm_contacts(site_id);
      
      RAISE NOTICE '✓ Added site_id to crm_contacts table';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crm_leads') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crm_leads' AND column_name = 'site_id') THEN
      ALTER TABLE crm_leads ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE crm_leads cl
      SET site_id = c.site_id
      FROM companies c
      WHERE cl.company_id = c.id
      AND cl.site_id IS NULL;
      
      UPDATE crm_leads SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE crm_leads ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_crm_leads_site_id ON crm_leads(site_id);
      
      RAISE NOTICE '✓ Added site_id to crm_leads table';
    END IF;
  END IF;

  -- =====================================================
  -- NOTIFICATIONS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'notifications' AND column_name = 'site_id') THEN
      ALTER TABLE notifications ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE notifications n
      SET site_id = up.site_id
      FROM user_profiles up
      WHERE n.user_id = up.id
      AND n.site_id IS NULL;
      
      UPDATE notifications n
      SET site_id = p.site_id
      FROM profiles p
      WHERE n.user_id = p.id
      AND n.site_id IS NULL;
      
      UPDATE notifications SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE notifications ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_notifications_site_id ON notifications(site_id);
      
      RAISE NOTICE '✓ Added site_id to notifications table';
    END IF;
  END IF;

  -- =====================================================
  -- AUDIT_LOGS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'audit_logs') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'audit_logs' AND column_name = 'site_id') THEN
      ALTER TABLE audit_logs ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE audit_logs al
      SET site_id = up.site_id
      FROM user_profiles up
      WHERE al.user_id = up.id
      AND al.site_id IS NULL;
      
      UPDATE audit_logs al
      SET site_id = p.site_id
      FROM profiles p
      WHERE al.user_id = p.id
      AND al.site_id IS NULL;
      
      UPDATE audit_logs SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE audit_logs ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_audit_logs_site_id ON audit_logs(site_id);
      
      RAISE NOTICE '✓ Added site_id to audit_logs table';
    END IF;
  END IF;

  -- =====================================================
  -- GPS/LOCATION TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'crew_gps_checkins') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'crew_gps_checkins' AND column_name = 'site_id') THEN
      ALTER TABLE crew_gps_checkins ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE crew_gps_checkins cgc
      SET site_id = p.site_id
      FROM projects p
      WHERE cgc.project_id = p.id
      AND cgc.site_id IS NULL;
      
      UPDATE crew_gps_checkins SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE crew_gps_checkins ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_crew_gps_checkins_site_id ON crew_gps_checkins(site_id);
      
      RAISE NOTICE '✓ Added site_id to crew_gps_checkins table';
    END IF;
  END IF;

  -- =====================================================
  -- DAILY_REPORTS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_reports') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_reports' AND column_name = 'site_id') THEN
      ALTER TABLE daily_reports ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE daily_reports dr
      SET site_id = p.site_id
      FROM projects p
      WHERE dr.project_id = p.id
      AND dr.site_id IS NULL;
      
      UPDATE daily_reports SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE daily_reports ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_daily_reports_site_id ON daily_reports(site_id);
      
      RAISE NOTICE '✓ Added site_id to daily_reports table';
    END IF;
  END IF;

  -- =====================================================
  -- CHANGE_ORDERS TABLE
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'change_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'change_orders' AND column_name = 'site_id') THEN
      ALTER TABLE change_orders ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      UPDATE change_orders co
      SET site_id = p.site_id
      FROM projects p
      WHERE co.project_id = p.id
      AND co.site_id IS NULL;
      
      UPDATE change_orders SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      
      ALTER TABLE change_orders ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_change_orders_site_id ON change_orders(site_id);
      
      RAISE NOTICE '✓ Added site_id to change_orders table';
    END IF;
  END IF;

  RAISE NOTICE '✓ Phase 2 migration completed - site_id added to core tables';
END $$;

