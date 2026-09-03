-- Indexes for 20260903110000, alone, because a concurrent build cannot run
-- inside a transaction block.
--
-- Every one of these tables already carries production rows, so a plain build
-- would take a lock that blocks writes for its whole duration (US-249).

-- The customer page and the customer_activity view join on these.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_estimates_client_id
  ON public.estimates(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_projects_client_id
  ON public.projects(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_client_id
  ON public.invoices(client_id) WHERE client_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_client_portal_access_client_id
  ON public.client_portal_access(client_id) WHERE client_id IS NOT NULL;

-- The backfill and the contact picker both match on lowercased email within a
-- company. Without this, every picker keystroke is a sequential scan.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_contacts_company_email
  ON public.contacts(company_id, lower(email));
