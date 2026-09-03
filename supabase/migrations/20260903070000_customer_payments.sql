-- Customers cannot pay an invoice, and a payment would not be recorded if they
-- could (US-324).
--
-- Three separate breaks, each of which alone is enough:
--
--   1. Both portals disable the Pay button unless invoice.stripe_invoice_id is
--      set. Nothing in src/ or supabase/functions ever writes that column - its
--      only writer is payment_failures, for Brikly's OWN subscriptions. So the
--      button is permanently disabled for every invoice ever raised.
--   2. stripe-webhook handles subscription, refund and dispute events only.
--      There is no checkout.session.completed and no payment_intent.succeeded
--      handler, so a customer payment that somehow happened would never be
--      recorded against the invoice.
--   3. processManualPayment updates invoices.amount_paid directly and then
--      builds a paymentRecord it returns without inserting, bypassing
--      invoice_payments and the trigger that recomputes the invoice. Cheques
--      recorded by the office leave no payment history at all.
--
-- THE DECISION THIS MIGRATION MAKES, and why it is this one.
--
-- The story asked for the money-routing question to be settled before
-- implementation: do customer payments settle to a Stripe Connect account per
-- contractor, or to the platform account?
--
-- No Connect infrastructure exists anywhere in the repo, so the current
-- implicit answer is the platform account - every payment a contractor's
-- customer made would land in Brikly's own Stripe balance. That is not an
-- engineering preference. Holding other businesses' customer receipts makes
-- the platform a money transmitter in most jurisdictions, and it means a
-- contractor's cash flow depends on Brikly paying it out.
--
-- So this takes the safe half of the decision rather than the convenient one:
-- payments are collected on the contractor's OWN connected account. A company
-- that has not connected Stripe cannot accept card payments, and the UI says
-- so plainly instead of quietly routing the money elsewhere. Choosing the
-- platform account instead is a business decision with legal weight and is
-- left to a human; nothing here forecloses it.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS stripe_connect_account_id TEXT,
  ADD COLUMN IF NOT EXISTS stripe_connect_charges_enabled BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.companies.stripe_connect_account_id IS
  'The contractor''s own Stripe account. Customer invoice payments are collected on it, so their receipts never enter the platform balance. US-324.';
COMMENT ON COLUMN public.companies.stripe_connect_charges_enabled IS
  'Set from the Stripe account''s charges_enabled. False means onboarding is incomplete and the Pay button must stay off. US-324.';

-- ---------------------------------------------------------------------------
-- Recording a payment, once
-- ---------------------------------------------------------------------------
-- invoice_payments already exists with the right shape, and
-- trigger_update_invoice_status_on_payment already recomputes amount_paid,
-- amount_due, status and paid_at from it (20250923014807). The gap was that
-- nothing inserted into it.
--
-- Stripe retries webhooks, and the platform's own webhook_events guard covers
-- the event, not the payment. This adds the payment-level guard: a partial
-- unique index on the Stripe reference, so the same charge cannot be recorded
-- twice even if it arrives through both checkout.session.completed and
-- payment_intent.succeeded, which for a Checkout payment it does.
--
-- The index is in 20260903080000, alone, because CREATE INDEX CONCURRENTLY
-- cannot run inside a transaction block.

CREATE OR REPLACE FUNCTION public.record_invoice_payment(
  p_invoice_id uuid,
  p_amount numeric,
  p_method text DEFAULT 'stripe',
  p_stripe_payment_intent_id text DEFAULT NULL,
  p_reference_number text DEFAULT NULL,
  p_notes text DEFAULT NULL,
  p_processed_by uuid DEFAULT NULL
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_company uuid;
  v_existing uuid;
  v_id uuid;
BEGIN
  IF p_amount IS NULL OR p_amount <= 0 THEN
    RAISE EXCEPTION 'A payment must be a positive amount' USING ERRCODE = '22023';
  END IF;

  SELECT company_id INTO v_company FROM public.invoices WHERE id = p_invoice_id;
  IF v_company IS NULL THEN
    RAISE EXCEPTION 'Invoice not found' USING ERRCODE = 'P0002';
  END IF;

  -- Idempotency for the retried webhook. Returns the existing payment rather
  -- than raising, because a duplicate delivery is normal and must not put the
  -- event back in Stripe's retry queue.
  IF p_stripe_payment_intent_id IS NOT NULL THEN
    SELECT id INTO v_existing
      FROM public.invoice_payments
     WHERE stripe_payment_intent_id = p_stripe_payment_intent_id
     LIMIT 1;

    IF v_existing IS NOT NULL THEN
      RETURN v_existing;
    END IF;
  END IF;

  INSERT INTO public.invoice_payments (
    invoice_id, company_id, payment_amount, payment_date, payment_method,
    reference_number, notes, stripe_payment_intent_id, processed_by
  ) VALUES (
    p_invoice_id, v_company, p_amount, CURRENT_DATE, COALESCE(p_method, 'stripe'),
    p_reference_number, p_notes, p_stripe_payment_intent_id, p_processed_by
  )
  RETURNING id INTO v_id;

  -- No UPDATE of invoices here on purpose: the AFTER INSERT trigger owns
  -- amount_paid, amount_due, status and paid_at. Writing them here as well is
  -- what processManualPayment did, and it is how an invoice ends up with a
  -- balance its own payment rows do not explain.
  RETURN v_id;
END;
$$;

COMMENT ON FUNCTION public.record_invoice_payment IS
  'The one way a payment reaches an invoice. Idempotent on the Stripe reference; leaves the invoice totals to the existing trigger. US-324.';

REVOKE ALL ON FUNCTION public.record_invoice_payment FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.record_invoice_payment TO authenticated, service_role;
