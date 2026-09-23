-- US-281 feature flags: signed-in users read the global rows and their own
-- company's rows, nobody on the client side writes, and every service-role
-- change leaves an audit_logs row.

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid, user_id uuid, action_type text, resource_type text, resource_id text,
  resource_name text, old_values jsonb, new_values jsonb, ip_address inet, user_agent text,
  session_id text, risk_level text, compliance_category text, description text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE FUNCTION public.log_consent_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;

\i supabase/migrations/20260923020000_lock_privileged_definer_functions.sql
\i supabase/migrations/20260924160000_feature_flags.sql

-- True when running the statement raises insufficient_privilege (42501).
CREATE FUNCTION public.test_denied(stmt text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('bbbbbbbb-0000-0000-0000-00000000000a'), ('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('cccccccc-0000-0000-0000-0000000000cc', NULL, 'root_admin');

-- The documented procedure: service role (dashboard SQL editor) writes.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.feature_flags (flag_key, company_id, enabled, reason, changed_by) VALUES
  ('quickbooks.sync', NULL, true, 'baseline', 'ops@example.com'),
  ('quickbooks.sync', 'bbbbbbbb-0000-0000-0000-000000000000', false, 'B imports duplicating', 'ops@example.com');
COMMIT;

SELECT test_assert((SELECT count(*) FROM public.feature_flags) = 2, 'service_role can write feature_flags');

SELECT test_assert(
  (SELECT count(*) FROM public.audit_logs) = 2,
  'each insert leaves an audit row');

-- One global row per key; key shape and a reason are enforced.
DO $$
BEGIN
  INSERT INTO public.feature_flags (flag_key, company_id, enabled, reason) VALUES ('quickbooks.sync', NULL, false, 'dup');
  RAISE EXCEPTION 'second global row was accepted';
EXCEPTION WHEN unique_violation THEN
  NULL;
END $$;
SELECT test_assert(true, 'a second global row for the same key is rejected');

DO $$
BEGIN
  INSERT INTO public.feature_flags (flag_key, enabled, reason) VALUES ('Bad Key', true, 'x');
  RAISE EXCEPTION 'malformed key was accepted';
EXCEPTION WHEN check_violation THEN
  NULL;
END $$;
SELECT test_assert(true, 'a malformed flag key is rejected');

DO $$
BEGIN
  INSERT INTO public.feature_flags (flag_key, enabled, reason) VALUES ('other.flag', true, '  ');
  RAISE EXCEPTION 'blank reason was accepted';
EXCEPTION WHEN check_violation THEN
  NULL;
END $$;
SELECT test_assert(true, 'a flip without a reason is rejected');

-- Company A users see the global row only; company B sees its own row too.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert(
  (SELECT count(*) FROM public.feature_flags) = 1
  AND (SELECT count(*) FROM public.feature_flags WHERE company_id IS NULL) = 1,
  'field_supervisor in A reads the global row and not B''s row');
ROLLBACK;

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert((SELECT count(*) FROM public.feature_flags) = 2, 'admin in B reads the global row and B''s row');
ROLLBACK;

-- anon reads nothing.
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(test_denied('SELECT 1 FROM public.feature_flags'), 'anon cannot read feature_flags');
ROLLBACK;

-- No client writes, not even an admin or root_admin: flipping is service role
-- only, so the audit row always comes from the documented procedure.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  test_denied($q$INSERT INTO public.feature_flags (flag_key, company_id, enabled, reason) VALUES ('quickbooks.sync', 'aaaaaaaa-0000-0000-0000-000000000000', false, 'x')$q$),
  'admin cannot insert a flag');
SELECT test_assert(
  test_denied($q$UPDATE public.feature_flags SET enabled = false$q$),
  'admin cannot update a flag');
SELECT test_assert(
  test_denied($q$DELETE FROM public.feature_flags$q$),
  'admin cannot delete a flag');
ROLLBACK;

BEGIN;
SELECT test_act_as('cccccccc-0000-0000-0000-0000000000cc');
SELECT test_assert(
  test_denied($q$UPDATE public.feature_flags SET enabled = false$q$),
  'root_admin cannot flip a flag from the client either');
ROLLBACK;

-- Flip the kill switch and remove the company row the way the doc says, and
-- check both are audited with old and new values.
BEGIN;
SET LOCAL ROLE service_role;
UPDATE public.feature_flags SET enabled = false, reason = 'Intuit 500s', changed_by = 'ops@example.com'
  WHERE flag_key = 'quickbooks.sync' AND company_id IS NULL;
DELETE FROM public.feature_flags WHERE flag_key = 'quickbooks.sync' AND company_id IS NOT NULL;
COMMIT;

SELECT test_assert(
  (SELECT count(*) FROM public.audit_logs) = 4,
  'update and delete are audited');
SELECT test_assert(
  (SELECT (old_values->>'enabled')::boolean = true AND (new_values->>'enabled')::boolean = false
          AND company_id IS NULL AND resource_type = 'feature_flag' AND risk_level = 'high'
     FROM public.audit_logs WHERE action_type = 'update'),
  'the update audit row carries old and new values');
SELECT test_assert(
  (SELECT company_id = 'bbbbbbbb-0000-0000-0000-000000000000' AND new_values IS NULL
     FROM public.audit_logs WHERE action_type = 'delete'),
  'the delete audit row is scoped to the company it removed');
SELECT test_assert(
  (SELECT updated_at > created_at FROM public.feature_flags WHERE company_id IS NULL),
  'updated_at is stamped on change');
