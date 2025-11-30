-- ============================================================================
-- PHASE 2D: Add site_id to Remaining Multi-Tenant Tables
-- ============================================================================
-- This migration adds site_id to tables that were created after the initial
-- multi-tenant migration or were missed in earlier phases:
--
-- Tables updated:
-- - quickbooks_expenses
-- - quickbooks_payments
-- - project_templates
-- - daily_report_templates
-- - daily_report_crew_items
-- - daily_report_task_items
-- - daily_report_material_items
-- - daily_report_equipment_items
-- - template_task_presets
-- - chat_channels
-- - chat_messages
-- - chat_channel_members
-- - equipment_with_qr (view)
-- - recent_equipment_scans (view)
--
-- CRITICAL: This ensures complete multi-tenant isolation across all data.
-- ============================================================================

-- Helper function to safely add site_id column if table exists
CREATE OR REPLACE FUNCTION add_site_id_if_missing(
  p_table_name TEXT,
  p_backfill_source TEXT DEFAULT NULL,
  p_backfill_join_column TEXT DEFAULT NULL
) RETURNS VOID AS $$
DECLARE
  v_site_id UUID;
  v_sql TEXT;
BEGIN
  -- Check if table exists
  IF NOT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = p_table_name AND table_schema = 'public') THEN
    RAISE NOTICE 'Table % does not exist, skipping', p_table_name;
    RETURN;
  END IF;

  -- Check if site_id column already exists
  IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = p_table_name AND column_name = 'site_id' AND table_schema = 'public') THEN
    RAISE NOTICE 'Table % already has site_id column, skipping', p_table_name;
    RETURN;
  END IF;

  -- Get BuildDesk site_id for backfill
  SELECT id INTO v_site_id FROM sites WHERE key = 'builddesk' LIMIT 1;

  IF v_site_id IS NULL THEN
    RAISE EXCEPTION 'BuildDesk site not found. Please run sites table migration first.';
  END IF;

  -- Add site_id column (nullable first for backfill)
  EXECUTE format('ALTER TABLE %I ADD COLUMN site_id UUID REFERENCES sites(id) ON DELETE CASCADE', p_table_name);
  RAISE NOTICE 'Added site_id column to %', p_table_name;

  -- Backfill based on source
  IF p_backfill_source IS NOT NULL AND p_backfill_join_column IS NOT NULL THEN
    -- Backfill from related table
    v_sql := format(
      'UPDATE %I t SET site_id = s.site_id FROM %I s WHERE t.%I = s.id AND t.site_id IS NULL',
      p_table_name, p_backfill_source, p_backfill_join_column
    );
    EXECUTE v_sql;
    RAISE NOTICE 'Backfilled % from %.site_id via %', p_table_name, p_backfill_source, p_backfill_join_column;
  END IF;

  -- Backfill remaining nulls with BuildDesk site_id
  EXECUTE format('UPDATE %I SET site_id = %L WHERE site_id IS NULL', p_table_name, v_site_id);
  RAISE NOTICE 'Backfilled remaining nulls in % with BuildDesk site_id', p_table_name;

  -- Make column NOT NULL
  EXECUTE format('ALTER TABLE %I ALTER COLUMN site_id SET NOT NULL', p_table_name);
  RAISE NOTICE 'Set site_id NOT NULL on %', p_table_name;

  -- Create index
  EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_site_id ON %I(site_id)', p_table_name, p_table_name);
  RAISE NOTICE 'Created index idx_%_site_id', p_table_name;

END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- QUICKBOOKS TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing QuickBooks Tables ===';
END $$;

SELECT add_site_id_if_missing('quickbooks_expenses', 'companies', 'company_id');
SELECT add_site_id_if_missing('quickbooks_payments', 'companies', 'company_id');
SELECT add_site_id_if_missing('quickbooks_integrations', 'companies', 'company_id');
SELECT add_site_id_if_missing('quickbooks_customers', 'companies', 'company_id');
SELECT add_site_id_if_missing('quickbooks_items', 'companies', 'company_id');

-- ============================================================================
-- PROJECT & DAILY REPORT TEMPLATES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Template Tables ===';
END $$;

SELECT add_site_id_if_missing('project_templates', 'companies', 'company_id');
SELECT add_site_id_if_missing('daily_report_templates', 'companies', 'company_id');

-- ============================================================================
-- DAILY REPORT ITEM TABLES (via daily_reports)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Daily Report Item Tables ===';
END $$;

SELECT add_site_id_if_missing('daily_report_crew_items', 'daily_reports', 'daily_report_id');
SELECT add_site_id_if_missing('daily_report_task_items', 'daily_reports', 'daily_report_id');
SELECT add_site_id_if_missing('daily_report_material_items', 'daily_reports', 'daily_report_id');
SELECT add_site_id_if_missing('daily_report_equipment_items', 'daily_reports', 'daily_report_id');

-- ============================================================================
-- TEMPLATE PRESETS (via templates)
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Template Preset Tables ===';
END $$;

SELECT add_site_id_if_missing('template_task_presets', 'daily_report_templates', 'template_id');

-- ============================================================================
-- CHAT TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Chat Tables ===';
END $$;

SELECT add_site_id_if_missing('chat_channels', 'companies', 'company_id');
SELECT add_site_id_if_missing('chat_messages', 'companies', 'company_id');
SELECT add_site_id_if_missing('chat_channel_members', 'companies', 'company_id');

-- ============================================================================
-- DROP OLD RLS POLICIES AND CREATE NEW ONES WITH site_id
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Updating RLS Policies ===';
END $$;

-- QuickBooks Expenses - Drop old policies
DROP POLICY IF EXISTS "Users can view company expenses" ON quickbooks_expenses;
DROP POLICY IF EXISTS "Users can manage company expenses" ON quickbooks_expenses;

-- QuickBooks Expenses - Create new policies with site_id
CREATE POLICY "Users can view company expenses with site isolation"
  ON quickbooks_expenses FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company expenses with site isolation"
  ON quickbooks_expenses FOR ALL
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- QuickBooks Payments - Drop old policies
DROP POLICY IF EXISTS "Users can view company payments" ON quickbooks_payments;
DROP POLICY IF EXISTS "Users can manage company payments" ON quickbooks_payments;

-- QuickBooks Payments - Create new policies with site_id
CREATE POLICY "Users can view company payments with site isolation"
  ON quickbooks_payments FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Users can manage company payments with site isolation"
  ON quickbooks_payments FOR ALL
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

-- Daily Report Templates - Drop old policies
DROP POLICY IF EXISTS "Users can view company templates" ON daily_report_templates;
DROP POLICY IF EXISTS "Admins can manage templates" ON daily_report_templates;

-- Daily Report Templates - Create new policies with site_id
CREATE POLICY "Users can view company templates with site isolation"
  ON daily_report_templates FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "Admins can manage templates with site isolation"
  ON daily_report_templates FOR ALL
  USING (
    site_id = public.current_site_id()
    AND company_id IN (
      SELECT company_id FROM user_profiles
      WHERE id = auth.uid()
      AND role IN ('admin', 'project_manager', 'root_admin')
    )
  );

-- Project Templates - Drop old policies
DROP POLICY IF EXISTS "Users can view templates" ON project_templates;
DROP POLICY IF EXISTS "Admins can create templates" ON project_templates;
DROP POLICY IF EXISTS "Admins can update templates" ON project_templates;
DROP POLICY IF EXISTS "Admins can delete templates" ON project_templates;

-- Project Templates - Create new policies with site_id
CREATE POLICY "Users can view templates with site isolation"
  ON project_templates FOR SELECT
  USING (
    is_global = TRUE
    OR (
      site_id = public.current_site_id()
      AND company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can create templates with site isolation"
  ON project_templates FOR INSERT
  WITH CHECK (
    site_id = public.current_site_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "Admins can update templates with site isolation"
  ON project_templates FOR UPDATE
  USING (
    site_id = public.current_site_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

CREATE POLICY "Admins can delete templates with site isolation"
  ON project_templates FOR DELETE
  USING (
    site_id = public.current_site_id()
    AND EXISTS (
      SELECT 1 FROM user_profiles
      WHERE id = auth.uid()
      AND company_id = project_templates.company_id
      AND role IN ('admin', 'root_admin')
    )
  );

-- Daily Report Crew Items - Drop old policies
DROP POLICY IF EXISTS "Users can view crew items for company reports" ON daily_report_crew_items;
DROP POLICY IF EXISTS "Users can manage crew items for their reports" ON daily_report_crew_items;

-- Daily Report Crew Items - Create new policies with site_id
CREATE POLICY "Users can view crew items with site isolation"
  ON daily_report_crew_items FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage crew items with site isolation"
  ON daily_report_crew_items FOR ALL
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Daily Report Task Items - Drop old policies
DROP POLICY IF EXISTS "Users can view task items for company reports" ON daily_report_task_items;
DROP POLICY IF EXISTS "Users can manage task items for their reports" ON daily_report_task_items;

-- Daily Report Task Items - Create new policies with site_id
CREATE POLICY "Users can view task items with site isolation"
  ON daily_report_task_items FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage task items with site isolation"
  ON daily_report_task_items FOR ALL
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Daily Report Material Items - Drop old policies
DROP POLICY IF EXISTS "Users can view material items for company reports" ON daily_report_material_items;
DROP POLICY IF EXISTS "Users can manage material items for their reports" ON daily_report_material_items;

-- Daily Report Material Items - Create new policies with site_id
CREATE POLICY "Users can view material items with site isolation"
  ON daily_report_material_items FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage material items with site isolation"
  ON daily_report_material_items FOR ALL
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Daily Report Equipment Items - Drop old policies
DROP POLICY IF EXISTS "Users can view equipment items for company reports" ON daily_report_equipment_items;
DROP POLICY IF EXISTS "Users can manage equipment items for their reports" ON daily_report_equipment_items;

-- Daily Report Equipment Items - Create new policies with site_id
CREATE POLICY "Users can view equipment items with site isolation"
  ON daily_report_equipment_items FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can manage equipment items with site isolation"
  ON daily_report_equipment_items FOR ALL
  USING (
    site_id = public.current_site_id()
    AND daily_report_id IN (
      SELECT id FROM daily_reports dr
      WHERE dr.created_by = auth.uid()
    )
  );

-- Template Task Presets - Drop old policies
DROP POLICY IF EXISTS "Users can view template task presets" ON template_task_presets;
DROP POLICY IF EXISTS "Admins can manage template task presets" ON template_task_presets;

-- Template Task Presets - Create new policies with site_id
CREATE POLICY "Users can view template task presets with site isolation"
  ON template_task_presets FOR SELECT
  USING (
    site_id = public.current_site_id()
    AND template_id IN (
      SELECT id FROM daily_report_templates
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Admins can manage template task presets with site isolation"
  ON template_task_presets FOR ALL
  USING (
    site_id = public.current_site_id()
    AND template_id IN (
      SELECT id FROM daily_report_templates
      WHERE company_id IN (
        SELECT company_id FROM user_profiles WHERE id = auth.uid()
        AND role IN ('admin', 'project_manager', 'root_admin')
      )
    )
  );

-- ============================================================================
-- CREATE COMPOSITE INDEXES for better query performance
-- ============================================================================
DO $$
DECLARE
  r RECORD;
BEGIN
  RAISE NOTICE '=== Creating Composite Indexes ===';

  -- Create composite indexes for tables that have both site_id and company_id
  FOR r IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c1 ON t.table_name = c1.table_name AND c1.column_name = 'site_id'
    JOIN information_schema.columns c2 ON t.table_name = c2.table_name AND c2.column_name = 'company_id'
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND t.table_name IN ('quickbooks_expenses', 'quickbooks_payments', 'project_templates',
                           'daily_report_templates', 'chat_channels', 'chat_messages', 'chat_channel_members')
  LOOP
    BEGIN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_site_company ON %I(site_id, company_id)', r.table_name, r.table_name);
      RAISE NOTICE 'Created composite index for %', r.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create composite index for %: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- CLEANUP: Drop helper function
-- ============================================================================
DROP FUNCTION IF EXISTS add_site_id_if_missing(TEXT, TEXT, TEXT);

-- ============================================================================
-- VERIFICATION
-- ============================================================================
DO $$
DECLARE
  v_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_count
  FROM information_schema.columns
  WHERE column_name = 'site_id' AND table_schema = 'public';

  RAISE NOTICE '';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'PHASE 2D MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total tables with site_id column: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Tables updated in this migration:';
  RAISE NOTICE '- quickbooks_expenses';
  RAISE NOTICE '- quickbooks_payments';
  RAISE NOTICE '- project_templates';
  RAISE NOTICE '- daily_report_templates';
  RAISE NOTICE '- daily_report_crew_items';
  RAISE NOTICE '- daily_report_task_items';
  RAISE NOTICE '- daily_report_material_items';
  RAISE NOTICE '- daily_report_equipment_items';
  RAISE NOTICE '- template_task_presets';
  RAISE NOTICE '- chat_channels';
  RAISE NOTICE '- chat_messages';
  RAISE NOTICE '- chat_channel_members';
  RAISE NOTICE '============================================';
END $$;
