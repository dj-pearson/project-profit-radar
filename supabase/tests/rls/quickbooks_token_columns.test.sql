-- US-345: QuickBooks OAuth token columns are not readable by authenticated or
-- anon, while the status columns the UI renders and the write paths the edge
-- functions use (callback UPDATE, connect upsert) keep working.

-- The table as 20250703193051 created it, plus the columns later migrations
-- (and drift) added, and its only policy.
CREATE TABLE public.quickbooks_integrations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_connected boolean NOT NULL DEFAULT false,
  qb_company_id text,
  qb_company_name text,
  access_token text,
  refresh_token text,
  token_expires_at timestamptz,
  oauth_state text,
  connection_status text DEFAULT 'pending',
  sandbox_mode boolean DEFAULT true,
  last_sync_at timestamptz,
  last_sync_status text,
  last_error_message text,
  sync_settings jsonb DEFAULT '{"auto_sync": false, "sync_frequency": "daily"}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  access_token_expires_at timestamptz,
  refresh_token_expires_at timestamptz,
  UNIQUE (company_id)
);
ALTER TABLE public.quickbooks_integrations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can manage QuickBooks integrations"
ON public.quickbooks_integrations FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

\i supabase/migrations/20260923180000_quickbooks_token_encryption.sql

-- True when running the statement raises insufficient_privilege (42501).
CREATE FUNCTION public.test_denied(stmt text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000b1'),
  ('bbbbbbbb-0000-0000-0000-00000000000a');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000000', 'accounting'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');
INSERT INTO public.quickbooks_integrations
  (company_id, is_connected, qb_company_name, realm_id, access_token, refresh_token,
   access_token_encrypted, refresh_token_encrypted, last_sync_status)
VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', true, 'Reyes Builders LLC', '9130001', 'plain-at-A', 'plain-rt-A',
   'enc-at-A', 'enc-rt-A', 'success'),
  ('bbbbbbbb-0000-0000-0000-000000000000', true, 'Other Co', '9130002', 'plain-at-B', 'plain-rt-B',
   NULL, NULL, 'never');

-- The admin reads the status columns the two components select.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT qb_company_name FROM public.quickbooks_integrations
     WHERE is_connected AND last_sync_status = 'success' AND last_sync_at IS NULL
       AND last_error_message IS NULL AND realm_id = '9130001') = 'Reyes Builders LLC',
  'admin reads is_connected, qb_company_name, last_sync_*, realm_id for their company');
SELECT test_assert(
  (SELECT count(*) FROM public.quickbooks_integrations) = 1,
  'admin sees only their own company row (RLS unchanged)');
ROLLBACK;

-- The admin cannot read any token column, and select('*') is refused outright.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(test_denied('SELECT access_token FROM public.quickbooks_integrations'),
  'authenticated cannot SELECT access_token');
SELECT test_assert(test_denied('SELECT refresh_token FROM public.quickbooks_integrations'),
  'authenticated cannot SELECT refresh_token');
SELECT test_assert(test_denied('SELECT access_token_encrypted FROM public.quickbooks_integrations'),
  'authenticated cannot SELECT access_token_encrypted');
SELECT test_assert(test_denied('SELECT refresh_token_encrypted FROM public.quickbooks_integrations'),
  'authenticated cannot SELECT refresh_token_encrypted');
SELECT test_assert(test_denied('SELECT * FROM public.quickbooks_integrations'),
  'authenticated select * is refused, so no client can pull tokens by accident');
SELECT test_assert(test_denied('SELECT id FROM public.quickbooks_integrations WHERE refresh_token LIKE ''plain%'''),
  'authenticated cannot probe a token through a WHERE clause');
ROLLBACK;

-- A non-admin in the same company sees no row, as before.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.quickbooks_integrations) = 0,
  'accounting role sees no integration row');
ROLLBACK;

-- anon has no read path at all.
BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(test_denied('SELECT id FROM public.quickbooks_integrations'),
  'anon cannot SELECT quickbooks_integrations');
ROLLBACK;

-- Write paths the edge functions use through the user-JWT client still work.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
-- quickbooks-callback / quickbooks-sync: store a new token pair.
UPDATE public.quickbooks_integrations
   SET access_token = 'new-at', refresh_token = 'new-rt',
       access_token_encrypted = 'new-enc-at', refresh_token_encrypted = 'new-enc-rt',
       is_connected = true, connection_status = 'connected'
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
-- quickbooks-connect: PostgREST upsert on the company_id unique key.
INSERT INTO public.quickbooks_integrations (company_id, oauth_state, connection_status, created_at, updated_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'state-123', 'pending', now(), now())
ON CONFLICT (company_id) DO UPDATE
  SET company_id = excluded.company_id, oauth_state = excluded.oauth_state,
      connection_status = excluded.connection_status, created_at = excluded.created_at,
      updated_at = excluded.updated_at;
-- quickbooks-disconnect: clear every token column.
UPDATE public.quickbooks_integrations
   SET access_token = NULL, refresh_token = NULL, access_token_encrypted = NULL, refresh_token_encrypted = NULL
 WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000';
-- Another company's row is still untouchable.
UPDATE public.quickbooks_integrations SET access_token = 'hijack'
 WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000';
RESET ROLE;
SELECT test_assert(
  (SELECT oauth_state = 'state-123' AND access_token IS NULL AND access_token_encrypted IS NULL
     FROM public.quickbooks_integrations WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000'),
  'admin can still write tokens (callback), upsert state (connect) and clear tokens (disconnect)');
SELECT test_assert(
  (SELECT access_token FROM public.quickbooks_integrations WHERE company_id = 'bbbbbbbb-0000-0000-0000-000000000000') = 'plain-at-B',
  'admin of company A cannot overwrite company B tokens');
ROLLBACK;

-- The service role (edge functions after an RLS-scoped read) reads tokens.
BEGIN;
SET LOCAL ROLE service_role;
SELECT test_assert(
  (SELECT access_token_encrypted || '/' || refresh_token_encrypted FROM public.quickbooks_integrations
     WHERE company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 'enc-at-A/enc-rt-A',
  'service_role reads the encrypted token columns');
SELECT test_assert(
  (SELECT count(*) FROM public.quickbooks_integrations
     WHERE access_token_encrypted IS NULL AND refresh_token_encrypted IS NULL
       AND (access_token IS NOT NULL OR refresh_token IS NOT NULL)) = 1,
  'service_role can run the backfill readiness count (one plaintext-only row here)');
ROLLBACK;
