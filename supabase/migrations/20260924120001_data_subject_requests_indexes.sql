-- Indexes for the data_subject_requests columns 20260924120000 adds (US-369).
--
-- data_subject_requests already exists and holds rows, so the indexes are
-- built CONCURRENTLY to avoid locking it. Like 20260923190001 this file has
-- no BEGIN/COMMIT. If `supabase db push` refuses it inside a transaction,
-- apply it with psql as docs/RUNBOOK_MIGRATION_DEPLOY.md describes. After
-- applying, check pg_index for INVALID indexes left by a failed build and
-- drop and rebuild any.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_subject_requests_user
  ON public.data_subject_requests (user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_data_subject_requests_due_at
  ON public.data_subject_requests (due_at) WHERE status != 'completed';
