-- Ten more tables any client could write (US-306 follow-up).
--
-- 20260827080000 closed audit_logs. The same shape - a policy NAMED "System
-- can ..." with no TO clause, so it grants PUBLIC - covers a whole class that
-- check-rls-policies.mjs never looked at, because that guard only matches
-- FOR ALL ... USING (true) and these are FOR INSERT/UPDATE ... WITH CHECK
-- (true). A scan of the migration history turned up 68 open policies; this
-- migration takes the ten where the browser writes nothing at all, so denying
-- client roles removes no working path:
--
--   data_access_logs           who read what PII
--   document_access_logs       who opened which document
--   sensitive_data_access_log  the field-level-encryption access trail
--   security_logs              MFA and SSO events
--   security_metrics           aggregate security posture
--   api_request_logs           API traffic record
--   ddos_detection_logs        attack detection record
--   rate_limit_state           the counters themselves
--   affiliate_codes            referral codes and their commission
--
-- Two of these are not merely record-keeping. rate_limit_state carried an open
-- INSERT *and* an open UPDATE, so a client could reset the counter throttling
-- it, which is the whole of US-243's ceiling. affiliate_codes carried an open
-- INSERT and UPDATE, so a caller could mint a referral code or change the
-- commission on one. The rest are the evidence you would reach for after an
-- incident, and evidence the actor can write is not evidence.
--
-- rate_limit_violations is deliberately NOT here, though it is open the same
-- way. _shared/rate-limiter.ts writes it with whatever client the caller hands
-- it, and most checkRateLimit callers pass their user-JWT client. Denying it
-- would stop violations being recorded, and since checkRateLimit decides
-- `allowed` by counting those rows, the limit would stop tripping altogether -
-- a silent loss of rate limiting rather than a silent loss of logging. Those
-- call sites have to move to a service-role client first.
--
-- Nothing legitimate loses a write. No src/ code inserts, updates, upserts or
-- deletes any of these (checked with a repo-wide scan of the four write verbs
-- against every from('<table>') call). The edge functions that write them use
-- the service role, which RLS does not apply to - the four security_logs
-- writes in setup-mfa and sso-manage that still used a user-JWT client were
-- converted in the same change, and scripts/check-rls-write-paths.mjs now
-- watches all ten so a user-JWT write cannot come back.
--
-- RESTRICTIVE, TO authenticated and anon only, exactly as 20260827080000:
-- AND'd with the merged permissive policies rather than replacing them, so
-- there is no window where a writer loses its path, and no merged migration is
-- edited. USING (true) leaves reads to each table's existing SELECT policies.
-- FOR ALL so a later UPDATE or DELETE policy without a TO clause cannot reopen
-- the hole from the other direction.

DO $$
DECLARE
  t text;
  system_tables text[] := ARRAY[
    'data_access_logs',
    'document_access_logs',
    'sensitive_data_access_log',
    'security_logs',
    'security_metrics',
    'api_request_logs',
    'ddos_detection_logs',
    'rate_limit_state',
    'affiliate_codes'
  ];
BEGIN
  FOREACH t IN ARRAY system_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'US-306: table public.% does not exist, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_no_client_writes', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated, anon
        USING (true)
        WITH CHECK (false)
    $f$, t || '_no_client_writes', t);

    EXECUTE format(
      'COMMENT ON POLICY %I ON public.%I IS %L',
      t || '_no_client_writes', t,
      'US-306. RESTRICTIVE, so it is AND''d with the permissive PUBLIC policies that predate it and cannot be edited. USING (true) leaves reads to the SELECT policies; WITH CHECK (false) denies every client write. Service-role and owner writers are unaffected.'
    );
  END LOOP;
END $$;
