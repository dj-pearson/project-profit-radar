-- Indexes for the two migrations before this one, in a file of their own.
--
-- CREATE INDEX CONCURRENTLY cannot run inside a transaction block, and a
-- migration runner wraps each file in one. Mixing a concurrent index with the
-- DDL it supports therefore fails the whole migration - so the tables and
-- triggers land in 20260903020000 and 20260903030000, and every index they
-- want is here, alone.
--
-- CONCURRENTLY because all three tables already exist and carry production
-- rows; a plain build takes a lock that blocks writes for its whole duration
-- (US-249). IF NOT EXISTS on each, so a re-run after a failed build is safe -
-- which matters more than usual here, because a failed concurrent build leaves
-- an invalid index behind.

-- US-319: the portal reads enrolment on every request, by user and by email.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_portal_access_user_id
  ON public.client_portal_access(user_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_portal_access_email
  ON public.client_portal_access(lower(client_email));

-- US-321: one labor posting per approved time entry. The approval trigger
-- already deletes before inserting, so this is defence in depth against a
-- second writer appearing later rather than the mechanism itself.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_job_costs_time_entry
  ON public.job_costs(time_entry_id)
  WHERE time_entry_id IS NOT NULL;

-- US-321: WipReport filters job costs by company.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_job_costs_company_id
  ON public.job_costs(company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_company_id
  ON public.time_entries(company_id);
