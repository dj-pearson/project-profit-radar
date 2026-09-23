-- oauth-proxy: server-side state bound to the browser, and identity by
-- provider subject rather than bare email (US-349).
--
-- 1. oauth_pending_states gains provider and browser_binding (both nullable,
--    so sso-oauth-init keeps writing rows exactly as before). oauth-proxy
--    stores its PKCE verifier and return path here instead of in the state
--    string, and browser_binding holds the SHA-256 of a nonce it also sets as
--    an HttpOnly cookie, so a callback URL finished in another browser is
--    refused (login CSRF).
--
-- 2. find_oauth_user(provider, subject, email) replaces
--    listUsers().find(u => u.email === email), which read only the first page
--    of users (so anyone past it could never sign in with Google) and matched
--    on email alone. It returns the user bound to (provider, subject) first,
--    else the user with that email and the subject each has on record for
--    this provider, so the caller can refuse a mismatch. service_role only.

ALTER TABLE public.oauth_pending_states ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE public.oauth_pending_states ADD COLUMN IF NOT EXISTS browser_binding text;

CREATE OR REPLACE FUNCTION public.find_oauth_user(p_provider text, p_subject text, p_email text)
RETURNS TABLE (user_id uuid, matched_by text, stored_subject text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = ''
AS $$
  (
    SELECT u.id, 'subject'::text, u.raw_app_meta_data -> 'oauth_subjects' ->> p_provider
      FROM auth.users u
     WHERE p_subject IS NOT NULL
       AND u.raw_app_meta_data -> 'oauth_subjects' ->> p_provider = p_subject
     LIMIT 1
  )
  UNION ALL
  (
    SELECT u.id, 'email'::text, u.raw_app_meta_data -> 'oauth_subjects' ->> p_provider
      FROM auth.users u
     WHERE p_email IS NOT NULL
       AND lower(u.email) = lower(p_email)
     LIMIT 1
  )
$$;

REVOKE ALL ON FUNCTION public.find_oauth_user(text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.find_oauth_user(text, text, text) TO service_role;
