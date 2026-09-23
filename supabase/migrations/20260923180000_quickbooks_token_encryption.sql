-- US-345: QuickBooks OAuth tokens are encrypted at rest and no longer readable
-- by the authenticated role.
--
-- Before this, quickbooks-callback and quickbooks-sync wrote Intuit's access
-- and refresh tokens into quickbooks_integrations as plain text, the only
-- policy was an admin FOR ALL, and both integration components selected '*',
-- so both tokens arrived in every admin's browser.
--
-- What this migration does (all additive except the SELECT grant):
--   1. Adds access_token_encrypted / refresh_token_encrypted (text, nullable).
--      Edge functions write base64(iv || AES-256-GCM ciphertext) there, using
--      supabase/functions/_shared/quickbooks-token-crypto.ts, which keeps the
--      format store-stripe-keys uses. The key is the edge-function secret
--      QUICKBOOKS_TOKEN_ENCRYPTION_KEY; it never reaches Postgres, which is
--      why the backfill is an edge function and not SQL here.
--   2. Adds realm_id if missing. quickbooks-callback/-sync/-disconnect already
--      read and write it, but no migration ever created it.
--   3. Replaces the table-level SELECT grant for anon/authenticated with a
--      column-level grant on every column EXCEPT the four token columns.
--      A column REVOKE alone does nothing while a table-level grant exists, so
--      the table grant has to go. RLS still decides which rows are visible.
--      INSERT/UPDATE/DELETE grants are untouched: the callback and sync still
--      write the token columns through the user-JWT client under the admin
--      policy; they just cannot read them back. Edge functions read tokens only
--      through the service-role client, after an RLS-scoped read of the row.
--
-- Who read the token columns before: only the QuickBooks edge functions
-- (shipped with this change) and the two web components, which rendered
-- connection status only and now select explicit columns. The iOS app does not
-- touch quickbooks_integrations. So no deployed client loses a column it uses;
-- an old cached web bundle still sending select('*') gets a permission error
-- and shows "not connected" until the page reloads (about 24h worst case).
--
-- CONSEQUENCE FOR FUTURE MIGRATIONS: a column added to quickbooks_integrations
-- later is NOT selectable by authenticated until it is granted explicitly:
--   GRANT SELECT (new_col) ON public.quickbooks_integrations TO authenticated;
--
-- Release plan (CLAUDE.md dual-write -> migrate readers -> retire):
--   Release N (this): add encrypted columns; writers dual-write plaintext and
--     ciphertext (DUAL_WRITE_PLAINTEXT = true), readers prefer ciphertext and
--     fall back to plaintext. Deploy the edge functions, set the secret, then
--     run the one-off quickbooks-encrypt-backfill function until it reports
--     remaining = 0. Its counts are written to audit_logs
--     (action_type = 'quickbooks_tokens.backfill_encrypted'). Readiness check:
--       SELECT count(*) FROM public.quickbooks_integrations
--       WHERE (access_token IS NOT NULL AND access_token_encrypted IS NULL)
--          OR (refresh_token IS NOT NULL AND refresh_token_encrypted IS NULL);
--   Release N+1: set DUAL_WRITE_PLAINTEXT = false, remove the plaintext
--     fallback in readQuickBooksTokens, and in a new migration run
--     UPDATE public.quickbooks_integrations SET access_token = NULL,
--     refresh_token = NULL once the readiness check above returns 0.
--   Release N+2: remove the access_token / refresh_token columns once no
--     deployed edge-function version references them.

ALTER TABLE public.quickbooks_integrations
  ADD COLUMN IF NOT EXISTS access_token_encrypted text,
  ADD COLUMN IF NOT EXISTS refresh_token_encrypted text,
  ADD COLUMN IF NOT EXISTS realm_id text;

COMMENT ON COLUMN public.quickbooks_integrations.access_token_encrypted IS
  'base64(iv || AES-256-GCM ciphertext) of the Intuit access token; key is the QUICKBOOKS_TOKEN_ENCRYPTION_KEY edge secret. Not selectable by authenticated (US-345).';
COMMENT ON COLUMN public.quickbooks_integrations.refresh_token_encrypted IS
  'base64(iv || AES-256-GCM ciphertext) of the Intuit refresh token. Not selectable by authenticated (US-345).';
COMMENT ON COLUMN public.quickbooks_integrations.access_token IS
  'DEPRECATED plaintext (US-345): dual-written for one release, to be nulled then removed. Not selectable by authenticated.';
COMMENT ON COLUMN public.quickbooks_integrations.refresh_token IS
  'DEPRECATED plaintext (US-345): dual-written for one release, to be nulled then removed. Not selectable by authenticated.';

REVOKE SELECT ON public.quickbooks_integrations FROM anon, authenticated;

DO $$
DECLARE
  cols text;
BEGIN
  SELECT string_agg(quote_ident(column_name), ', ' ORDER BY ordinal_position)
    INTO cols
  FROM information_schema.columns
  WHERE table_schema = 'public'
    AND table_name = 'quickbooks_integrations'
    AND column_name NOT IN ('access_token', 'refresh_token', 'access_token_encrypted', 'refresh_token_encrypted');

  EXECUTE format('GRANT SELECT (%s) ON public.quickbooks_integrations TO authenticated', cols);
END $$;

GRANT SELECT ON public.quickbooks_integrations TO service_role;
