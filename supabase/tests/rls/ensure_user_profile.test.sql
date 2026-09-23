-- US-357: a session with no profile gets one; handle_new_user ignores a role
-- the signing-up user put in their own metadata.

ALTER TABLE auth.users ADD COLUMN email text, ADD COLUMN raw_user_meta_data jsonb, ADD COLUMN raw_app_meta_data jsonb;
ALTER TABLE public.user_profiles
  ADD COLUMN email text, ADD COLUMN first_name text, ADD COLUMN last_name text,
  ADD COLUMN phone text, ADD COLUMN is_active boolean DEFAULT true;

\i supabase/migrations/20260923090000_ensure_user_profile.sql
CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- A user signing themselves up with role: root_admin in their metadata.
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
VALUES ('dddddddd-0000-0000-0000-00000000000d', 'mallory@example.com', '{"first_name":"M","role":"root_admin"}', '{}');
SELECT test_assert((SELECT role::text FROM public.user_profiles WHERE id = 'dddddddd-0000-0000-0000-00000000000d') = 'admin',
  'handle_new_user ignores a role in user-controlled metadata');

-- A server-set role in app metadata is honoured.
INSERT INTO auth.users (id, email, raw_user_meta_data, raw_app_meta_data)
VALUES ('eeeeeeee-0000-0000-0000-00000000000e', 'pm@example.com', '{}', '{"role":"project_manager"}');
SELECT test_assert((SELECT role::text FROM public.user_profiles WHERE id = 'eeeeeeee-0000-0000-0000-00000000000e') = 'project_manager',
  'handle_new_user takes role from server-only app metadata');

-- An auth user whose profile row is missing (trigger failed, partial signup).
ALTER TABLE auth.users DISABLE TRIGGER on_auth_user_created;
INSERT INTO auth.users (id, email, raw_user_meta_data) VALUES ('ffffffff-0000-0000-0000-00000000000f', 'sso@example.com', '{"first_name":"Sam","last_name":"So"}');
ALTER TABLE auth.users ENABLE TRIGGER on_auth_user_created;

BEGIN;
SELECT test_act_as('ffffffff-0000-0000-0000-00000000000f');
SELECT test_assert((public.ensure_user_profile() ->> 'id') = 'ffffffff-0000-0000-0000-00000000000f', 'ensure_user_profile creates and returns the caller''s profile');
SELECT test_assert((public.ensure_user_profile() ->> 'company_id') IS NULL, 'with no company, so the app sends them to /setup');
SELECT test_assert((public.ensure_user_profile() ->> 'first_name') = 'Sam', 'names come from their auth metadata');
RESET ROLE;
SELECT test_assert((SELECT count(*) FROM public.user_profiles WHERE id = 'ffffffff-0000-0000-0000-00000000000f') = 1, 'calling it again does not duplicate the row');
ROLLBACK;

-- It only ever acts for the caller, and a token without a user is refused.
BEGIN;
SELECT test_act_as('99999999-0000-0000-0000-000000000009');
CREATE FUNCTION pg_temp.raises(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN no_data_found THEN RETURN true; END $$;
SELECT test_assert(pg_temp.raises('SELECT public.ensure_user_profile()'), 'a token whose auth user is gone gets an error, not a profile');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN EXECUTE sql; RETURN false; EXCEPTION WHEN insufficient_privilege THEN RETURN true; END $$;
SELECT test_assert(pg_temp.denied('SELECT public.ensure_user_profile()'), 'anon cannot call it');
ROLLBACK;
