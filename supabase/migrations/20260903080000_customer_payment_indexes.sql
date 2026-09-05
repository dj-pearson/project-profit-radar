-- Indexes for 20260903070000, in a file of their own.
--
-- A concurrent build cannot run inside a transaction block and a migration
-- runner wraps each file in one, so mixing it with the DDL it supports fails
-- the whole migration.

-- US-324: the payment-level idempotency guard. Stripe retries webhooks, and a
-- Checkout payment arrives as BOTH checkout.session.completed and
-- payment_intent.succeeded, so the same charge reaches the recorder twice by
-- design. record_invoice_payment checks for an existing row first; this makes
-- the guarantee structural rather than a race.
CREATE UNIQUE INDEX CONCURRENTLY IF NOT EXISTS uq_invoice_payments_stripe_intent
  ON public.invoice_payments(stripe_payment_intent_id)
  WHERE stripe_payment_intent_id IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_companies_stripe_connect_account
  ON public.companies(stripe_connect_account_id)
  WHERE stripe_connect_account_id IS NOT NULL;
