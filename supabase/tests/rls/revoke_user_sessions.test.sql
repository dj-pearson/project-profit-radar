-- US-347: revoke_user_sessions ends a user's other sessions, and only
-- service_role can call it.
--
-- auth.sessions and auth.refresh_tokens carry the columns GoTrue defines and
-- the function touches (GoTrue migrations 20221003041349 and 20210927181326).

CREATE TABLE auth.sessions (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id)
);
CREATE TABLE auth.refresh_tokens (
  id bigserial PRIMARY KEY,
  token text,
  user_id varchar(255),
  revoked boolean,
  session_id uuid REFERENCES auth.sessions(id) ON DELETE CASCADE,
  updated_at timestamptz
);

INSERT INTO auth.users VALUES ('11111111-0000-0000-0000-000000000001'), ('22222222-0000-0000-0000-000000000002');
INSERT INTO auth.sessions VALUES
  ('aaaaaaaa-0000-0000-0000-000000000001', '11111111-0000-0000-0000-000000000001'),  -- this device
  ('aaaaaaaa-0000-0000-0000-000000000002', '11111111-0000-0000-0000-000000000001'),  -- the thief
  ('bbbbbbbb-0000-0000-0000-000000000001', '22222222-0000-0000-0000-000000000002');  -- someone else
INSERT INTO auth.refresh_tokens (token, user_id, revoked, session_id) VALUES
  ('mine',  '11111111-0000-0000-0000-000000000001', false, 'aaaaaaaa-0000-0000-0000-000000000001'),
  ('thief', '11111111-0000-0000-0000-000000000001', false, 'aaaaaaaa-0000-0000-0000-000000000002'),
  ('other', '22222222-0000-0000-0000-000000000002', false, 'bbbbbbbb-0000-0000-0000-000000000001');

-- Lets the assertions below read the tables as service_role; the function
-- itself runs as its owner.
GRANT SELECT ON auth.sessions, auth.refresh_tokens TO service_role;

\i supabase/migrations/20260923010000_revoke_user_sessions.sql

-- An ordinary user cannot call it, for themselves or anyone.
CREATE FUNCTION pg_temp.call_denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('11111111-0000-0000-0000-000000000001');
SELECT test_assert(pg_temp.call_denied($$SELECT public.revoke_user_sessions('22222222-0000-0000-0000-000000000002')$$),
  'authenticated cannot revoke another user''s sessions');
ROLLBACK;
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(pg_temp.call_denied($$SELECT public.revoke_user_sessions('11111111-0000-0000-0000-000000000001')$$),
  'anon cannot call it');
ROLLBACK;

-- Password change on the profile page: keep this device, end the rest.
BEGIN;
SET LOCAL ROLE service_role;
SELECT test_assert(public.revoke_user_sessions('11111111-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000001') = 1,
  'change: one other session ended');
-- Revoked, or deleted with its session by the cascade: either way unusable.
SELECT test_assert(NOT EXISTS (SELECT 1 FROM auth.refresh_tokens WHERE token = 'thief' AND revoked IS NOT TRUE),
  'change: the second session''s refresh token is revoked');
SELECT test_assert((SELECT revoked FROM auth.refresh_tokens WHERE token = 'mine') IS FALSE,
  'change: the current session keeps working');
SELECT test_assert((SELECT revoked FROM auth.refresh_tokens WHERE token = 'other') IS FALSE,
  'change: another user is untouched');
ROLLBACK;

-- Password reset: end every session.
BEGIN;
SET LOCAL ROLE service_role;
SELECT test_assert(public.revoke_user_sessions('11111111-0000-0000-0000-000000000001') = 2,
  'reset: both sessions ended');
SELECT test_assert((SELECT count(*) FROM auth.refresh_tokens WHERE user_id = '11111111-0000-0000-0000-000000000001' AND revoked IS NOT TRUE) = 0,
  'reset: no refresh token of that user is still usable');
SELECT test_assert((SELECT count(*) FROM auth.sessions WHERE user_id = '22222222-0000-0000-0000-000000000002') = 1,
  'reset: another user keeps their session');
ROLLBACK;
