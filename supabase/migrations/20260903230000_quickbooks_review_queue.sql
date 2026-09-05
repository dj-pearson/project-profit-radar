-- QuickBooks imports land where somebody can see them (US-333).
--
-- WHAT WAS THERE. quickbooks-sync pulls Customers and Items into their real
-- Brikly tables, and then pulls Purchases into quickbooks_expenses and
-- Payments into quickbooks_payments. Those two tables are:
--
--   - written by the sync on every run,
--   - read by no file in src/,
--   - absent from src/integrations/supabase/types.ts.
--
-- The sync dashboard (US-070) reports those runs as successful and US-252 made
-- them paginate, so the larger the company the more rows it imports into
-- tables nobody sees. A contractor is told their expenses synced, and their
-- job costing does not move.
--
-- WHAT THIS DOES. Imported purchases become expenses (and through US-322's
-- trigger, job_costs). Imported payments become invoice_payments against the
-- invoice they pay. Anything that cannot be matched confidently lands in a
-- review queue a person works, rather than in a shadow table.
--
-- THE RULE: match confidently or do not match. An expense posted to the wrong
-- job is worse than one not imported, and an accounts-receivable list that
-- says a customer has paid when they have not is worse than one missing a row.

-- ---------------------------------------------------------------------------
-- 1. The review queue
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.quickbooks_sync_review (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entity TEXT NOT NULL CHECK (entity IN ('purchase', 'payment', 'bill', 'vendor')),
  -- The QuickBooks id. One row per QuickBooks record per company, so a re-run
  -- updates rather than piling up duplicates of the same unresolved item.
  qb_id TEXT NOT NULL,
  reason TEXT NOT NULL,
  amount NUMERIC(14,2),
  occurred_on DATE,
  counterparty TEXT,
  -- The QuickBooks payload, so a person can see what it actually said without
  -- going back to Intuit. Also what a retry re-maps from once the missing
  -- project or invoice exists.
  raw JSONB,
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'resolved', 'ignored')),
  resolved_as_id UUID,
  resolved_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMPTZ,
  first_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, entity, qb_id)
);

COMMENT ON TABLE public.quickbooks_sync_review IS
  'QuickBooks rows the sync could not map confidently. A queue a person works, not a shadow table. US-333.';
COMMENT ON COLUMN public.quickbooks_sync_review.reason IS
  'Said plainly, because a person reads it: "No linked invoice, and no invoice number in the reference or memo".';

ALTER TABLE public.quickbooks_sync_review ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'quickbooks_sync_review'
      AND policyname = 'Finance staff work their company sync queue'
  ) THEN
    -- Resolving one of these creates an expense or a payment, so it is the
    -- same audience that is allowed to create those by hand.
    CREATE POLICY "Finance staff work their company sync queue"
      ON public.quickbooks_sync_review FOR ALL
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting', 'project_manager']::user_role[])
      )
      WITH CHECK (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid()) = ANY(
          ARRAY['admin', 'root_admin', 'accounting', 'project_manager']::user_role[])
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Where an imported row came from
-- ---------------------------------------------------------------------------
-- Without this, a second sync run cannot tell an expense it already imported
-- from one the contractor typed, and either duplicates the cost or refuses to
-- import a genuine new one.
ALTER TABLE public.expenses
  ADD COLUMN IF NOT EXISTS qb_purchase_id TEXT;

ALTER TABLE public.invoice_payments
  ADD COLUMN IF NOT EXISTS qb_payment_id TEXT;

COMMENT ON COLUMN public.expenses.qb_purchase_id IS
  'The QuickBooks Purchase this was imported from. Makes the import idempotent. US-333.';
COMMENT ON COLUMN public.invoice_payments.qb_payment_id IS
  'The QuickBooks Payment this was imported from. Makes the import idempotent. US-333.';

COMMENT ON TABLE public.quickbooks_expenses IS
  'DEPRECATED (US-333): imported purchases now become expenses, and job_costs through the US-322 trigger. Read by nothing; scheduled for removal a release after the mapping has run for existing rows.';
COMMENT ON TABLE public.quickbooks_payments IS
  'DEPRECATED (US-333): imported payments now become invoice_payments against the invoice they pay. Read by nothing; same removal schedule.';

-- ---------------------------------------------------------------------------
-- 3. What the sync dashboard shows
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW public.quickbooks_sync_health AS
SELECT
  r.company_id,
  r.entity,
  count(*) FILTER (WHERE r.status = 'pending')::int  AS pending,
  count(*) FILTER (WHERE r.status = 'resolved')::int AS resolved,
  count(*) FILTER (WHERE r.status = 'ignored')::int  AS ignored,
  SUM(r.amount) FILTER (WHERE r.status = 'pending')  AS pending_amount,
  max(r.last_seen_at)                                AS last_seen_at
FROM public.quickbooks_sync_review r
GROUP BY r.company_id, r.entity;

COMMENT ON VIEW public.quickbooks_sync_health IS
  'Per-entity counts of what the QuickBooks sync could not map. The number the dashboard was missing when it reported every run as successful. US-333.';

GRANT SELECT ON public.quickbooks_sync_health TO authenticated;
