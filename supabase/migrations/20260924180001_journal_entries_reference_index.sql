-- ledger_sync (20260924180000) looks up a source document's entries by
-- (company_id, reference_type, reference_id) on every invoice, payment,
-- expense, bill and timesheet write once posting is on. journal_entries has
-- indexes on company_id and entry_date only, so each lookup would scan the
-- company's whole ledger.
--
-- Not unique: a source has one entry per correction by design (the original,
-- its reversal, the re-post), and hand-keyed entries may carry any reference.
-- The uniqueness that matters, one entry per generation, is already enforced
-- by UNIQUE (company_id, entry_number).
--
-- Their own file because CREATE INDEX CONCURRENTLY cannot run inside the
-- transaction a migration runner wraps a file in alongside other statements.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_reference
  ON public.journal_entries (company_id, reference_type, reference_id);

-- ledger_active_entry asks "has any entry reversed this one?" for the same
-- writes. Partial, because only reversals carry reversed_entry_id.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_journal_entries_reversed_entry
  ON public.journal_entries (reversed_entry_id)
  WHERE reversed_entry_id IS NOT NULL;
