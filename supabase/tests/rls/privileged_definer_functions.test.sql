-- US-353: privileged SECURITY DEFINER functions are not callable by ordinary
-- users, and log_audit_event only writes rows for the caller.

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid, user_id uuid, action_type text, resource_type text, resource_id text,
  resource_name text, old_values jsonb, new_values jsonb, ip_address inet, user_agent text,
  session_id text, risk_level text, compliance_category text, description text, metadata jsonb
);
CREATE TABLE public.user_sessions (user_id uuid, site_id uuid, is_active boolean);

-- Stand-ins with the live signatures (types.ts and 20251203000005).
CREATE FUNCTION public.revoke_all_user_sessions(p_user_id uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER AS $$ UPDATE public.user_sessions SET is_active = false WHERE user_id = p_user_id RETURNING 1 $$;
CREATE FUNCTION public.revoke_all_user_sessions(p_user_id uuid, p_site_id uuid) RETURNS integer
LANGUAGE sql SECURITY DEFINER AS $$ SELECT 0 $$;
CREATE FUNCTION public.grant_permission_to_user(p_user_id uuid, p_permission_name text, p_granted_by uuid) RETURNS uuid
LANGUAGE sql SECURITY DEFINER AS $$ SELECT gen_random_uuid() $$;

-- Consent table and the trigger that audits a withdrawal.
CREATE TABLE public.consents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid, user_id uuid, consent_type text, purpose text,
  consent_given boolean, withdrawal_date timestamptz
);
CREATE FUNCTION public.log_consent_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
CREATE TRIGGER consent_withdrawal BEFORE UPDATE ON public.consents FOR EACH ROW EXECUTE FUNCTION public.log_consent_withdrawal();
GRANT SELECT, UPDATE ON public.consents TO authenticated;

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b'), ('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A Build'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B Build');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('cccccccc-0000-0000-0000-0000000000cc', NULL, 'root_admin');
INSERT INTO public.consents (company_id, user_id, consent_type, purpose, consent_given) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-00000000000b', 'marketing', 'newsletter', true);

-- Before: an ordinary user can revoke someone else's sessions.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT public.revoke_all_user_sessions('bbbbbbbb-0000-0000-0000-00000000000b');
SELECT test_assert(true, 'before the fix, authenticated can call revoke_all_user_sessions');
ROLLBACK;

\i supabase/migrations/20260923020000_lock_privileged_definer_functions.sql

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(pg_temp.denied($$SELECT public.revoke_all_user_sessions('bbbbbbbb-0000-0000-0000-00000000000b')$$), 'authenticated cannot call revoke_all_user_sessions(uuid)');
SELECT test_assert(pg_temp.denied($$SELECT public.revoke_all_user_sessions('bbbbbbbb-0000-0000-0000-00000000000b', NULL)$$), 'authenticated cannot call revoke_all_user_sessions(uuid, uuid)');
SELECT test_assert(pg_temp.denied($$SELECT public.grant_permission_to_user('aaaaaaaa-0000-0000-0000-00000000000a', 'admin', 'aaaaaaaa-0000-0000-0000-00000000000a')$$), 'authenticated cannot call grant_permission_to_user');
SELECT test_assert(pg_temp.denied($$SELECT public.write_audit_log_internal('bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-00000000000b', 'delete', 'project')$$), 'authenticated cannot call write_audit_log_internal');

-- The browser's own call still works.
SELECT test_assert(public.log_audit_event('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-00000000000a', 'update', 'project') IS NOT NULL,
  'a user logs an event for themselves in their own company');
SELECT test_assert(pg_temp.denied($$SELECT public.log_audit_event('bbbbbbbb-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-00000000000a', 'delete', 'project')$$),
  'a user cannot write an audit row into another company');
SELECT test_assert(pg_temp.denied($$SELECT public.log_audit_event('aaaaaaaa-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-00000000000b', 'delete', 'project')$$),
  'a user cannot write an audit row as someone else');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT public.log_audit_event('aaaaaaaa-0000-0000-0000-000000000000', NULL, 'view', 'report');
RESET ROLE;
SELECT test_assert((SELECT user_id FROM public.audit_logs WHERE action_type = 'view') = 'aaaaaaaa-0000-0000-0000-00000000000a',
  'a NULL p_user_id is recorded as the caller');
ROLLBACK;

BEGIN;
SELECT test_act_as('cccccccc-0000-0000-0000-0000000000cc');
SELECT test_assert(public.log_audit_event('bbbbbbbb-0000-0000-0000-000000000000', 'cccccccc-0000-0000-0000-0000000000cc', 'update', 'company') IS NOT NULL,
  'root_admin can log against any company, as themselves');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.denied($$SELECT public.log_audit_event('aaaaaaaa-0000-0000-0000-000000000000', NULL, 'x', 'y')$$), 'anon cannot call log_audit_event');
ROLLBACK;

-- The trigger records the consent row's user even when someone else withdraws it.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
UPDATE public.consents SET consent_given = false WHERE purpose = 'newsletter';
RESET ROLE;
SELECT test_assert((SELECT user_id FROM public.audit_logs WHERE resource_type = 'consent') = 'bbbbbbbb-0000-0000-0000-00000000000b',
  'consent withdrawal still audits the consent owner through the internal writer');
ROLLBACK;

BEGIN;
SET LOCAL ROLE service_role;
SELECT test_assert(public.log_audit_event('bbbbbbbb-0000-0000-0000-000000000000', 'bbbbbbbb-0000-0000-0000-00000000000b', 'sync', 'invoice') IS NOT NULL,
  'service_role keeps the old behaviour');
ROLLBACK;
