-- ============================================================================
-- CRM Multi-Tenant Site ID Migration
-- ============================================================================
-- This migration adds site_id to CRM-related tables for multi-tenant isolation
-- Tables: contacts, crm_activities, email_templates, workflow_definitions,
--         workflow_execution_logs, deals, opportunities
-- ============================================================================

-- ============================================================================
-- 1. CONTACTS TABLE
-- ============================================================================

-- Add site_id column to contacts (nullable first for backfill)
ALTER TABLE contacts ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill existing contacts with BuildDesk site_id via company relationship
UPDATE contacts c
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = c.company_id
)
WHERE c.site_id IS NULL AND c.company_id IS NOT NULL;

-- For any remaining records without company_id, use default BuildDesk site
UPDATE contacts
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Now make site_id NOT NULL
ALTER TABLE contacts ALTER COLUMN site_id SET NOT NULL;

-- Create indexes for contacts
CREATE INDEX IF NOT EXISTS idx_contacts_site_id ON contacts(site_id);
CREATE INDEX IF NOT EXISTS idx_contacts_site_company ON contacts(site_id, company_id);

-- Drop existing RLS policies for contacts
DROP POLICY IF EXISTS "Users can view contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can insert contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can update contacts in their company" ON contacts;
DROP POLICY IF EXISTS "Users can delete contacts in their company" ON contacts;
DROP POLICY IF EXISTS "contacts_site_isolation" ON contacts;

-- Create new RLS policies with site_id isolation
CREATE POLICY "contacts_select_site_company" ON contacts
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "contacts_insert_site_company" ON contacts
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "contacts_update_site_company" ON contacts
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "contacts_delete_site_company" ON contacts
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

-- Enable RLS
ALTER TABLE contacts ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 2. CRM_ACTIVITIES TABLE
-- ============================================================================

-- Add site_id column to crm_activities
ALTER TABLE crm_activities ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via company relationship
UPDATE crm_activities ca
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = ca.company_id
)
WHERE ca.site_id IS NULL AND ca.company_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE crm_activities
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE crm_activities ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_crm_activities_site_id ON crm_activities(site_id);
CREATE INDEX IF NOT EXISTS idx_crm_activities_site_company ON crm_activities(site_id, company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view CRM activities in their company" ON crm_activities;
DROP POLICY IF EXISTS "Users can manage CRM activities in their company" ON crm_activities;
DROP POLICY IF EXISTS "crm_activities_site_isolation" ON crm_activities;

-- Create new RLS policies
CREATE POLICY "crm_activities_select_site_company" ON crm_activities
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "crm_activities_insert_site_company" ON crm_activities
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "crm_activities_update_site_company" ON crm_activities
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "crm_activities_delete_site_company" ON crm_activities
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE crm_activities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 3. EMAIL_TEMPLATES TABLE
-- ============================================================================

-- Add site_id column
ALTER TABLE email_templates ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via company relationship
UPDATE email_templates et
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = et.company_id
)
WHERE et.site_id IS NULL AND et.company_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE email_templates
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE email_templates ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_email_templates_site_id ON email_templates(site_id);
CREATE INDEX IF NOT EXISTS idx_email_templates_site_company ON email_templates(site_id, company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view email templates in their company" ON email_templates;
DROP POLICY IF EXISTS "Users can manage email templates in their company" ON email_templates;
DROP POLICY IF EXISTS "email_templates_site_isolation" ON email_templates;

-- Create new RLS policies
CREATE POLICY "email_templates_select_site_company" ON email_templates
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "email_templates_insert_site_company" ON email_templates
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "email_templates_update_site_company" ON email_templates
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "email_templates_delete_site_company" ON email_templates
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 4. WORKFLOW_DEFINITIONS TABLE
-- ============================================================================

-- Add site_id column
ALTER TABLE workflow_definitions ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via company relationship
UPDATE workflow_definitions wd
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = wd.company_id
)
WHERE wd.site_id IS NULL AND wd.company_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE workflow_definitions
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE workflow_definitions ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_site_id ON workflow_definitions(site_id);
CREATE INDEX IF NOT EXISTS idx_workflow_definitions_site_company ON workflow_definitions(site_id, company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view workflow definitions in their company" ON workflow_definitions;
DROP POLICY IF EXISTS "Users can manage workflow definitions in their company" ON workflow_definitions;
DROP POLICY IF EXISTS "workflow_definitions_site_isolation" ON workflow_definitions;

-- Create new RLS policies
CREATE POLICY "workflow_definitions_select_site_company" ON workflow_definitions
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "workflow_definitions_insert_site_company" ON workflow_definitions
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "workflow_definitions_update_site_company" ON workflow_definitions
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "workflow_definitions_delete_site_company" ON workflow_definitions
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE workflow_definitions ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 5. WORKFLOW_EXECUTION_LOGS TABLE
-- ============================================================================

-- Add site_id column (get from workflow_definitions via workflow_id)
ALTER TABLE workflow_execution_logs ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via workflow_definitions relationship (workflow_id references workflows table)
UPDATE workflow_execution_logs wel
SET site_id = (
  SELECT w.site_id
  FROM workflows w
  WHERE w.id = wel.workflow_id
)
WHERE wel.site_id IS NULL AND wel.workflow_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE workflow_execution_logs
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE workflow_execution_logs ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_workflow_execution_logs_site_id ON workflow_execution_logs(site_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view workflow execution logs" ON workflow_execution_logs;
DROP POLICY IF EXISTS "workflow_execution_logs_site_isolation" ON workflow_execution_logs;

-- Create new RLS policies (site isolation only, no company_id in this table)
CREATE POLICY "workflow_execution_logs_select_site" ON workflow_execution_logs
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "workflow_execution_logs_insert_site" ON workflow_execution_logs
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE workflow_execution_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 6. DEALS TABLE
-- ============================================================================

-- Add site_id column
ALTER TABLE deals ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via company relationship
UPDATE deals d
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = d.company_id
)
WHERE d.site_id IS NULL AND d.company_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE deals
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE deals ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_deals_site_id ON deals(site_id);
CREATE INDEX IF NOT EXISTS idx_deals_site_company ON deals(site_id, company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view deals in their company" ON deals;
DROP POLICY IF EXISTS "Users can manage deals in their company" ON deals;
DROP POLICY IF EXISTS "deals_site_isolation" ON deals;

-- Create new RLS policies
CREATE POLICY "deals_select_site_company" ON deals
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "deals_insert_site_company" ON deals
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "deals_update_site_company" ON deals
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "deals_delete_site_company" ON deals
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE deals ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- 7. OPPORTUNITIES TABLE
-- ============================================================================

-- Add site_id column
ALTER TABLE opportunities ADD COLUMN IF NOT EXISTS site_id UUID REFERENCES sites(id);

-- Backfill via company relationship
UPDATE opportunities o
SET site_id = (
  SELECT comp.site_id
  FROM companies comp
  WHERE comp.id = o.company_id
)
WHERE o.site_id IS NULL AND o.company_id IS NOT NULL;

-- Fallback to BuildDesk site
UPDATE opportunities
SET site_id = (SELECT id FROM sites WHERE key = 'builddesk' LIMIT 1)
WHERE site_id IS NULL;

-- Make NOT NULL
ALTER TABLE opportunities ALTER COLUMN site_id SET NOT NULL;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_opportunities_site_id ON opportunities(site_id);
CREATE INDEX IF NOT EXISTS idx_opportunities_site_company ON opportunities(site_id, company_id);

-- Drop existing RLS policies
DROP POLICY IF EXISTS "Users can view opportunities in their company" ON opportunities;
DROP POLICY IF EXISTS "Users can manage opportunities in their company" ON opportunities;
DROP POLICY IF EXISTS "opportunities_site_isolation" ON opportunities;

-- Create new RLS policies
CREATE POLICY "opportunities_select_site_company" ON opportunities
  FOR SELECT USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "opportunities_insert_site_company" ON opportunities
  FOR INSERT WITH CHECK (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "opportunities_update_site_company" ON opportunities
  FOR UPDATE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

CREATE POLICY "opportunities_delete_site_company" ON opportunities
  FOR DELETE USING (
    site_id IN (SELECT site_id FROM user_profiles WHERE user_id = auth.uid())
    AND company_id IN (SELECT company_id FROM user_profiles WHERE user_id = auth.uid())
  );

ALTER TABLE opportunities ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VERIFICATION QUERY (Run manually to verify migration)
-- ============================================================================
-- SELECT
--   'contacts' as table_name, COUNT(*) as total, COUNT(site_id) as with_site_id FROM contacts
-- UNION ALL
-- SELECT 'crm_activities', COUNT(*), COUNT(site_id) FROM crm_activities
-- UNION ALL
-- SELECT 'email_templates', COUNT(*), COUNT(site_id) FROM email_templates
-- UNION ALL
-- SELECT 'workflow_definitions', COUNT(*), COUNT(site_id) FROM workflow_definitions
-- UNION ALL
-- SELECT 'workflow_execution_logs', COUNT(*), COUNT(site_id) FROM workflow_execution_logs
-- UNION ALL
-- SELECT 'deals', COUNT(*), COUNT(site_id) FROM deals
-- UNION ALL
-- SELECT 'opportunities', COUNT(*), COUNT(site_id) FROM opportunities;
