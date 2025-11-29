-- ============================================================================
-- PHASE 2C: Add site_id to Remaining Tables
-- ============================================================================
-- This migration adds site_id to all tables that were created after the
-- initial multi-tenant migration (20251128) or were missed in earlier phases.
--
-- CRITICAL: This ensures complete multi-tenant isolation across all data.
-- ============================================================================

-- Helper function to safely add site_id column if table exists
CREATE OR REPLACE FUNCTION add_site_id_if_table_exists(
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
-- QUALITY & INSPECTION TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Quality & Inspection Tables ===';
END $$;

SELECT add_site_id_if_table_exists('quality_inspections', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('inspection_deficiencies', 'quality_inspections', 'inspection_id');

-- ============================================================================
-- WARRANTY MANAGEMENT TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Warranty Tables ===';
END $$;

SELECT add_site_id_if_table_exists('warranties', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('warranty_claims', 'warranties', 'warranty_id');
SELECT add_site_id_if_table_exists('warranty_transfers', 'warranties', 'warranty_id');

-- ============================================================================
-- WEATHER INTEGRATION TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Weather Tables ===';
END $$;

SELECT add_site_id_if_table_exists('weather_sensitive_activities', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('weather_schedule_adjustments', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('weather_forecasts', 'projects', 'project_id');

-- ============================================================================
-- LEAD INTELLIGENCE & SCORING TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Lead Intelligence Tables ===';
END $$;

SELECT add_site_id_if_table_exists('lead_behavioral_data', 'crm_leads', 'lead_id');
SELECT add_site_id_if_table_exists('lead_sources', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('lead_attribution', 'crm_leads', 'lead_id');
SELECT add_site_id_if_table_exists('predictive_models', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('ai_lead_scores', 'crm_leads', 'lead_id');
SELECT add_site_id_if_table_exists('lead_nurturing_campaigns', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('nurturing_campaign_steps', 'lead_nurturing_campaigns', 'campaign_id');
SELECT add_site_id_if_table_exists('lead_nurturing_enrollments', 'crm_leads', 'lead_id');
SELECT add_site_id_if_table_exists('lead_qualification_workflows', 'companies', 'company_id');

-- ============================================================================
-- ANALYTICS & PREDICTION TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Analytics Tables ===';
END $$;

SELECT add_site_id_if_table_exists('project_predictions', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('prediction_performance', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('project_historical_data', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('analytics_dashboard_cache', 'companies', 'company_id');

-- ============================================================================
-- SEO MANAGEMENT TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing SEO Tables ===';
END $$;

SELECT add_site_id_if_table_exists('seo_settings', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_audit_history', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_fixes_applied', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_keyword_history', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_competitor_analysis', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_page_scores', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('seo_monitoring_log', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('keyword_research_data', 'companies', 'company_id');

-- ============================================================================
-- EMAIL MARKETING & AUTOMATION TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Email Marketing Tables ===';
END $$;

SELECT add_site_id_if_table_exists('email_marketing_templates', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('automated_workflow_definitions', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('automated_workflow_executions', 'automated_workflow_definitions', 'workflow_id');
SELECT add_site_id_if_table_exists('email_lists', 'companies', 'company_id');

-- ============================================================================
-- PROJECT RELATED TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Project Related Tables ===';
END $$;

SELECT add_site_id_if_table_exists('project_contacts', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('punch_list_items', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('project_phases', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('project_milestones', 'projects', 'project_id');

-- ============================================================================
-- SECURITY TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Security Tables ===';
END $$;

SELECT add_site_id_if_table_exists('security_incidents', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('incident_response_team', 'security_incidents', 'incident_id');
SELECT add_site_id_if_table_exists('incident_response_playbooks', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('incident_activities', 'security_incidents', 'incident_id');
SELECT add_site_id_if_table_exists('incident_metrics', 'security_incidents', 'incident_id');
SELECT add_site_id_if_table_exists('user_security', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('security_logs', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('csp_violations', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('security_rate_limits', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('rate_limit_rules', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('rate_limit_state', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('ip_access_control', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('ddos_detection_logs', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('rate_limit_violations', 'companies', 'company_id');

-- ============================================================================
-- TASK RELATED TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Task Related Tables ===';
END $$;

SELECT add_site_id_if_table_exists('task_dependencies', 'tasks', 'task_id');
SELECT add_site_id_if_table_exists('task_resource_allocations', 'tasks', 'task_id');

-- ============================================================================
-- FINANCIAL & ACCOUNTING TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Financial Tables ===';
END $$;

SELECT add_site_id_if_table_exists('cost_codes', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('job_costs', 'projects', 'project_id');
SELECT add_site_id_if_table_exists('forms_1099', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('chart_of_accounts', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('journal_entries', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('bills', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('fiscal_periods', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('bank_accounts', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('vendors', 'companies', 'company_id');

-- ============================================================================
-- DOCUMENT RELATED TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Document Tables ===';
END $$;

SELECT add_site_id_if_table_exists('document_categories', 'companies', 'company_id');

-- ============================================================================
-- SOCIAL MEDIA & CONTENT TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Social Media Tables ===';
END $$;

SELECT add_site_id_if_table_exists('automated_social_posts_config', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('social_posts', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('social_media_accounts', 'companies', 'company_id');

-- ============================================================================
-- USER PREFERENCES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing User Preferences Tables ===';
END $$;

SELECT add_site_id_if_table_exists('user_preferences', 'user_profiles', 'user_id');

-- ============================================================================
-- CRM ADDITIONAL TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing CRM Additional Tables ===';
END $$;

SELECT add_site_id_if_table_exists('leads', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('call_logs', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('bookings', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('deals', 'companies', 'company_id');

-- ============================================================================
-- RESOURCE OPTIMIZATION TABLES
-- ============================================================================
DO $$
BEGIN
  RAISE NOTICE '=== Processing Resource Optimization Tables ===';
END $$;

SELECT add_site_id_if_table_exists('resource_optimization_configs', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('resource_optimization_runs', 'companies', 'company_id');
SELECT add_site_id_if_table_exists('resource_conflicts', 'companies', 'company_id');

-- ============================================================================
-- CLEANUP: Drop helper function
-- ============================================================================
DROP FUNCTION IF EXISTS add_site_id_if_table_exists(TEXT, TEXT, TEXT);

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
  LOOP
    BEGIN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_site_company ON %I(site_id, company_id)', r.table_name, r.table_name);
      RAISE NOTICE 'Created composite index for %', r.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create composite index for %: %', r.table_name, SQLERRM;
    END;
  END LOOP;

  -- Create composite indexes for tables that have both site_id and project_id
  FOR r IN
    SELECT t.table_name
    FROM information_schema.tables t
    JOIN information_schema.columns c1 ON t.table_name = c1.table_name AND c1.column_name = 'site_id'
    JOIN information_schema.columns c2 ON t.table_name = c2.table_name AND c2.column_name = 'project_id'
    WHERE t.table_schema = 'public' AND t.table_type = 'BASE TABLE'
      AND NOT EXISTS (
        SELECT 1 FROM information_schema.columns c3
        WHERE c3.table_name = t.table_name AND c3.column_name = 'company_id'
      )
  LOOP
    BEGIN
      EXECUTE format('CREATE INDEX IF NOT EXISTS idx_%I_site_project ON %I(site_id, project_id)', r.table_name, r.table_name);
      RAISE NOTICE 'Created composite index (site_id, project_id) for %', r.table_name;
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'Could not create composite index for %: %', r.table_name, SQLERRM;
    END;
  END LOOP;
END $$;

-- ============================================================================
-- VERIFICATION: Count tables with site_id
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
  RAISE NOTICE 'PHASE 2C MIGRATION COMPLETE';
  RAISE NOTICE '============================================';
  RAISE NOTICE 'Total tables with site_id column: %', v_count;
  RAISE NOTICE '';
  RAISE NOTICE 'Next steps:';
  RAISE NOTICE '1. Update RLS policies for new tables';
  RAISE NOTICE '2. Update edge functions to filter by site_id';
  RAISE NOTICE '3. Update frontend queries to include site_id';
  RAISE NOTICE '============================================';
END $$;
