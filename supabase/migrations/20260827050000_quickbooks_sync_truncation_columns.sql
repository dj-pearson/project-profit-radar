-- Record what QuickBooks returned, not just what we wrote (US-252).
--
-- quickbooks_sync_logs tracked records_processed only, so a run that imported
-- 1000 customers out of 4000 looked identical to a company that has 1000
-- customers. The sync issued `SELECT * FROM {entity}` with no STARTPOSITION or
-- MAXRESULTS, and QuickBooks caps that at 1000 rows without saying so, which is
-- how the truncation stayed invisible.
--
-- records_fetched is the count QuickBooks actually handed over, per entity.
-- Comparing it with records_processed separates two different failures:
--   equal      -> everything returned was written
--   a shortfall-> rows were dropped on our side, in syncCustomer/syncItem/...
--
-- truncated_entities names any entity where paging hit its page ceiling without
-- reaching a short page, so the import is known-incomplete rather than assumed
-- complete. throttle_retries counts 429/503 retries, which is the early warning
-- that a company is outgrowing its sync window.
--
-- All three are nullable with no default backfill: additive per CLAUDE.md, and
-- historical rows genuinely have no answer for these rather than a zero.

ALTER TABLE public.quickbooks_sync_logs
  ADD COLUMN IF NOT EXISTS records_fetched JSONB,
  ADD COLUMN IF NOT EXISTS truncated_entities JSONB,
  ADD COLUMN IF NOT EXISTS throttle_retries INTEGER;

COMMENT ON COLUMN public.quickbooks_sync_logs.records_fetched IS
  'Rows QuickBooks returned per entity. A shortfall against records_processed means rows were dropped locally (US-252).';
COMMENT ON COLUMN public.quickbooks_sync_logs.truncated_entities IS
  'Entities whose paging hit the page ceiling without a short page — the import for those is incomplete (US-252).';
COMMENT ON COLUMN public.quickbooks_sync_logs.throttle_retries IS
  'Count of 429/503 retries during the run (US-252).';
