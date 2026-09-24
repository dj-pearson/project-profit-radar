-- Index the project_id columns that 20260924200000 puts a foreign key on and
-- that have no index led by project_id (US-277).
--
-- A foreign key's ON DELETE check runs against the referencing table. With no
-- index there, deleting one project scans every tenant's rows in each of these
-- tables, inside the delete's transaction. The company_id side is already
-- covered: 20260923140000 (US-391) indexed company_id on every live table
-- that lacked one, and no company is ever deleted by the app.
--
-- How the list was built: the project_id columns in 20260924200000 whose
-- table exists both in the live types and in migrations, minus any table that
-- already has an index (CREATE INDEX, inline UNIQUE or PRIMARY KEY) whose
-- leading column is project_id. A (company_id, project_id) index does not
-- count; a lookup by project_id alone cannot use it. bid_packages and
-- schedule_task_dependencies are here too: their project keys already exist
-- (composite on bid_packages, inline on schedule_task_dependencies), but
-- neither has a project_id-led index.
--
-- Left out: inspection_deficiencies (created by a migration, absent from the
-- live types; an index on a missing table fails the whole push) and
-- retention_tracking (live, but no migration creates it, so a fresh replay
-- has no such table).
--
-- CONCURRENTLY, so the builds do not block writes on live tables
-- (scripts/check-index-concurrently.mjs). No BEGIN/COMMIT and no DO block.
-- If `supabase db push` rejects the file for running inside a transaction,
-- apply it with `psql "$DB_URL" -v ON_ERROR_STOP=1 -f <this file>` and record
-- it as docs/RUNBOOK_MIGRATION_DEPLOY.md describes. A failed CONCURRENTLY
-- build leaves an INVALID index that IF NOT EXISTS then skips; after applying,
-- this must return no rows (drop any it returns and rerun the file):
--   SELECT indexrelid::regclass FROM pg_index WHERE NOT indisvalid;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_progress_tracking_project_id ON public.ai_progress_tracking (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_ai_quality_analysis_project_id ON public.ai_quality_analysis (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_bid_packages_project_id ON public.bid_packages (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collaboration_sessions_project_id ON public.collaboration_sessions (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_collection_items_project_id ON public.collection_items (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inspection_schedules_project_id ON public.inspection_schedules (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_inventory_optimizations_project_id ON public.inventory_optimizations (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_delivery_plans_project_id ON public.material_delivery_plans (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_shortages_project_id ON public.material_shortages (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_material_usage_predictions_project_id ON public.material_usage_predictions (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_osha_compliance_log_project_id ON public.osha_compliance_log (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_applications_project_id ON public.payment_applications (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_payment_reminders_project_id ON public.payment_reminders (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_historical_data_project_id ON public.project_historical_data (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_purchase_recommendations_project_id ON public.purchase_recommendations (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_quality_metrics_summary_project_id ON public.quality_metrics_summary (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recurring_invoices_project_id ON public.recurring_invoices (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_retention_items_project_id ON public.retention_items (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_schedule_task_dependencies_project_id ON public.schedule_task_dependencies (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_subcontractor_payments_project_id ON public.subcontractor_payments (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_timeline_optimizations_project_id ON public.timeline_optimizations (project_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_trade_conflicts_project_id ON public.trade_conflicts (project_id);
