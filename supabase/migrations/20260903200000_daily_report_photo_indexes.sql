-- Indexes for the daily report as a field record (US-330).
--
-- Alone in their own file because CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction block and the migration runner wraps each file in one.

-- The timeline (US-107) reads photos by project and date.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_attachments_project_taken
  ON public.photo_attachments (project_id, taken_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_attachments_daily_report
  ON public.photo_attachments (daily_report_id)
  WHERE daily_report_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_attachments_company
  ON public.photo_attachments (company_id);

-- The classifier picks up what it has not seen yet.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_photo_attachments_unclassified
  ON public.photo_attachments (created_at)
  WHERE ai_classified_at IS NULL;

-- One crew row per person per report. daily_report_crew_items has never been
-- written by anything, so this cannot fail on existing duplicates; if it does,
-- that is worth knowing rather than silently allowing a person to be counted
-- twice in the crew total.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_report_crew_unique
  ON public.daily_report_crew_items (daily_report_id, user_id)
  WHERE user_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_report_material_items_report
  ON public.daily_report_material_items (daily_report_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_daily_report_equipment_items_report
  ON public.daily_report_equipment_items (daily_report_id);

-- daily_report_reconciliation joins time entries by project and calendar day.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_project_day
  ON public.time_entries (project_id, start_time);
