-- Per-company unique document numbers, part 1 of 2 (US-332).
--
-- invoices.invoice_number and purchase_orders.po_number were UNIQUE across
-- the whole table, so the second company to pick the same prefix (INV-, PO-)
-- failed on its first document. These indexes are strictly weaker than the
-- constraints they replace, so existing rows already satisfy them.
-- 20260923190002 drops the table-wide constraints once these exist.
--
-- CONCURRENTLY so neither table is locked while the index builds; like
-- 20260923140000 this file has no BEGIN/COMMIT. If `supabase db push` refuses
-- it inside a transaction, apply it with psql as docs/RUNBOOK_MIGRATION_DEPLOY.md
-- describes. After applying, check pg_index for INVALID indexes left by a
-- failed build and drop and rebuild any.

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS invoices_company_invoice_number_key
  ON public.invoices (company_id, invoice_number);

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS purchase_orders_company_po_number_key
  ON public.purchase_orders (company_id, po_number);
