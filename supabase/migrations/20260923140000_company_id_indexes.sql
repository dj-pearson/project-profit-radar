-- Index company_id on the 74 tables that filter on it with no index (US-391).
--
-- Every company-scoped RLS policy is `company_id = get_user_company(auth.uid())`
-- or an IN over user_profiles, so without an index each list page, count and
-- policy check on these tables is a sequential scan of every tenant's rows.
--
-- How the list was built: the tables whose Row type in
-- src/integrations/supabase/types.ts (generated from the live schema) has a
-- company_id column, intersected with the tables supabase/migrations creates
-- and does not later drop, minus any table that already has an index whose
-- leading column is company_id. "Already has one" counts CREATE INDEX (plain,
-- UNIQUE, USING btree) and inline UNIQUE/PRIMARY KEY (company_id, ...)
-- constraints, which is why estimates and bills are not here: each has
-- UNIQUE (company_id, <number>). The story's figure of 104 counted
-- CREATE INDEX only.
--
-- Left out on purpose:
--   * 48 tables that migrations create with company_id but that are absent
--     from the live types (document_shares, refunds, teams, ...). An index on
--     a table that is not there fails the whole push.
--   * 6 tables that exist live but were never created by a migration
--     (lead_notes, lead_scores, platform_revenue, project_costs,
--     project_revenue, retention_tracking). A fresh replay of migrations has
--     no such table, so indexing them here would break `supabase db reset`.
--
-- CONCURRENTLY, because these are live tables and a plain CREATE INDEX blocks
-- writes for the whole build (scripts/check-index-concurrently.mjs enforces
-- this). CONCURRENTLY cannot run inside a transaction block, so this file has
-- no BEGIN/COMMIT and no DO block; it follows the same shape as
-- 20260903180000_schedule_assignment_indexes.sql.
--
-- Operator notes:
--   * If `supabase db push` rejects the file with "cannot run inside a
--     transaction block" (or "within a pipeline"), apply it with
--     `psql "$DB_URL" -v ON_ERROR_STOP=1 -f <this file>` and record it the
--     way docs/RUNBOOK_MIGRATION_DEPLOY.md describes. Do not mark it applied
--     with a history repair; US-248 retired that path.
--   * A CONCURRENTLY build that fails part-way leaves an INVALID index behind,
--     and IF NOT EXISTS will then skip it on a rerun. After applying, this
--     must return zero rows; drop any it does return and rerun the file:
--       SELECT indexrelid::regclass FROM pg_index
--        WHERE NOT indisvalid AND indexrelid::regclass::text LIKE 'idx_%_company_id';
--   * IF NOT EXISTS matches on the index name only. An index on company_id
--     created by hand in the dashboard under another name would get a twin;
--     it costs write amplification, not correctness.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_affiliate_rewards_company_id
  ON public.affiliate_rewards (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_defect_detection_company_id
  ON public.ai_defect_detection (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_lead_scores_company_id
  ON public.ai_lead_scores (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_progress_tracking_company_id
  ON public.ai_progress_tracking (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_safety_analysis_company_id
  ON public.ai_safety_analysis (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_automated_social_posts_queue_company_id
  ON public.automated_social_posts_queue (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_reconciliation_items_company_id
  ON public.bank_reconciliation_items (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bank_transactions_company_id
  ON public.bank_transactions (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_line_items_company_id
  ON public.bill_line_items (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bill_payment_applications_company_id
  ON public.bill_payment_applications (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chargeback_fees_company_id
  ON public.chargeback_fees (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_channel_members_company_id
  ON public.chat_channel_members (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_chat_messages_company_id
  ON public.chat_messages (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_communications_company_id
  ON public.client_communications (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_consent_records_company_id
  ON public.consent_records (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractor_payments_company_id
  ON public.contractor_payments (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contractors_company_id
  ON public.contractors (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_memo_applications_company_id
  ON public.credit_memo_applications (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_credit_memo_line_items_company_id
  ON public.credit_memo_line_items (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_email_messages_company_id
  ON public.email_messages (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_acceptances_company_id
  ON public.estimate_acceptances (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_share_links_company_id
  ON public.estimate_share_links (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_versions_company_id
  ON public.estimate_versions (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expense_categories_company_id
  ON public.expense_categories (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_feature_announcements_company_id
  ON public.feature_announcements (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_fiscal_periods_company_id
  ON public.fiscal_periods (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_import_sessions_company_id
  ON public.import_sessions (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_schedules_company_id
  ON public.inspection_schedules (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_optimizations_company_id
  ON public.inventory_optimizations (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entry_lines_company_id
  ON public.journal_entry_lines (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_attribution_company_id
  ON public.lead_attribution (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_behavioral_data_company_id
  ON public.lead_behavioral_data (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_nurturing_campaigns_company_id
  ON public.lead_nurturing_campaigns (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_nurturing_enrollments_company_id
  ON public.lead_nurturing_enrollments (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_qualification_workflows_company_id
  ON public.lead_qualification_workflows (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_routing_rules_company_id
  ON public.lead_routing_rules (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_lead_sources_company_id
  ON public.lead_sources (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_delivery_plans_company_id
  ON public.material_delivery_plans (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_shortages_company_id
  ON public.material_shortages (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_usage_predictions_company_id
  ON public.material_usage_predictions (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_optimized_resource_assignments_company_id
  ON public.optimized_resource_assignments (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osha_compliance_log_company_id
  ON public.osha_compliance_log (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osha_requirements_company_id
  ON public.osha_requirements (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_password_policies_company_id
  ON public.password_policies (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_stages_company_id
  ON public.pipeline_stages (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_pipeline_templates_company_id
  ON public.pipeline_templates (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_prediction_performance_company_id
  ON public.prediction_performance (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_predictive_models_company_id
  ON public.predictive_models (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_milestones_company_id
  ON public.project_milestones (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_inspections_company_id
  ON public.quality_inspections (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quickbooks_customers_company_id
  ON public.quickbooks_customers (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quickbooks_items_company_id
  ON public.quickbooks_items (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quickbooks_sync_logs_company_id
  ON public.quickbooks_sync_logs (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_resource_availability_patterns_company_id
  ON public.resource_availability_patterns (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfi_responses_company_id
  ON public.rfi_responses (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_rfis_company_id
  ON public.rfis (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_sales_quotas_company_id
  ON public.sales_quotas (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_conflicts_company_id
  ON public.schedule_conflicts (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_assignees_company_id
  ON public.schedule_task_assignees (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_selection_options_company_id
  ON public.selection_options (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_session_replay_data_company_id
  ON public.session_replay_data (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_media_analytics_company_id
  ON public.social_media_analytics (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_social_media_automation_logs_company_id
  ON public.social_media_automation_logs (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submittal_reviews_company_id
  ON public.submittal_reviews (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_submittals_company_id
  ON public.submittals (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_support_ticket_context_company_id
  ON public.support_ticket_context (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_dependencies_company_id
  ON public.task_dependencies (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_task_resource_allocations_company_id
  ON public.task_resource_allocations (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeline_optimizations_company_id
  ON public.timeline_optimizations (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_conflicts_company_id
  ON public.trade_conflicts (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_handoffs_company_id
  ON public.trade_handoffs (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_performance_metrics_company_id
  ON public.trade_performance_metrics (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_vendors_company_id
  ON public.vendors (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_workflow_step_executions_company_id
  ON public.workflow_step_executions (company_id);
