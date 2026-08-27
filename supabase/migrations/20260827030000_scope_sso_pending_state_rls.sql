-- Scope the SSO pending-state policies to service_role (US-237).
--
-- saml_pending_requests and oauth_pending_states were created with:
--
--   CREATE POLICY "Service role manages OAuth states"
--     ON oauth_pending_states FOR ALL USING (true) WITH CHECK (true);
--
-- The name says service role. The policy has no TO clause, so it is granted to
-- PUBLIC — which on a Supabase project means anon and authenticated, both
-- reachable with the publishable key that ships in the web bundle.
--
-- oauth_pending_states stores `state` and, for PKCE flows, `code_verifier`.
-- The code verifier is the secret that binds an authorization code to the
-- client that started the flow; sso-oauth-callback reads it back and sends it
-- with the token exchange. Anyone able to SELECT this table can therefore
-- defeat PKCE for a code they observe, and read or forge `state` to defeat the
-- CSRF check. Write access additionally allows seeding a row with an
-- attacker-chosen return_url.
--
-- US-237 deferred these tables as "auth-flow data ... scoping them to
-- service_role could break legitimate public or shared reads". There are no
-- such reads: nothing under src/, Brikly-iOS/ or mobile-app/ references either
-- table, and the only three functions that do (sso-oauth-init, sso-saml-init,
-- sso-oauth-callback) all build a SERVICE_ROLE_KEY client. So this is a
-- tightening with nothing on the other side of it to break.
--
-- Operates on the live pg_policies catalog, so it is idempotent and tolerates
-- the policies having been renamed.

DO $$
DECLARE
  t text;
  r record;
  fixed_count int := 0;
  auth_state_tables text[] := ARRAY[
    'saml_pending_requests',
    'oauth_pending_states'
  ];
BEGIN
  FOREACH t IN ARRAY auth_state_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'US-237: table public.% does not exist, skipping', t;
      CONTINUE;
    END IF;

    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = t
        AND cmd = 'ALL'
        AND permissive = 'PERMISSIVE'
        AND coalesce(btrim(qual), '') = 'true'
        AND roles && ARRAY['public','authenticated','anon']::name[]
    LOOP
      EXECUTE format('ALTER POLICY %I ON public.%I TO service_role', r.policyname, t);
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'US-237: scoped permissive policy "%" on % to service_role', r.policyname, t;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'US-237: scoped % SSO pending-state policy/policies to service_role', fixed_count;
END $$;
