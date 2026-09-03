-- Indexes for 20260903090000, alone, because a concurrent build cannot run
-- inside a transaction block.
--
-- estimate_share_links and estimate_acceptances are created by that migration
-- and carry no rows yet, so these could have been plain CREATE INDEX there.
-- They are here anyway: the guard cannot tell a table created two files ago
-- from one created two years ago, and neither can a reader in a hurry.

-- The public page looks a link up by token on every request.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_share_links_estimate
  ON public.estimate_share_links(estimate_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimate_acceptances_estimate
  ON public.estimate_acceptances(estimate_id);
