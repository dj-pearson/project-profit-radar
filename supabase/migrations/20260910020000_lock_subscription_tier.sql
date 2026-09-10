-- The tier a company is on is set by Stripe and root admins, nobody else (US-342).
--
-- Two holes, both letting a customer grant themselves a paid plan.
--
-- 1. subscribers. 20250703133020_...sql:23-30 created
--
--      CREATE POLICY "update_own_subscription" ON public.subscribers
--        FOR UPDATE USING (true);
--      CREATE POLICY "insert_subscription" ON public.subscribers
--        FOR INSERT WITH CHECK (true);
--
--    with no TO clause, so they apply to public - anon included. The comments
--    call them "policy for edge functions", but edge functions use the
--    service-role key, which bypasses RLS and never needed a policy. What they
--    actually granted was write access to every subscriber row in the database
--    to anyone who can reach PostgREST: set subscribed, is_complimentary or
--    subscription_end on your own row, or on somebody else's.
--
--    Dropping them is the whole fix. With no INSERT or UPDATE policy,
--    authenticated and anon cannot write the table at all, while the
--    service-role callers that legitimately maintain it - the Stripe webhook
--    and the checkout functions - are unaffected because RLS does not apply to
--    them. select_own_subscription stays, so a user can still read their own
--    subscription. Verified nothing in src/ writes this table.
--
-- 2. companies.subscription_tier. "Admins can update companies in their site"
--    (20251128000004_...sql:65-78) scopes the ROW to admins of that company and
--    restricts no COLUMNS, so any company admin could set their own tier to
--    enterprise. _shared/entitlements.ts reads that column to decide what a
--    company may do and fails OPEN on an unknown or enterprise tier, so this
--    was a paid plan for the price of one PATCH.
--
--    Same trigger shape as US-337 used for user_profiles.role, and for the same
--    reason: REVOKE UPDATE (subscription_tier) does not do what it reads like
--    when UPDATE was granted table-wide, and the grant-based alternative needs
--    an explicit column list that silently omits every column added later.
--
--    INSERT is handled differently from UPDATE. Onboarding creates a company
--    with a user JWT, so rejecting the insert would break signup; instead a
--    tier supplied at insert time is quietly reset to the default. The user
--    gets their company, just not the plan they asked for.
--
-- WHO CAN STILL SET A TIER: anything without an end-user JWT. Migrations and
-- psql sessions carry no request.jwt.claims; the Stripe webhook, checkout and
-- entitlement functions use the service-role key.

DROP POLICY IF EXISTS "update_own_subscription" ON public.subscribers;
DROP POLICY IF EXISTS "insert_subscription" ON public.subscribers;

CREATE OR REPLACE FUNCTION public.prevent_subscription_tier_self_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims text;
  jwt_role text;
  default_tier text := 'starter';
BEGIN
  claims := current_setting('request.jwt.claims', true);

  -- No JWT (migration, psql, backend connection) or the service-role key.
  IF claims IS NULL OR claims = '' THEN
    RETURN NEW;
  END IF;
  jwt_role := claims::jsonb ->> 'role';
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  IF TG_OP = 'INSERT' THEN
    -- Onboarding runs under a user JWT. Give them the company, not the plan.
    IF NEW.subscription_tier IS DISTINCT FROM default_tier THEN
      NEW.subscription_tier := default_tier;
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.subscription_tier IS DISTINCT FROM OLD.subscription_tier THEN
    RAISE EXCEPTION
      'companies.subscription_tier cannot be changed with a user token (attempted on company %). It is set by the Stripe webhook or a root admin.',
      NEW.id
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  RETURN NEW;
END;
$$;

COMMENT ON FUNCTION public.prevent_subscription_tier_self_service() IS
  'US-342. The companies UPDATE policy scopes the row to company admins and restricts no columns, so an admin could set their own subscription_tier. Rejects a tier change from any caller holding an end-user JWT, and resets a tier supplied at insert time to the default rather than failing onboarding.';

DROP TRIGGER IF EXISTS prevent_subscription_tier_self_service ON public.companies;

CREATE TRIGGER prevent_subscription_tier_self_service
  BEFORE INSERT OR UPDATE ON public.companies
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_subscription_tier_self_service();
