-- Indexes for the schedule of values and time-and-materials billing (US-327).
--
-- Alone in their own file because CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction block and the migration runner wraps each file in one.

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_sov_lines_project
  ON public.project_sov_lines (project_id, sort_order);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_sov_lines_company
  ON public.project_sov_lines (company_id);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_project_sov_lines_change_order
  ON public.project_sov_lines (change_order_id)
  WHERE change_order_id IS NOT NULL;

-- project_sov_status sums invoice lines by SOV line; without this it is a
-- sequential scan of every line item the company has ever written.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_line_items_sov_line
  ON public.invoice_line_items (sov_line_id)
  WHERE sov_line_id IS NOT NULL;

-- project_retainage filters invoices by project and type.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_invoices_project_type
  ON public.invoices (project_id, invoice_type);

-- project_unbilled_work: the unbilled half of each source table.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_time_entries_unbilled
  ON public.time_entries (project_id, approval_status)
  WHERE billed_invoice_id IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_unbilled
  ON public.expenses (project_id)
  WHERE billed_invoice_id IS NULL;
