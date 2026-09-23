-- Revoke a user's sessions from the server side (US-347).
--
-- A password reset went through admin.updateUserById and nothing else, so
-- every session the old password had opened, a thief's included, stayed
-- signed in. supabase-js has no admin call that ends another user's sessions
-- by user id (admin.signOut takes that user's JWT), so this does it where
-- GoTrue keeps them: auth.sessions and auth.refresh_tokens.
--
-- Revoking the refresh token stops the session from being renewed, so it ends
-- when its access token expires (at most the JWT lifetime, 1 hour by default).
-- Deleting the auth.sessions row also makes GoTrue's /user endpoint refuse the
-- access token straight away. PostgREST validates the JWT signature only, so
-- a REST call with an already-issued access token works until it expires.
--
-- p_keep_session_id keeps the caller's own session alive after a password
-- change on the profile page; NULL (a reset) ends every session.
--
-- service_role only. Executable by an ordinary user, this would let anyone
-- sign anyone out.

CREATE OR REPLACE FUNCTION public.revoke_user_sessions(
  p_user_id uuid,
  p_keep_session_id uuid DEFAULT NULL
)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_revoked integer := 0;
BEGIN
  IF p_user_id IS NULL THEN
    RAISE EXCEPTION 'p_user_id is required' USING ERRCODE = 'invalid_parameter_value';
  END IF;

  UPDATE auth.refresh_tokens
     SET revoked = true, updated_at = now()
   WHERE user_id = p_user_id::text
     AND revoked IS DISTINCT FROM true
     AND (p_keep_session_id IS NULL OR session_id IS DISTINCT FROM p_keep_session_id);

  DELETE FROM auth.sessions
   WHERE user_id = p_user_id
     AND (p_keep_session_id IS NULL OR id <> p_keep_session_id);
  GET DIAGNOSTICS v_revoked = ROW_COUNT;

  RETURN v_revoked;
END;
$$;

REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid, uuid) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.revoke_user_sessions(uuid, uuid) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.revoke_user_sessions(uuid, uuid) TO service_role;
