-- =====================================================
-- MULTI-SITE ARCHITECTURE - Phase 2B
-- =====================================================
-- Purpose: Add site_id to remaining tenant-visible tables
-- Migration: Phase 2B - Extended table coverage
-- Date: 2025-11-28
-- Note: This covers additional tables beyond the core set
-- =====================================================

DO $$
DECLARE
  v_builddesk_site_id UUID;
  v_table_name TEXT;
  v_tables_updated INTEGER := 0;
BEGIN
  -- Get Build-Desk site_id
  SELECT id INTO v_builddesk_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;
  
  IF v_builddesk_site_id IS NULL THEN
    RAISE EXCEPTION 'Build-Desk site not found';
  END IF;
  
  -- =====================================================
  -- TEMPLATE TABLES (project_templates, estimate_templates, daily_report_templates)
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'project_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'project_templates' AND column_name = 'site_id') THEN
      ALTER TABLE project_templates ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE project_templates pt SET site_id = c.site_id FROM companies c WHERE pt.company_id = c.id AND pt.site_id IS NULL;
      UPDATE project_templates SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE project_templates ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_project_templates_site_id ON project_templates(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to project_templates';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'estimate_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'estimate_templates' AND column_name = 'site_id') THEN
      ALTER TABLE estimate_templates ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE estimate_templates et SET site_id = c.site_id FROM companies c WHERE et.company_id = c.id AND et.site_id IS NULL;
      UPDATE estimate_templates SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE estimate_templates ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_estimate_templates_site_id ON estimate_templates(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to estimate_templates';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'daily_report_templates') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'daily_report_templates' AND column_name = 'site_id') THEN
      ALTER TABLE daily_report_templates ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE daily_report_templates drt SET site_id = c.site_id FROM companies c WHERE drt.company_id = c.id AND drt.site_id IS NULL;
      UPDATE daily_report_templates SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE daily_report_templates ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_daily_report_templates_site_id ON daily_report_templates(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to daily_report_templates';
    END IF;
  END IF;

  -- =====================================================
  -- APPROVAL/WORKFLOW TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'timesheet_approvals') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'timesheet_approvals' AND column_name = 'site_id') THEN
      ALTER TABLE timesheet_approvals ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE timesheet_approvals ta SET site_id = te.site_id FROM time_entries te WHERE ta.time_entry_id = te.id AND ta.site_id IS NULL;
      UPDATE timesheet_approvals SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE timesheet_approvals ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_timesheet_approvals_site_id ON timesheet_approvals(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to timesheet_approvals';
    END IF;
  END IF;

  -- =====================================================
  -- EQUIPMENT/INVENTORY TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_qr_codes') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'equipment_qr_codes' AND column_name = 'site_id') THEN
      ALTER TABLE equipment_qr_codes ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE equipment_qr_codes eqc SET site_id = c.site_id FROM companies c WHERE eqc.company_id = c.id AND eqc.site_id IS NULL;
      UPDATE equipment_qr_codes SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE equipment_qr_codes ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_equipment_qr_codes_site_id ON equipment_qr_codes(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to equipment_qr_codes';
    END IF;
  END IF;

  -- =====================================================
  -- SAVED FILTERS & USER SETTINGS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'saved_filter_presets') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'saved_filter_presets' AND column_name = 'site_id') THEN
      ALTER TABLE saved_filter_presets ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE saved_filter_presets sfp SET site_id = up.site_id FROM user_profiles up WHERE sfp.user_id = up.id AND sfp.site_id IS NULL;
      UPDATE saved_filter_presets sfp SET site_id = p.site_id FROM profiles p WHERE sfp.user_id = p.id AND sfp.site_id IS NULL;
      UPDATE saved_filter_presets SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE saved_filter_presets ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_saved_filter_presets_site_id ON saved_filter_presets(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to saved_filter_presets';
    END IF;
  END IF;

  -- =====================================================
  -- PAYMENTS & BILLING
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'payments' AND column_name = 'site_id') THEN
      ALTER TABLE payments ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE payments pm SET site_id = i.site_id FROM invoices i WHERE pm.invoice_id = i.id AND pm.site_id IS NULL;
      UPDATE payments pm SET site_id = c.site_id FROM companies c WHERE pm.company_id = c.id AND pm.site_id IS NULL;
      UPDATE payments SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE payments ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_payments_site_id ON payments(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to payments';
    END IF;
  END IF;

  -- =====================================================
  -- QUICKBOOKS INTEGRATION TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quickbooks_expenses') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quickbooks_expenses' AND column_name = 'site_id') THEN
      ALTER TABLE quickbooks_expenses ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE quickbooks_expenses qe SET site_id = c.site_id FROM companies c WHERE qe.company_id = c.id AND qe.site_id IS NULL;
      UPDATE quickbooks_expenses SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE quickbooks_expenses ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_quickbooks_expenses_site_id ON quickbooks_expenses(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to quickbooks_expenses';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'quickbooks_payments') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'quickbooks_payments' AND column_name = 'site_id') THEN
      ALTER TABLE quickbooks_payments ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE quickbooks_payments qp SET site_id = c.site_id FROM companies c WHERE qp.company_id = c.id AND qp.site_id IS NULL;
      UPDATE quickbooks_payments SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE quickbooks_payments ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_quickbooks_payments_site_id ON quickbooks_payments(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to quickbooks_payments';
    END IF;
  END IF;

  -- =====================================================
  -- SEO & CONTENT TABLES
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'seo_keywords') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'seo_keywords' AND column_name = 'site_id') THEN
      ALTER TABLE seo_keywords ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE seo_keywords SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE seo_keywords ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_seo_keywords_site_id ON seo_keywords(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to seo_keywords';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'blog_posts') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'blog_posts' AND column_name = 'site_id') THEN
      ALTER TABLE blog_posts ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      -- Use session_replication_role to bypass triggers during migration
      SET session_replication_role = replica;
      UPDATE blog_posts SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      SET session_replication_role = DEFAULT;
      
      ALTER TABLE blog_posts ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_blog_posts_site_id ON blog_posts(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to blog_posts';
    END IF;
  END IF;

  -- =====================================================
  -- EMAIL & CAMPAIGNS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'email_campaigns') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'site_id') THEN
      ALTER TABLE email_campaigns ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      
      -- Check if company_id column exists, otherwise just set to builddesk
      IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'email_campaigns' AND column_name = 'company_id') THEN
        UPDATE email_campaigns ec SET site_id = c.site_id FROM companies c WHERE ec.company_id = c.id AND ec.site_id IS NULL;
      END IF;
      
      UPDATE email_campaigns SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE email_campaigns ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_email_campaigns_site_id ON email_campaigns(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to email_campaigns';
    END IF;
  END IF;

  -- =====================================================
  -- API & WEBHOOKS
  -- =====================================================
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'api_keys') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'api_keys' AND column_name = 'site_id') THEN
      ALTER TABLE api_keys ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE api_keys ak SET site_id = c.site_id FROM companies c WHERE ak.company_id = c.id AND ak.site_id IS NULL;
      UPDATE api_keys SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE api_keys ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_api_keys_site_id ON api_keys(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to api_keys';
    END IF;
  END IF;

  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'webhooks') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'webhooks' AND column_name = 'site_id') THEN
      ALTER TABLE webhooks ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE RESTRICT;
      UPDATE webhooks w SET site_id = c.site_id FROM companies c WHERE w.company_id = c.id AND w.site_id IS NULL;
      UPDATE webhooks SET site_id = v_builddesk_site_id WHERE site_id IS NULL;
      ALTER TABLE webhooks ALTER COLUMN site_id SET NOT NULL;
      CREATE INDEX idx_webhooks_site_id ON webhooks(site_id);
      v_tables_updated := v_tables_updated + 1;
      RAISE NOTICE '✓ Added site_id to webhooks';
    END IF;
  END IF;

  RAISE NOTICE '✓ Phase 2B migration completed - Updated % additional tables', v_tables_updated;
END $$;

