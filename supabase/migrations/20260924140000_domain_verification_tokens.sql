-- Custom-domain ownership proof by DNS TXT record.
--
-- verify-domain used to mark tenants.domain_verified = true when an HTTP HEAD
-- to the domain answered, from a public endpoint on a service-role client, so
-- anyone holding the anon key could attach any live site to any tenant. The
-- function now requires a signed-in admin and a TXT record at
-- _brikly-verify.<domain> carrying a token issued to the company (see
-- supabase/functions/_shared/domain-verification.ts). This migration adds
-- where that token lives and closes the second way in: a direct PostgREST
-- UPDATE of tenants.domain_verified by a tenant admin.
--
-- Additive only: one new table, one new trigger function, one new trigger.
--
-- 1. domain_verification_tokens - one token per company, written only by the
--    edge function (service role). Company admins may READ theirs; nobody on
--    the client side may write it. That write restriction is the whole point:
--    TXT records are public, so a company able to choose its own token could
--    copy another company's value out of DNS and claim their domain.
--
-- 2. tenants_guard_domain_verified - a client (anon / authenticated) can no
--    longer set domain_verified to true, and changing custom_domain resets it
--    to false. Both web callers already write domain_verified: false next to
--    every custom_domain change, so no shipped client loses a write it makes.
--    The service role (verify-domain) and migrations are unaffected.

-- ---------------------------------------------------------------------------
-- 1. domain_verification_tokens
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.domain_verification_tokens (
  company_id UUID PRIMARY KEY REFERENCES public.companies(id) ON DELETE CASCADE,
  -- 128 random bits, hex, with a fixed prefix so the record is recognisable in
  -- a zone file. Unique so two companies can never share a proof.
  token TEXT NOT NULL UNIQUE CHECK (token ~ '^brikly-verify=[0-9a-f]{32}$'),
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.domain_verification_tokens IS
  'Per-company token that must appear in a TXT record at _brikly-verify.<custom_domain> before verify-domain marks the domain verified. Written by the service role only.';

ALTER TABLE public.domain_verification_tokens ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.domain_verification_tokens FROM anon, authenticated;
GRANT SELECT ON public.domain_verification_tokens TO authenticated;
GRANT ALL ON public.domain_verification_tokens TO service_role;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'domain_verification_tokens'
      AND policyname = 'Company admins read their domain verification token'
  ) THEN
    CREATE POLICY "Company admins read their domain verification token"
      ON public.domain_verification_tokens FOR SELECT
      TO authenticated
      USING (
        company_id = public.get_user_company(auth.uid())
        AND public.get_user_role(auth.uid())::text IN ('admin', 'root_admin')
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. Clients cannot mark a domain verified
-- ---------------------------------------------------------------------------
-- SECURITY INVOKER on purpose: current_user has to be the caller's role.
CREATE OR REPLACE FUNCTION public.tenants_guard_domain_verified()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = ''
AS $$
BEGIN
  IF current_user NOT IN ('anon', 'authenticated') THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.domain_verified := false;
  ELSIF NEW.custom_domain IS DISTINCT FROM OLD.custom_domain THEN
    NEW.domain_verified := false;
  ELSIF NEW.domain_verified IS TRUE AND OLD.domain_verified IS NOT TRUE THEN
    NEW.domain_verified := false;
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.tenants_guard_domain_verified() IS
  'Only the service role (verify-domain, after a DNS TXT match) may set tenants.domain_verified to true; a client custom_domain change resets it.';

DROP TRIGGER IF EXISTS tenants_guard_domain_verified ON public.tenants;
CREATE TRIGGER tenants_guard_domain_verified
  BEFORE INSERT OR UPDATE ON public.tenants
  FOR EACH ROW
  EXECUTE FUNCTION public.tenants_guard_domain_verified();
