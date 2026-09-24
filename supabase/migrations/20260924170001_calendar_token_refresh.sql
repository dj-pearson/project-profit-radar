-- US-395: calendar OAuth tokens are refreshed, encrypted at rest, and a dead
-- grant is recorded so the settings screen can ask the user to reconnect.
--
-- Before this, google-calendar-callback and outlook-calendar-callback stored
-- the provider tokens in plain text and nothing ever refreshed them, so
-- sync-calendar stopped working about an hour after a calendar was connected
-- and reported a generic error from then on.
--
-- All four columns are additive and nullable. RLS and grants are unchanged.
--
--   access_token_encrypted / refresh_token_encrypted
--     base64(iv || AES-256-GCM ciphertext), written by the edge functions with
--     supabase/functions/_shared/calendar-oauth.ts (same format as the
--     QuickBooks token columns, US-345). The key is the edge-function secret
--     CALENDAR_TOKEN_ENCRYPTION_KEY and never reaches Postgres.
--   reauth_required_at
--     Set when the provider refuses the refresh token (invalid_grant and
--     friends). The web settings screen shows "Reconnect" while it is set;
--     the OAuth callback clears it on a successful reconnect.
--   last_sync_error
--     The most recent sync failure, for the same screen. Never holds token
--     material.
--
-- Release plan (CLAUDE.md dual-write -> migrate readers -> retire):
--   Release N (this): writers dual-write plaintext and ciphertext; readers
--     prefer ciphertext. sync-calendar writes the ciphertext for a legacy row
--     the first time it syncs it. Readiness check for N+1:
--       SELECT count(*) FROM public.calendar_integrations
--       WHERE (access_token IS NOT NULL AND access_token_encrypted IS NULL)
--          OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL);
--   Release N+1: stop writing plaintext (access_token must first be made
--     nullable), revoke SELECT on the token columns from authenticated as
--     20260923180000 did for quickbooks_integrations, and NULL the plaintext.
--   Release N+2: drop access_token / refresh_token.

ALTER TABLE public.calendar_integrations
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS reauth_required_at timestamptz,
  ADD COLUMN IF NOT EXISTS last_sync_error text;

COMMENT ON COLUMN public.calendar_integrations.access_token_encrypted IS
  'base64(iv || AES-256-GCM ciphertext) of the provider access token; key is the CALENDAR_TOKEN_ENCRYPTION_KEY edge secret (US-395).';
COMMENT ON COLUMN public.calendar_integrations.refresh_token_encrypted IS
  'base64(iv || AES-256-GCM ciphertext) of the provider refresh token (US-395).';
COMMENT ON COLUMN public.calendar_integrations.reauth_required_at IS
  'Set when the provider rejected the refresh token; the user must reconnect. Cleared by the OAuth callback (US-395).';
COMMENT ON COLUMN public.calendar_integrations.last_sync_error IS
  'Most recent sync failure message, shown in calendar settings. No token material (US-395).';
COMMENT ON COLUMN public.calendar_integrations.access_token IS
  'DEPRECATED plaintext (US-395): dual-written for one release, then nulled and removed.';
COMMENT ON COLUMN public.calendar_integrations.refresh_token IS
  'DEPRECATED plaintext (US-395): dual-written for one release, then nulled and removed.';
