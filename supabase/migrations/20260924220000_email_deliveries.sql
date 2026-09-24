-- One row per outbound transactional email (US-253).
--
-- Every edge function that sends mail goes through
-- supabase/functions/_shared/ses-email-service.ts, which writes this ledger
-- with the service role: claim the idempotency key as 'sending', then record
-- 'sent' with the SES MessageId, 'failed' for a permanent refusal, or
-- 'dead_letter' when bounded retries ran out. 'suppressed' is a send the
-- recipient opted out of. Before this, a failed send was a console.error and
-- nothing else, and no provider id was kept anywhere.
--
-- The unique idempotency_key is what stops a cron job that reruns, or a queue
-- item retried after its email went out, from mailing the same person twice.
--
-- company_id is NULL for platform mail that belongs to no company yet (sign-up
-- and password-reset codes). Company admins read their own company's rows;
-- nobody on the client side writes. Rows with no company are visible to the
-- service role only.
--
-- Additive only: a new table, its indexes and one SELECT policy.

CREATE TABLE IF NOT EXISTS public.email_deliveries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  idempotency_key TEXT NOT NULL UNIQUE CHECK (idempotency_key ~ '^[A-Za-z0-9_.:-]{8,200}$'),
  provider TEXT NOT NULL DEFAULT 'ses',
  -- 'ses-api' (SES v2 HTTPS), 'ses-smtp', or 'none' when no credentials were set.
  transport TEXT,
  category TEXT NOT NULL DEFAULT 'transactional'
    CHECK (category IN ('transactional', 'security_alerts', 'product_updates', 'marketing', 'newsletter')),
  template TEXT,
  source_function TEXT,
  recipients TEXT[] NOT NULL DEFAULT '{}',
  subject TEXT,
  status TEXT NOT NULL DEFAULT 'sending'
    CHECK (status IN ('sending', 'sent', 'failed', 'dead_letter', 'suppressed')),
  provider_message_id TEXT,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  last_error TEXT,
  last_status_code INTEGER,
  sent_at TIMESTAMPTZ,
  failed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.email_deliveries IS
  'Per-send ledger for outbound email: status, SES MessageId, attempts, last error. Written by the service role from _shared/ses-email-service.ts only. US-253.';
COMMENT ON COLUMN public.email_deliveries.idempotency_key IS
  'Same key, same email, at most once. Also sent to SES as the idempotency_key message tag so bounce/complaint events can be matched back.';
COMMENT ON COLUMN public.email_deliveries.status IS
  'sending -> sent | failed (permanent refusal, not retried) | dead_letter (retries exhausted) ; suppressed = recipient opted out.';

CREATE INDEX IF NOT EXISTS idx_email_deliveries_company_created
  ON public.email_deliveries (company_id, created_at DESC);
-- The monitoring query: what failed recently.
CREATE INDEX IF NOT EXISTS idx_email_deliveries_failures
  ON public.email_deliveries (created_at DESC)
  WHERE status IN ('failed', 'dead_letter');
CREATE INDEX IF NOT EXISTS idx_email_deliveries_provider_message_id
  ON public.email_deliveries (provider_message_id)
  WHERE provider_message_id IS NOT NULL;

ALTER TABLE public.email_deliveries ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.email_deliveries FROM anon, authenticated;
GRANT SELECT ON public.email_deliveries TO authenticated;
GRANT ALL ON public.email_deliveries TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'email_deliveries'
      AND policyname = 'Company admins read their email deliveries'
  ) THEN
    CREATE POLICY "Company admins read their email deliveries"
      ON public.email_deliveries FOR SELECT
      TO authenticated
      USING (
        company_id IS NOT NULL
        AND company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text IN ('admin', 'root_admin')
      );
  END IF;
END $$;
