-- The audit trail was writable by anyone, including anon (US-306).
--
-- Two permissive INSERT policies on public.audit_logs, neither carrying a TO
-- clause, so both grant PUBLIC:
--
--   "System can insert audit logs"  20250703164308  FOR INSERT WITH CHECK (true)
--   "site_audit_logs_insert"        20251203000002  FOR INSERT WITH CHECK (true)
--
-- The second did not drop the first, and permissive policies OR together, so
-- authenticated and anon could both insert arbitrary rows: user_id, company_id,
-- action_type, risk_level and created_at are all caller-supplied. That means
-- fabricating entries against another user, planting them in another company's
-- trail, or burying a real event under noise.
--
-- The audit trail is what an incident is reconstructed from, and CLAUDE.md
-- makes logging critical actions to it non-negotiable. A trail the actor can
-- write is not evidence.
--
-- Nothing legitimate loses a write path:
--
--   * Edge functions write with the service role (_shared/audit-log.ts and
--     verify-domain both construct a SERVICE_ROLE_KEY client).
--   * The in-database writers are SECURITY DEFINER functions and the BEFORE
--     INSERT trigger from 20250202000012, which run as the table owner.
--   * The only browser-side writer is useSecurityMonitor's sendBatchToServer,
--     and that hook is mounted nowhere in the app - its only importer is its
--     own test. See US-299 for the decision about that hook.
--
-- RESTRICTIVE rather than scoping the permissive policies: restrictive policies
-- are AND'd with permissive ones, so this denies the client roles whatever the
-- merged policies say, without editing a merged migration and without a window
-- where some path has no write access. It is granted TO authenticated, anon
-- only, so it does not apply to service_role at all, independently of whether
-- that role carries BYPASSRLS on a given deployment.

DO $$
BEGIN
  IF to_regclass('public.audit_logs') IS NULL THEN
    RAISE NOTICE 'US-306: public.audit_logs does not exist, skipping';
    RETURN;
  END IF;

  DROP POLICY IF EXISTS audit_logs_no_client_writes ON public.audit_logs;

  -- FOR ALL rather than FOR INSERT: an UPDATE or DELETE policy added later
  -- without a TO clause would reopen the same hole from the other direction,
  -- and nothing client-side has any business mutating the trail either.
  CREATE POLICY audit_logs_no_client_writes ON public.audit_logs
    AS RESTRICTIVE
    FOR ALL
    TO authenticated, anon
    USING (true)          -- reads stay governed by the existing SELECT policies
    WITH CHECK (false);   -- no INSERT or UPDATE from a client, ever

  COMMENT ON POLICY audit_logs_no_client_writes ON public.audit_logs IS
    'US-306. RESTRICTIVE, so it is AND''d with the two permissive PUBLIC INSERT policies that predate it and cannot be edited. USING (true) leaves reads to the SELECT policies; WITH CHECK (false) denies every client write. Service-role and owner writers are unaffected. Removing this makes the audit trail forgeable by any browser session.';
END $$;
