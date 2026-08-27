-- Close the cross-tenant write hole on the four tables US-237 deferred.
--
-- US-237 scoped the permissive "System can manage ..." FOR ALL USING (true)
-- policies to service_role on 12 tables, and deliberately deferred four:
-- workflow_executions, workflow_analytics, calendar_events, webhook_events.
-- The stated reason was that the frontend writes to them directly, so removing
-- the permissive policy without a company-scoped write policy would break those
-- flows.
--
-- The frontend does still write one of them (WorkflowExecutionService's
-- cancelExecution updates workflow_executions), and that write filters only by
-- execution id. Because the permissive policy is OR'd with the company-scoped
-- SELECT policy, that means ANY authenticated user can currently cancel ANY
-- company's running workflow execution — and the same shape applies to any
-- INSERT/UPDATE/DELETE on all four tables.
--
-- Rather than scope the permissive policy (a tightening that would remove the
-- only write path those flows have, which CLAUDE.md rules out in a single
-- release), this adds a RESTRICTIVE policy. Restrictive policies are AND'd with
-- the permissive ones rather than OR'd, so:
--
--   * a same-company write from the frontend still passes — nothing legitimate
--     breaks, so there is no mixed-client window to wait out;
--   * a cross-company write is now denied whatever the permissive policy says;
--   * service_role is untouched. The policy is granted TO authenticated, anon
--     only, so it does not apply to service_role at all, independently of
--     whether that role carries BYPASSRLS on a given deployment.
--
-- root_admin keeps cross-company access, matching each table's existing SELECT
-- policy — dropping that here would break the platform admin views.
--
-- Once the remaining direct client writes move behind edge functions, the
-- permissive policies can be scoped to service_role as US-237 intended; these
-- restrictive policies remain correct either way.

DO $$
DECLARE
  t text;
  company_scoped text[] := ARRAY[
    'workflow_executions',
    'workflow_analytics',
    'calendar_events'
  ];
BEGIN
  FOREACH t IN ARRAY company_scoped LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'US-237: table public.% does not exist, skipping', t;
      CONTINUE;
    END IF;

    EXECUTE format('DROP POLICY IF EXISTS %I ON public.%I', t || '_client_company_scope', t);
    EXECUTE format($f$
      CREATE POLICY %I ON public.%I
        AS RESTRICTIVE
        FOR ALL
        TO authenticated, anon
        USING (
          company_id = public.get_user_company(auth.uid())
          OR public.get_user_role(auth.uid())::text = 'root_admin'
        )
        WITH CHECK (
          company_id = public.get_user_company(auth.uid())
          OR public.get_user_role(auth.uid())::text = 'root_admin'
        )
    $f$, t || '_client_company_scope', t);

    RAISE NOTICE 'US-237: added restrictive company scope to %', t;
  END LOOP;

  -- webhook_events is platform-level and has no company_id. Its existing SELECT
  -- policy is root_admin only; mirror that for writes.
  IF to_regclass('public.webhook_events') IS NOT NULL THEN
    DROP POLICY IF EXISTS webhook_events_client_root_admin_scope ON public.webhook_events;
    CREATE POLICY webhook_events_client_root_admin_scope ON public.webhook_events
      AS RESTRICTIVE
      FOR ALL
      TO authenticated, anon
      USING (public.get_user_role(auth.uid())::text = 'root_admin')
      WITH CHECK (public.get_user_role(auth.uid())::text = 'root_admin');

    RAISE NOTICE 'US-237: added restrictive root_admin scope to webhook_events';
  END IF;
END $$;
