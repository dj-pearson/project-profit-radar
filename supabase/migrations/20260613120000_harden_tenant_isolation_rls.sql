-- Harden multi-tenant isolation (US-197)
--
-- Closes two confirmed cross-tenant read leaks. Both changes are security
-- tightenings; backward-compat analysis is inline. No legitimate same-company
-- workflow is removed (managers retain company-wide visibility; edge functions
-- use the service role which bypasses RLS entirely).

-- ---------------------------------------------------------------------------
-- 1) Timesheet approval views were created with plain CREATE VIEW, which means
--    they run as SECURITY DEFINER (the view owner) and BYPASS the row-level
--    security on the underlying time_entries table. Result: any authenticated
--    user querying pending_timesheet_approvals / approved_timesheets could read
--    EVERY company's timesheets.
--
--    Switching the views to security_invoker = true makes the querying user's
--    own RLS apply. time_entries_select already scopes correctly
--    (user_in_company(company_id) AND (own OR manager/admin)), and
--    user_profiles_select exposes company members, so approvers keep full
--    visibility of their own company's timesheets (incl. worker names) while
--    other tenants' rows are filtered out. Requires PostgreSQL 15+ (Supabase).
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.pending_timesheet_approvals') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.pending_timesheet_approvals SET (security_invoker = true)';
  END IF;
  IF to_regclass('public.approved_timesheets') IS NOT NULL THEN
    EXECUTE 'ALTER VIEW public.approved_timesheets SET (security_invoker = true)';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2) payment_failures had a permissive "FOR ALL USING (true)" policy intended
--    for system/service access. Because permissive RLS policies are OR'd, that
--    policy widened SELECT to TRUE for every authenticated user, overriding the
--    per-user "Users can view their payment failures" policy and exposing all
--    tenants' dunning/financial-distress rows.
--
--    The service role bypasses RLS, so that policy was redundant for edge
--    functions and dangerous for clients. Drop it and re-grant management to
--    the service role explicitly. The correct per-user SELECT policy
--    (EXISTS subscribers WHERE user_id = auth.uid()) remains and continues to
--    scope the PaymentFailureAlert UI to the caller's own rows.
-- ---------------------------------------------------------------------------
DROP POLICY IF EXISTS "System can manage payment failures" ON public.payment_failures;

CREATE POLICY "Service role manages payment failures"
  ON public.payment_failures
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);
