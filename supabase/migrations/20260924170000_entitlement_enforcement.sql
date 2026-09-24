-- Entitlement enforcement: storage quota at upload, trial expiry, and the
-- billing-state columns made server-only (US-335).
--
-- WHAT CHANGES FOR CUSTOMERS WHEN THIS IS APPLIED: nothing, apart from part 1.
-- Everything that would refuse an upload is behind two feature flags that
-- default OFF (entitlements.storage_quota, entitlements.trial_expiry). With no
-- row in public.feature_flags, storage_upload_allowed() returns true before
-- it reads anything else. docs/FEATURE_FLAGS.md has the owner steps.
--
-- 1. companies.subscription_status, trial_end_date and stripe_subscription_id
--    become server-only, the same way 20260910020000 made subscription_tier
--    server-only (US-342). Without it the trial expiry below is a
--    suggestion: the companies UPDATE policy scopes the row to company admins
--    and restricts no columns, so an admin could PATCH their own trial_end_date
--    into 2099, or set a stripe_subscription_id to be treated as paying.
--    Nothing shipped writes these columns with a user token: src/ updates
--    companies in CompanySettings.tsx (name, address) only, the iOS app does
--    not write companies, and every status writer (stripe-webhook,
--    trial-management, process-dunning, convert-trial-to-paid) uses the
--    service-role key. So this refuses no request a real client makes.
--    INSERT is handled like the tier: a new company under a user JWT is put on
--    a fresh 14-day trial instead of failing, which is exactly what
--    create_company_for_current_user (20260903010000) already asks for.
--
-- 2. Storage used per company, measured from storage.objects. Supabase
--    records the uploader in owner and the byte size in metadata->>'size';
--    the uploader's company is the company. Public marketing buckets and
--    avatars (personal, US-290) do not count.
--
-- 3. A RESTRICTIVE insert policy on storage.objects calling
--    storage_upload_allowed(bucket_id). Restrictive policies are AND'ed with
--    the existing permissive ones, so it can only narrow what they allow, and
--    while both flags are off it narrows nothing. The object's own size is not
--    known when the policy runs, so the quota refuses the first upload made
--    once usage has reached the limit: a company can go over by one file.
--
-- SQL MIRRORS OF supabase/functions/_shared/tiers.ts. A policy cannot import
-- TypeScript, so tier_storage_limit_gb restates TIER_LIMITS.*.storage and
-- company_account_read_only restates accountAccess() and GRACE_PERIOD_DAYS.
-- `node scripts/generate-tiers.mjs --check` (pre-commit and CI) reads the
-- latest migration that defines each and fails if the values disagree.
--
-- Additive: new functions, one trigger, one policy. Idempotent.

-- ---------------------------------------------------------------------------
-- 1. Billing-state columns are server-only
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.prevent_billing_state_self_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims text;
BEGIN
  claims := current_setting('request.jwt.claims', true);
  IF claims IS NULL OR claims = '' THEN
    RETURN NEW;
  END IF;
  IF (claims::jsonb ->> 'role') = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    NEW.subscription_status := 'trial';
    NEW.trial_end_date := now() + interval '14 days';
    NEW.stripe_subscription_id := NULL;
    RETURN NEW;
  END IF;

  IF NEW.subscription_status IS DISTINCT FROM OLD.subscription_status
     OR NEW.trial_end_date IS DISTINCT FROM OLD.trial_end_date
     OR NEW.stripe_subscription_id IS DISTINCT FROM OLD.stripe_subscription_id THEN
    RAISE EXCEPTION
      'companies billing state (subscription_status, trial_end_date, stripe_subscription_id) cannot be changed with a user token (attempted on company %). It is set by Stripe and the billing functions.',
      NEW.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_billing_state_self_service() IS
  'US-335. Same shape as prevent_subscription_tier_self_service (US-342): a user JWT cannot change subscription_status, trial_end_date or stripe_subscription_id, and a company inserted under one starts a fresh 14-day trial.';

DROP TRIGGER IF EXISTS prevent_billing_state_self_service ON public.companies;
CREATE TRIGGER prevent_billing_state_self_service
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_billing_state_self_service();

-- ---------------------------------------------------------------------------
-- 2. Mirrors of _shared/tiers.ts (checked by generate-tiers.mjs --check)
-- ---------------------------------------------------------------------------

-- TIER_LIMITS.<tier>.storage in GB. -1 is unlimited. NULL for a tier nobody
-- recognises, which the caller treats as "do not enforce", the same way
-- checkEntitlement fails open on an unknown tier.
CREATE OR REPLACE FUNCTION public.tier_storage_limit_gb(p_tier text)
RETURNS bigint
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE p_tier
    WHEN 'starter' THEN 10
    WHEN 'professional' THEN 100
    WHEN 'enterprise' THEN -1
    ELSE NULL
  END::bigint;
$$;

-- accountAccess() = 'read_only'. See tiers.ts for why each branch is what it
-- is; in short: suspended is read-only, grace_period is not (it is also the
-- past_due state), and a trial is read-only GRACE_PERIOD_DAYS after it ends
-- unless a Stripe subscription is attached or the user is complimentary.
CREATE OR REPLACE FUNCTION public.company_account_read_only(p_company_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status text;
  v_trial_end timestamptz;
  v_stripe_sub text;
BEGIN
  IF p_user_id IS NOT NULL AND to_regclass('public.subscribers') IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM public.subscribers s
      WHERE s.user_id = p_user_id
        AND s.is_complimentary
        AND (s.complimentary_expires_at IS NULL OR s.complimentary_expires_at > now())
    ) THEN
      RETURN false;
    END IF;
  END IF;

  SELECT c.subscription_status::text, c.trial_end_date, c.stripe_subscription_id::text
    INTO v_status, v_trial_end, v_stripe_sub
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF NOT FOUND THEN
    RETURN false;
  END IF;
  IF v_status = 'suspended' THEN
    RETURN true;
  END IF;
  IF v_status IS DISTINCT FROM 'trial' OR v_stripe_sub IS NOT NULL OR v_trial_end IS NULL THEN
    RETURN false;
  END IF;
  RETURN now() > v_trial_end + interval '7 days';
END;
$$;

REVOKE ALL ON FUNCTION public.company_account_read_only(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_account_read_only(uuid, uuid) TO service_role;

-- ---------------------------------------------------------------------------
-- 3. Flag resolution in SQL
-- ---------------------------------------------------------------------------
-- The same order as resolveFlag() in _shared/feature-flags.ts: a global off
-- row wins, then the company's row, then a global row, then the default. A
-- read error (the table not applied yet) answers p_on_read_error.

CREATE OR REPLACE FUNCTION public.feature_flag_enabled(
  p_flag_key text,
  p_company_id uuid,
  p_default boolean,
  p_on_read_error boolean
)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_global boolean;
  v_company boolean;
BEGIN
  SELECT f.enabled INTO v_global
  FROM public.feature_flags f
  WHERE f.flag_key = p_flag_key AND f.company_id IS NULL;

  IF v_global IS NOT NULL AND v_global = false THEN
    RETURN false;
  END IF;

  IF p_company_id IS NOT NULL THEN
    SELECT f.enabled INTO v_company
    FROM public.feature_flags f
    WHERE f.flag_key = p_flag_key AND f.company_id = p_company_id;
    IF v_company IS NOT NULL THEN
      RETURN v_company;
    END IF;
  END IF;

  IF v_global IS NOT NULL THEN
    RETURN v_global;
  END IF;
  RETURN p_default;
EXCEPTION WHEN OTHERS THEN
  RETURN p_on_read_error;
END;
$$;

REVOKE ALL ON FUNCTION public.feature_flag_enabled(text, uuid, boolean, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.feature_flag_enabled(text, uuid, boolean, boolean) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 4. Storage used by a company
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.company_storage_used_bytes(p_company_id uuid)
RETURNS bigint
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_total bigint;
BEGIN
  -- A signed-in caller may ask about their own company only. No uid means
  -- the service role or a backend connection.
  IF v_uid IS NOT NULL
     AND p_company_id IS DISTINCT FROM public.get_user_company(v_uid)
     AND public.get_user_role(v_uid)::text IS DISTINCT FROM 'root_admin' THEN
    RAISE EXCEPTION 'company_storage_used_bytes: not your company'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT coalesce(sum((o.metadata ->> 'size')::bigint), 0)
    INTO v_total
  FROM storage.objects o
  JOIN public.user_profiles up ON up.id = o.owner
  WHERE up.company_id = p_company_id
    AND o.bucket_id NOT IN ('site-assets', 'blog-images', 'avatars');

  RETURN v_total;
END;
$$;

COMMENT ON FUNCTION public.company_storage_used_bytes(uuid) IS
  'US-335. Bytes stored by a company''s users, from storage.objects.owner and metadata size. Excludes public marketing buckets and avatars. Callers may ask about their own company only.';

REVOKE ALL ON FUNCTION public.company_storage_used_bytes(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.company_storage_used_bytes(uuid) TO authenticated, service_role;

-- ---------------------------------------------------------------------------
-- 5. The upload gate
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.storage_upload_allowed(p_bucket_id text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_company uuid;
  v_tier text;
  v_limit_gb bigint;
BEGIN
  IF v_uid IS NULL OR p_bucket_id IN ('site-assets', 'blog-images', 'avatars') THEN
    RETURN true;
  END IF;

  v_company := public.get_user_company(v_uid);
  IF v_company IS NULL THEN
    RETURN true;
  END IF;

  -- Both flags are registered with default false and onReadError false.
  IF public.feature_flag_enabled('entitlements.trial_expiry', v_company, false, false)
     AND public.company_account_read_only(v_company, v_uid) THEN
    RETURN false;
  END IF;

  IF NOT public.feature_flag_enabled('entitlements.storage_quota', v_company, false, false) THEN
    RETURN true;
  END IF;

  IF to_regclass('public.subscribers') IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.subscribers s
    WHERE s.user_id = v_uid
      AND s.is_complimentary
      AND (s.complimentary_expires_at IS NULL OR s.complimentary_expires_at > now())
  ) THEN
    RETURN true;
  END IF;

  SELECT c.subscription_tier::text INTO v_tier FROM public.companies c WHERE c.id = v_company;
  v_limit_gb := public.tier_storage_limit_gb(coalesce(v_tier, 'starter'));
  IF v_limit_gb IS NULL OR v_limit_gb = -1 THEN
    RETURN true;
  END IF;

  RETURN public.company_storage_used_bytes(v_company) < v_limit_gb * 1073741824;
EXCEPTION WHEN OTHERS THEN
  -- Never refuse an upload because the check itself broke.
  RETURN true;
END;
$$;

COMMENT ON FUNCTION public.storage_upload_allowed(text) IS
  'US-335. False when entitlements.trial_expiry is on and the company is read-only, or entitlements.storage_quota is on and the company has used its plan storage. True otherwise, and on any error.';

REVOKE ALL ON FUNCTION public.storage_upload_allowed(text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.storage_upload_allowed(text) TO authenticated, service_role;

DROP POLICY IF EXISTS "Uploads respect plan storage and account standing" ON storage.objects;
CREATE POLICY "Uploads respect plan storage and account standing"
  ON storage.objects
  AS RESTRICTIVE
  FOR INSERT
  TO authenticated
  WITH CHECK (public.storage_upload_allowed(bucket_id));
