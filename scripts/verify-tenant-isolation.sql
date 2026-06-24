-- Tenant-isolation verification for US-197.
--
-- Run against STAGING after applying migration
-- 20260613120000_harden_tenant_isolation_rls.sql. It impersonates two users
-- from DIFFERENT companies and asserts neither can read the other's timesheets
-- or payment failures. Replace the placeholder UUIDs with two real users that
-- belong to two different companies (and have at least one timesheet /
-- payment_failure row each so the assertions are meaningful).
--
-- Usage (psql):
--   \set user_a '00000000-0000-0000-0000-000000000001'
--   \set company_a '...'   -- user_a's company_id
--   \set user_b '00000000-0000-0000-0000-000000000002'
--   \set company_b '...'   -- user_b's company_id (must differ from company_a)
--   \i scripts/verify-tenant-isolation.sql

\echo '== Verifying timesheet view isolation as user_a =='
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'user_a', 'role', 'authenticated')::text,
  true
);

-- Every row user_a can see via the (now security_invoker) views must belong to
-- user_a's company. A non-zero count here means cross-tenant leakage.
SELECT
  'pending_timesheet_approvals leaks' AS assertion,
  count(*) AS offending_rows
FROM pending_timesheet_approvals pta
JOIN projects p ON p.id = pta.project_id
WHERE p.company_id IS DISTINCT FROM :'company_a'::uuid;

SELECT
  'approved_timesheets leaks' AS assertion,
  count(*) AS offending_rows
FROM approved_timesheets at
JOIN projects p ON p.id = at.project_id
WHERE p.company_id IS DISTINCT FROM :'company_a'::uuid;

RESET ROLE;

\echo '== Verifying payment_failures isolation as user_b =='
SET ROLE authenticated;
SELECT set_config(
  'request.jwt.claims',
  json_build_object('sub', :'user_b', 'role', 'authenticated')::text,
  true
);

-- user_b must only see payment_failures tied to their own subscriber record.
-- Any row whose subscriber does not belong to user_b is a leak.
SELECT
  'payment_failures leaks' AS assertion,
  count(*) AS offending_rows
FROM payment_failures pf
LEFT JOIN subscribers s ON s.id = pf.subscriber_id
WHERE s.user_id IS DISTINCT FROM :'user_b'::uuid;

RESET ROLE;

\echo 'PASS criteria: every "offending_rows" value above must be 0.'
