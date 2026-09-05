-- Send, view, accept: a proposal the customer can actually receive (US-325).
--
-- "Send to Client" ran `update({ status: 'sent', sent_date })` and nothing
-- else. No email, no PDF, no edge function - there is no send-estimate in
-- supabase/functions - and no estimate_communications row, though that table
-- was created for exactly this in 20250712210005 and has never been written by
-- anything. EstimateForm toasts "Estimate has been sent to client" on save.
--
-- estimates.status has no CHECK constraint, and nothing anywhere sets 'viewed'
-- or 'accepted' except the convert-to-project service. So an estimator had no
-- way to know whether a customer had seen a proposal, let alone agreed to it,
-- and the pipeline's most important transition was invisible.
--
-- WHAT THE CUSTOMER GETS. A tokenised public page. Not the client portal:
-- portal access means an account, and asking someone to create one before they
-- have agreed to hire you loses the job. The token is the credential, so it is
-- generated with crypto-strength randomness, scoped to one estimate version,
-- expires, and grants exactly two things - read this estimate, accept this
-- estimate. Sending a new version supersedes the old token, because a customer
-- must never be able to accept a price that has been withdrawn.

-- ---------------------------------------------------------------------------
-- 1. The status ladder, enforced
-- ---------------------------------------------------------------------------
-- Additive: every value already in use is admitted, so no existing row fails.
-- 'converted' is included because estimateToProjectConversion sets 'accepted'
-- and links project_id; a later story may want to distinguish the two.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'estimates_status_check'
  ) THEN
    -- Normalise anything unexpected before constraining, so the migration
    -- cannot fail on a row somebody set by hand.
    UPDATE public.estimates
       SET status = 'draft'
     WHERE status IS NULL
        OR status NOT IN ('draft','sent','viewed','accepted','rejected','expired','converted');

    ALTER TABLE public.estimates
      ADD CONSTRAINT estimates_status_check
      CHECK (status IN ('draft','sent','viewed','accepted','rejected','expired','converted'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. The share link
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.estimate_share_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  token TEXT NOT NULL UNIQUE,
  recipient_email TEXT NOT NULL,
  -- The version this link was sent for. A link for version 2 must not accept
  -- version 3's price.
  version_number INTEGER,
  sent_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  first_viewed_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '60 days'),
  revoked_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.estimate_share_links IS
  'A tokenised link letting a prospect read and accept one version of one estimate without an account. The token is a credential. US-325.';

ALTER TABLE public.estimate_share_links ENABLE ROW LEVEL SECURITY;

-- Staff read their own company's links. The prospect never queries this table
-- directly: the public page goes through an edge function that holds the
-- service role, so the token is never used as a database credential.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estimate_share_links' AND policyname = 'Staff read their company estimate links'
  ) THEN
    CREATE POLICY "Staff read their company estimate links"
      ON public.estimate_share_links FOR SELECT
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. The acceptance itself
-- ---------------------------------------------------------------------------
-- Separate from the estimate row because an acceptance is evidence. It records
-- who agreed, to what exact figure, when, and from where, and it must not be
-- editable by the party that benefits from changing it.
CREATE TABLE IF NOT EXISTS public.estimate_acceptances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  share_link_id UUID REFERENCES public.estimate_share_links(id) ON DELETE SET NULL,
  accepted_by_name TEXT NOT NULL,
  accepted_by_email TEXT,
  -- Typed name or a drawn signature as a data URL. Both are accepted; which
  -- one was used is evident from the value.
  signature TEXT NOT NULL,
  signature_type TEXT NOT NULL DEFAULT 'typed' CHECK (signature_type IN ('typed','drawn')),
  -- What was agreed to, frozen. An acceptance that says only "they agreed" is
  -- worth little when the estimate has been edited since.
  accepted_total NUMERIC(14,2) NOT NULL,
  version_number INTEGER,
  accepted_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ip_address TEXT,
  user_agent TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.estimate_acceptances IS
  'Evidence that a customer agreed to a specific estimate version at a specific figure. Insert-only for staff. US-325.';

ALTER TABLE public.estimate_acceptances ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'estimate_acceptances' AND policyname = 'Staff read their company acceptances'
  ) THEN
    CREATE POLICY "Staff read their company acceptances"
      ON public.estimate_acceptances FOR SELECT
      TO authenticated
      USING (company_id = public.get_user_company(auth.uid()));
  END IF;
END $$;

-- No UPDATE or DELETE policy, for either role. Evidence that the interested
-- party can rewrite is not evidence.

-- ---------------------------------------------------------------------------
-- 4. Acceptance is the only thing that sets 'accepted'
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.mark_estimate_accepted()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE public.estimates
     SET status = 'accepted',
         accepted_date = NEW.accepted_at,
         updated_at = now()
   WHERE id = NEW.estimate_id
     AND status <> 'converted';

  UPDATE public.estimate_share_links
     SET accepted_at = NEW.accepted_at
   WHERE id = NEW.share_link_id;

  -- Every other live link for this estimate is spent: the price has been
  -- agreed, and a second acceptance at a different version would be a second
  -- contract.
  UPDATE public.estimate_share_links
     SET revoked_at = now()
   WHERE estimate_id = NEW.estimate_id
     AND id IS DISTINCT FROM NEW.share_link_id
     AND revoked_at IS NULL;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_estimate_accepted ON public.estimate_acceptances;
CREATE TRIGGER trg_estimate_accepted
  AFTER INSERT ON public.estimate_acceptances
  FOR EACH ROW EXECUTE FUNCTION public.mark_estimate_accepted();

COMMENT ON FUNCTION public.mark_estimate_accepted() IS
  'Moves the estimate to accepted when an acceptance is recorded, and spends every other live share link for it. US-325.';
