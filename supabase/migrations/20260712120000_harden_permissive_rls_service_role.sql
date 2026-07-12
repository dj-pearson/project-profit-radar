-- Harden permissive RLS policies (US-237, extends US-197)
--
-- Several tables carry a redundant "System can manage ..." policy defined as
--   FOR ALL USING (true)
-- with no role restriction, so it defaults to PUBLIC. Because permissive
-- policies are OR'd together, that TRUE predicate overrides the table's proper
-- company/user-scoped SELECT policy and lets ANY authenticated user read (and
-- write) every tenant's rows. The service role bypasses RLS, so the policy is
-- unnecessary for edge functions and dangerous for clients (see US-197, which
-- fixed payment_failures the same way).
--
-- This migration scopes those policies to service_role ONLY for tables that
-- have been VERIFIED safe to change:
--   * the frontend does not access them directly (only via service-role edge
--     functions), OR
--   * the frontend reads them exclusively through a separate company-scoped
--     SELECT policy that remains in force (e.g. job_costing_summary,
--     usage_metrics), and does not write to them directly.
--
-- It operates on the LIVE pg_policies catalog rather than dropping policies by
-- name, so it is idempotent, tolerates later renames, and automatically skips
-- policies that are already scoped to service_role (e.g. payment_failures,
-- fixed in US-197).
--
-- DEFERRED (intentionally NOT changed here — each needs a company-scoped
-- write/read policy added first, then verification on staging):
--   * workflow_executions, workflow_analytics, calendar_events, webhook_events
--     — the frontend writes to these directly via the authenticated client, so
--     removing the permissive policy without adding a scoped write policy would
--     break those flows.
--   * pseo_* , trades, seo_meta_tags, feature_announcements,
--     ai_environment_config, oauth_pending_states, saml_pending_requests
--     — intentionally public / reference / auth-flow data; scoping them to
--     service_role could break legitimate public or shared reads.
-- See scripts/check-rls-policies.mjs for the full audit and the regression guard.

DO $$
DECLARE
  t text;
  r record;
  fixed_count int := 0;
  safe_tables text[] := ARRAY[
    'job_costing_summary',
    'usage_metrics',
    'document_signatures',
    'project_predictions',
    'prediction_performance',
    'incident_metrics',
    'affiliate_referrals',
    'affiliate_rewards',
    'workflow_step_executions',
    'automated_workflow_executions',
    'resource_availability_patterns',
    'weather_forecasts'
  ];
BEGIN
  FOREACH t IN ARRAY safe_tables LOOP
    IF to_regclass('public.' || t) IS NULL THEN
      RAISE NOTICE 'US-237: table public.% does not exist, skipping', t;
      CONTINUE;
    END IF;

    FOR r IN
      SELECT policyname
      FROM pg_policies
      WHERE schemaname = 'public'
        AND tablename  = t
        AND cmd = 'ALL'                                    -- FOR ALL
        AND permissive = 'PERMISSIVE'                      -- OR'd with other policies
        AND coalesce(btrim(qual), '') = 'true'             -- USING (true)
        AND roles && ARRAY['public','authenticated','anon']::name[]  -- reachable by clients
    LOOP
      EXECUTE format('ALTER POLICY %I ON public.%I TO service_role', r.policyname, t);
      fixed_count := fixed_count + 1;
      RAISE NOTICE 'US-237: scoped permissive policy "%" on % to service_role', r.policyname, t;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'US-237: scoped % permissive policy/policies to service_role', fixed_count;
END $$;
