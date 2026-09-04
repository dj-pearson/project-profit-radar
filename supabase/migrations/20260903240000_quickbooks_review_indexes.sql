-- Indexes for the QuickBooks review queue and idempotent import (US-333).
--
-- Alone in their own file because CREATE INDEX CONCURRENTLY cannot run inside
-- a transaction block and the migration runner wraps each file in one.

-- The queue a person works: their company's pending items.
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_qb_review_pending
  ON public.quickbooks_sync_review (company_id, entity, last_seen_at DESC)
  WHERE status = 'pending';

-- The import checks "have I already got this one?" once per row, so this is on
-- the hot path of every sync run.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_expenses_qb_purchase
  ON public.expenses (company_id, qb_purchase_id)
  WHERE qb_purchase_id IS NOT NULL;

CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS idx_invoice_payments_qb_payment
  ON public.invoice_payments (company_id, qb_payment_id)
  WHERE qb_payment_id IS NOT NULL;
