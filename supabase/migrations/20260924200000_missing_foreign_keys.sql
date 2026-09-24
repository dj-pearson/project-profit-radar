-- Missing foreign keys on company_id / project_id / client_id (US-277).
--
-- docs/archive/DATABASE_SCHEMA_DOCUMENTATION.md listed "missing foreign key
-- relationships" as an open required fix. The audit behind this list: every
-- table whose Row type in src/integrations/supabase/types.ts (generated from
-- the live schema) has company_id, project_id or client_id with no matching
-- entry in its Relationships, plus the tables migrations create with a bare
-- company_id/project_id that are absent from the types. Each column was
-- checked against the CREATE TABLE / ADD COLUMN that made it: all are uuid.
--
-- NOT VALID, because a plain ADD FOREIGN KEY scans every existing row and
-- fails the push on the first orphan, and some of these columns have gone
-- unchecked since 2025. NOT VALID enforces the key for every INSERT and
-- UPDATE from now on and leaves existing rows alone. Nothing here deletes or
-- rewrites a row. Validating is a later, separate migration, run only after
-- the owner has run the orphan report in docs/RUNBOOK_FK_VALIDATION.md and
-- decided what to do with any orphans it finds.
--
-- ON DELETE, by what the app actually deletes:
--   * companies: nothing in src/ or supabase/functions deletes a company.
--     Operational and derived tables CASCADE, matching the 285 existing
--     company_id keys. Money and audit records (audit_logs, payment
--     applications, retention, subcontractor payments, collections, recurring
--     invoices, estimate versions) are NO ACTION: deleting a company that has
--     them fails instead of erasing them.
--   * projects: admins hard-delete projects (projectService.deleteProject and
--     the projects edge function). Child rows with a NOT NULL project_id
--     CASCADE; nullable ones SET NULL so the row survives unlinked. Money
--     rows (budget lines and tracking, labour costs, payment applications,
--     retention items, subcontractor payments, collection items) are NO
--     ACTION, the same as bills, estimates, change_orders and journal_entries
--     already are: a project with financial history cannot be deleted.
--   * contacts: CRM deletes contacts, so client_id is SET NULL.
--   * Where a migration already declares the key (types.ts is hand-edited and
--     often omits Relationships) the action here repeats that declaration, so
--     a database that has it and one that somehow lacks it end up the same.
--
-- Skipped at run time, with a NOTICE, rather than failing the push:
--   * the table, the target or the column does not exist (some tables here
--     exist in migrations but not live, or the reverse);
--   * the column is not uuid;
--   * the table already has any foreign key to the same target. That covers
--     keys a migration declared inline, and composite keys such as
--     bid_packages (project_id, company_id) -> projects. It also keeps
--     PostgREST embeds unambiguous: two keys between one pair of tables turn
--     an embed into a PGRST201 error.
--
-- Left out on purpose:
--   * retention_tracking: exists live, created by no migration.
--   * bid_packages.project_id: already covered by its composite key.
--
-- Indexes on the new key columns are in 20260924200001, a separate file
-- because CREATE INDEX CONCURRENTLY cannot run inside this transaction.
--
-- Locks: each ADD CONSTRAINT takes SHARE ROW EXCLUSIVE on the table and its
-- target until commit, with no table scan. lock_timeout makes a busy table
-- fail the migration quickly instead of queueing every request behind it;
-- rerun it, it is idempotent.

DO $$
DECLARE
  r record;
  v_rel regclass;
  v_ref regclass;
  v_type regtype;
  v_name text;
  v_added int := 0;
  v_skipped int := 0;
BEGIN
  PERFORM set_config('lock_timeout', '10s', true);

  FOR r IN
    SELECT * FROM (VALUES
    ('access_control_matrix',          'company_id', 'companies', 'CASCADE'),
    ('activity_feed',                  'company_id', 'companies', 'CASCADE'),
    ('activity_feed',                  'project_id', 'projects',  'SET NULL'),
    ('ai_defect_detection',            'company_id', 'companies', 'CASCADE'),
    ('ai_progress_tracking',           'company_id', 'companies', 'CASCADE'),
    ('ai_progress_tracking',           'project_id', 'projects',  'CASCADE'),
    ('ai_quality_analysis',            'company_id', 'companies', 'CASCADE'),
    ('ai_quality_analysis',            'project_id', 'projects',  'CASCADE'),
    ('ai_safety_analysis',             'company_id', 'companies', 'CASCADE'),
    ('analytics_dashboard_cache',      'company_id', 'companies', 'CASCADE'),
    ('api_keys',                       'company_id', 'companies', 'CASCADE'),
    ('api_request_logs',               'company_id', 'companies', 'CASCADE'),
    ('audit_logs',                     'company_id', 'companies', 'NO ACTION'),
    ('automated_workflow_definitions', 'company_id', 'companies', 'CASCADE'),
    ('automated_workflow_executions',  'company_id', 'companies', 'CASCADE'),
    ('bid_analytics',                  'company_id', 'companies', 'CASCADE'),
    ('bid_line_items',                 'company_id', 'companies', 'CASCADE'),
    ('bid_packages',                   'company_id', 'companies', 'CASCADE'),
    ('bid_scope_items',                'company_id', 'companies', 'CASCADE'),
    ('bids',                           'company_id', 'companies', 'CASCADE'),
    ('budget_alerts',                  'project_id', 'projects',  'CASCADE'),
    ('budget_line_items',              'project_id', 'projects',  'NO ACTION'),
    ('budget_tracking',                'project_id', 'projects',  'NO ACTION'),
    ('call_logs',                      'company_id', 'companies', 'CASCADE'),
    ('certifications',                 'company_id', 'companies', 'CASCADE'),
    ('chat_channel_members',           'company_id', 'companies', 'CASCADE'),
    ('chat_channels',                  'company_id', 'companies', 'CASCADE'),
    ('chat_channels',                  'project_id', 'projects',  'SET NULL'),
    ('chat_messages',                  'company_id', 'companies', 'NO ACTION'),
    ('client_document_shares',         'company_id', 'companies', 'CASCADE'),
    ('client_document_shares',         'project_id', 'projects',  'CASCADE'),
    ('client_messages',                'project_id', 'projects',  'SET NULL'),
    ('client_portal_access',           'client_id',  'contacts',  'SET NULL'),
    ('client_portal_access',           'project_id', 'projects',  'SET NULL'),
    ('client_selections',              'company_id', 'companies', 'CASCADE'),
    ('collaboration_sessions',         'company_id', 'companies', 'CASCADE'),
    ('collaboration_sessions',         'project_id', 'projects',  'SET NULL'),
    ('collection_items',               'company_id', 'companies', 'NO ACTION'),
    ('collection_items',               'project_id', 'projects',  'NO ACTION'),
    ('communication_log',              'company_id', 'companies', 'CASCADE'),
    ('communication_log',              'project_id', 'projects',  'SET NULL'),
    ('communication_templates',        'company_id', 'companies', 'CASCADE'),
    ('compliance_audits',              'company_id', 'companies', 'CASCADE'),
    ('compliance_requirements',        'company_id', 'companies', 'CASCADE'),
    ('crm_activities',                 'company_id', 'companies', 'CASCADE'),
    ('data_classifications',           'company_id', 'companies', 'CASCADE'),
    ('database_optimization_metrics',  'company_id', 'companies', 'CASCADE'),
    ('document_number_settings',       'company_id', 'companies', 'CASCADE'),
    ('document_templates',             'company_id', 'companies', 'CASCADE'),
    ('email_accounts',                 'company_id', 'companies', 'CASCADE'),
    ('email_marketing_templates',      'company_id', 'companies', 'CASCADE'),
    ('email_messages',                 'company_id', 'companies', 'CASCADE'),
    ('equipment_inventory',            'company_id', 'companies', 'CASCADE'),
    ('estimate_acceptances',           'company_id', 'companies', 'CASCADE'),
    ('estimate_share_links',           'company_id', 'companies', 'CASCADE'),
    ('estimate_versions',              'company_id', 'companies', 'NO ACTION'),
    ('estimates',                      'client_id',  'contacts',  'SET NULL'),
    ('export_history',                 'company_id', 'companies', 'CASCADE'),
    ('feature_announcements',          'company_id', 'companies', 'NO ACTION'),
    ('geofences',                      'company_id', 'companies', 'CASCADE'),
    ('incident_metrics',               'company_id', 'companies', 'CASCADE'),
    ('incident_response_playbooks',    'company_id', 'companies', 'CASCADE'),
    ('incident_response_team',         'company_id', 'companies', 'CASCADE'),
    ('inspection_deficiencies',        'company_id', 'companies', 'CASCADE'),
    ('inspection_deficiencies',        'project_id', 'projects',  'CASCADE'),
    ('inspection_schedules',           'company_id', 'companies', 'CASCADE'),
    ('inspection_schedules',           'project_id', 'projects',  'CASCADE'),
    ('integration_configurations',     'company_id', 'companies', 'CASCADE'),
    ('inventory_optimizations',        'company_id', 'companies', 'CASCADE'),
    ('inventory_optimizations',        'project_id', 'projects',  'SET NULL'),
    ('invoice_payments',               'company_id', 'companies', 'CASCADE'),
    ('invoices',                       'client_id',  'contacts',  'SET NULL'),
    ('job_costing_summary',            'project_id', 'projects',  'CASCADE'),
    ('job_costs',                      'company_id', 'companies', 'CASCADE'),
    ('keyword_research_data',          'company_id', 'companies', 'CASCADE'),
    ('labor_costs',                    'project_id', 'projects',  'NO ACTION'),
    ('maintenance_records',            'company_id', 'companies', 'CASCADE'),
    ('material_delivery_plans',        'company_id', 'companies', 'CASCADE'),
    ('material_delivery_plans',        'project_id', 'projects',  'SET NULL'),
    ('material_forecasts',             'project_id', 'projects',  'SET NULL'),
    ('material_items',                 'company_id', 'companies', 'CASCADE'),
    ('material_shortages',             'company_id', 'companies', 'CASCADE'),
    ('material_shortages',             'project_id', 'projects',  'SET NULL'),
    ('material_usage_predictions',     'company_id', 'companies', 'CASCADE'),
    ('material_usage_predictions',     'project_id', 'projects',  'SET NULL'),
    ('notification_rules',             'company_id', 'companies', 'CASCADE'),
    ('optimized_resource_assignments', 'company_id', 'companies', 'CASCADE'),
    ('optimized_resource_assignments', 'project_id', 'projects',  'CASCADE'),
    ('osha_compliance_log',            'company_id', 'companies', 'CASCADE'),
    ('osha_compliance_log',            'project_id', 'projects',  'SET NULL'),
    ('osha_requirements',              'company_id', 'companies', 'CASCADE'),
    ('password_policies',              'company_id', 'companies', 'CASCADE'),
    ('payment_applications',           'company_id', 'companies', 'NO ACTION'),
    ('payment_applications',           'project_id', 'projects',  'NO ACTION'),
    ('payment_reminders',              'project_id', 'projects',  'SET NULL'),
    ('performance_benchmarks',         'company_id', 'companies', 'CASCADE'),
    ('photo_attachments',              'company_id', 'companies', 'CASCADE'),
    ('prediction_performance',         'company_id', 'companies', 'CASCADE'),
    ('project_calendar_events',        'company_id', 'companies', 'CASCADE'),
    ('project_calendar_events',        'project_id', 'projects',  'SET NULL'),
    ('project_closeout_items',         'company_id', 'companies', 'CASCADE'),
    ('project_closeout_items',         'project_id', 'projects',  'CASCADE'),
    ('project_historical_data',        'company_id', 'companies', 'CASCADE'),
    ('project_historical_data',        'project_id', 'projects',  'SET NULL'),
    ('project_milestones',             'company_id', 'companies', 'CASCADE'),
    ('project_predictions',            'company_id', 'companies', 'CASCADE'),
    ('project_predictions',            'project_id', 'projects',  'SET NULL'),
    ('project_sov_lines',              'company_id', 'companies', 'CASCADE'),
    ('project_sov_lines',              'project_id', 'projects',  'CASCADE'),
    ('project_status_updates',         'company_id', 'companies', 'CASCADE'),
    ('project_status_updates',         'project_id', 'projects',  'CASCADE'),
    ('projects',                       'client_id',  'contacts',  'SET NULL'),
    ('purchase_recommendations',       'project_id', 'projects',  'SET NULL'),
    ('quality_metrics_summary',        'company_id', 'companies', 'CASCADE'),
    ('quality_metrics_summary',        'project_id', 'projects',  'CASCADE'),
    ('quickbooks_sync_review',         'company_id', 'companies', 'CASCADE'),
    ('recurring_invoices',             'company_id', 'companies', 'NO ACTION'),
    ('recurring_invoices',             'project_id', 'projects',  'SET NULL'),
    ('resource_availability_patterns', 'company_id', 'companies', 'CASCADE'),
    ('resource_conflicts',             'company_id', 'companies', 'CASCADE'),
    ('resource_optimization_configs',  'company_id', 'companies', 'CASCADE'),
    ('resource_optimization_metrics',  'company_id', 'companies', 'CASCADE'),
    ('resource_optimization_runs',     'company_id', 'companies', 'CASCADE'),
    ('retention_items',                'company_id', 'companies', 'NO ACTION'),
    ('retention_items',                'project_id', 'projects',  'NO ACTION'),
    ('rfi_responses',                  'company_id', 'companies', 'CASCADE'),
    ('scaling_assessments',            'company_id', 'companies', 'CASCADE'),
    ('scaling_milestones',             'company_id', 'companies', 'CASCADE'),
    ('scaling_plans',                  'company_id', 'companies', 'CASCADE'),
    ('scaling_progress',               'company_id', 'companies', 'CASCADE'),
    ('schedule_baselines',             'company_id', 'companies', 'CASCADE'),
    ('schedule_conflicts',             'company_id', 'companies', 'CASCADE'),
    ('schedule_conflicts',             'project_id', 'projects',  'CASCADE'),
    ('schedule_task_assignees',        'company_id', 'companies', 'CASCADE'),
    ('schedule_task_assignees',        'project_id', 'projects',  'CASCADE'),
    ('schedule_task_dependencies',     'company_id', 'companies', 'CASCADE'),
    ('schedule_task_dependencies',     'project_id', 'projects',  'CASCADE'),
    ('schedule_tasks',                 'company_id', 'companies', 'CASCADE'),
    ('scheduled_reports',              'company_id', 'companies', 'CASCADE'),
    ('security_alerts',                'company_id', 'companies', 'CASCADE'),
    ('security_incidents',             'company_id', 'companies', 'CASCADE'),
    ('security_metrics',               'company_id', 'companies', 'CASCADE'),
    ('security_monitoring_rules',      'company_id', 'companies', 'CASCADE'),
    ('selection_categories',           'company_id', 'companies', 'CASCADE'),
    ('selection_options',              'company_id', 'companies', 'CASCADE'),
    ('subcontractor_payments',         'company_id', 'companies', 'NO ACTION'),
    ('subcontractor_payments',         'project_id', 'projects',  'NO ACTION'),
    ('submittal_reviews',              'company_id', 'companies', 'CASCADE'),
    ('suppliers',                      'company_id', 'companies', 'CASCADE'),
    ('system_alerts',                  'company_id', 'companies', 'CASCADE'),
    ('system_monitoring_metrics',      'company_id', 'companies', 'CASCADE'),
    ('task_dependencies',              'company_id', 'companies', 'CASCADE'),
    ('task_resource_allocations',      'company_id', 'companies', 'CASCADE'),
    ('tax_rates',                      'company_id', 'companies', 'CASCADE'),
    ('time_entries',                   'company_id', 'companies', 'CASCADE'),
    ('timeline_optimizations',         'company_id', 'companies', 'CASCADE'),
    ('timeline_optimizations',         'project_id', 'projects',  'CASCADE'),
    ('trade_conflicts',                'company_id', 'companies', 'CASCADE'),
    ('trade_conflicts',                'project_id', 'projects',  'CASCADE'),
    ('trade_handoffs',                 'company_id', 'companies', 'CASCADE'),
    ('trade_handoffs',                 'project_id', 'projects',  'CASCADE'),
    ('trade_performance_metrics',      'company_id', 'companies', 'CASCADE'),
    ('trade_performance_metrics',      'project_id', 'projects',  'CASCADE'),
    ('user_favorites',                 'company_id', 'companies', 'CASCADE'),
    ('user_presence',                  'company_id', 'companies', 'CASCADE'),
    ('workflow_analytics',             'company_id', 'companies', 'CASCADE'),
    ('workflow_definitions',           'company_id', 'companies', 'CASCADE'),
    ('workflow_executions',            'company_id', 'companies', 'CASCADE'),
    ('workflow_step_executions',       'company_id', 'companies', 'CASCADE'),
    ('workflows',                      'company_id', 'companies', 'CASCADE')
    ) AS v(tbl, col, ref, on_delete)
  LOOP
    IF r.on_delete NOT IN ('CASCADE', 'SET NULL', 'NO ACTION') THEN
      RAISE EXCEPTION 'US-277: bad ON DELETE % for %.%', r.on_delete, r.tbl, r.col;
    END IF;

    SELECT c.oid INTO v_rel FROM pg_class c
     WHERE c.oid = to_regclass(format('public.%I', r.tbl)) AND c.relkind IN ('r', 'p');
    SELECT c.oid INTO v_ref FROM pg_class c
     WHERE c.oid = to_regclass(format('public.%I', r.ref)) AND c.relkind IN ('r', 'p');
    IF v_rel IS NULL OR v_ref IS NULL THEN
      RAISE NOTICE 'US-277 skip %.%: table public.% or public.% does not exist', r.tbl, r.col, r.tbl, r.ref;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    SELECT a.atttypid::regtype INTO v_type FROM pg_attribute a
     WHERE a.attrelid = v_rel AND a.attname = r.col AND a.attnum > 0 AND NOT a.attisdropped;
    IF v_type IS NULL THEN
      RAISE NOTICE 'US-277 skip %.%: no such column', r.tbl, r.col;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;
    IF v_type <> 'uuid'::regtype THEN
      RAISE NOTICE 'US-277 skip %.%: column is %, not uuid', r.tbl, r.col, v_type;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    IF EXISTS (SELECT 1 FROM pg_constraint
                WHERE conrelid = v_rel AND contype = 'f' AND confrelid = v_ref) THEN
      RAISE NOTICE 'US-277 skip %.%: already has a foreign key to %', r.tbl, r.col, r.ref;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    v_name := r.tbl || '_' || r.col || '_fkey';
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conrelid = v_rel AND conname = v_name) THEN
      RAISE NOTICE 'US-277 skip %.%: a constraint named % already exists', r.tbl, r.col, v_name;
      v_skipped := v_skipped + 1;
      CONTINUE;
    END IF;

    EXECUTE format(
      'ALTER TABLE public.%I ADD CONSTRAINT %I FOREIGN KEY (%I) REFERENCES public.%I (id) ON DELETE %s NOT VALID',
      r.tbl, v_name, r.col, r.ref, r.on_delete);
    v_added := v_added + 1;
  END LOOP;

  RAISE NOTICE 'US-277: added % NOT VALID foreign key(s), skipped %', v_added, v_skipped;
END $$;
