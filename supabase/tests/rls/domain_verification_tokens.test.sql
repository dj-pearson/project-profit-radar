-- verify-domain ownership proof: domain_verification_tokens is readable by the
-- company's own admins only and writable by nobody but the service role, and a
-- client cannot set tenants.domain_verified to true.

-- tenants as 20250202000009 created it (the columns this touches), plus the
-- companies.tenant_id link the web page reads.
CREATE TABLE public.tenants (
  id uuid PRIMARY KEY,
  name text NOT NULL,
  custom_domain text,
  domain_verified boolean DEFAULT false
);
ALTER TABLE public.tenants ENABLE ROW LEVEL SECURITY;
-- Stand-in for "Tenant admins can update tenant": company admins update their
-- own tenant. The trigger is what is under test, not this policy.
ALTER TABLE public.companies ADD COLUMN tenant_id uuid REFERENCES public.tenants(id);
CREATE POLICY tenant_admin_update ON public.tenants FOR UPDATE TO authenticated
  USING (id = (SELECT tenant_id FROM public.companies WHERE id = public.get_user_company(auth.uid())))
  WITH CHECK (id = (SELECT tenant_id FROM public.companies WHERE id = public.get_user_company(auth.uid())));
CREATE POLICY tenant_admin_select ON public.tenants FOR SELECT TO authenticated USING (true);
CREATE POLICY tenant_insert ON public.tenants FOR INSERT TO authenticated WITH CHECK (true);
GRANT SELECT ON public.companies TO authenticated;

\i supabase/migrations/20260924140000_domain_verification_tokens.sql

-- True when running the statement raises insufficient_privilege (42501).
CREATE FUNCTION public.test_denied(stmt text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

INSERT INTO public.tenants VALUES
  ('aaaaaaaa-1111-0000-0000-000000000000', 'A', 'app.a-builders.com', false),
  ('bbbbbbbb-1111-0000-0000-000000000000', 'B', 'app.b-builders.com', true);
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('bbbbbbbb-0000-0000-0000-00000000000a');
INSERT INTO public.companies (id, name, tenant_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A', 'aaaaaaaa-1111-0000-0000-000000000000'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'B', 'bbbbbbbb-1111-0000-0000-000000000000');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');

-- The service role (verify-domain) issues tokens.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.domain_verification_tokens (company_id, token) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'brikly-verify=0123456789abcdef0123456789abcdef'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'brikly-verify=fedcba9876543210fedcba9876543210');
COMMIT;

SELECT test_assert(
  (SELECT count(*) FROM public.domain_verification_tokens) = 2,
  'service_role can write domain_verification_tokens');

-- An admin reads their own company's token and nothing else.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT token FROM public.domain_verification_tokens) = 'brikly-verify=0123456789abcdef0123456789abcdef',
  'admin reads their company token');
SELECT test_assert(
  (SELECT count(*) FROM public.domain_verification_tokens) = 1,
  'admin sees no other company token');
ROLLBACK;

-- A non-admin in the same company sees nothing.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert(
  (SELECT count(*) FROM public.domain_verification_tokens) = 0,
  'field_supervisor sees no token');
ROLLBACK;

-- No client can write a token - not even an admin for their own company. A
-- chosen token could be copied from another company's public TXT record.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(test_denied(
  $q$UPDATE public.domain_verification_tokens SET token = 'brikly-verify=fedcba9876543210fedcba9876543211'$q$),
  'admin cannot UPDATE their token');
SELECT test_assert(test_denied(
  $q$INSERT INTO public.domain_verification_tokens (company_id, token) VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'brikly-verify=00000000000000000000000000000000')$q$),
  'admin cannot INSERT a token');
SELECT test_assert(test_denied(
  $q$DELETE FROM public.domain_verification_tokens$q$),
  'admin cannot DELETE a token');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(test_denied('SELECT token FROM public.domain_verification_tokens'),
  'anon cannot read tokens');
ROLLBACK;

-- The token shape is enforced, so a malformed or guessable value never lands.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  INSERT INTO public.domain_verification_tokens (company_id, token)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000000', 'short');
  RAISE EXCEPTION 'ASSERTION FAILED: malformed token was accepted';
EXCEPTION WHEN check_violation OR unique_violation THEN
  RAISE NOTICE 'ok - malformed token is rejected';
END $$;
ROLLBACK;

-- A tenant admin cannot mark their own domain verified through PostgREST.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
UPDATE public.tenants SET domain_verified = true WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000') IS FALSE,
  'client UPDATE domain_verified = true is reset to false');
UPDATE public.tenants SET custom_domain = 'google.com', domain_verified = true
  WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000') IS FALSE,
  'client cannot set a new custom_domain and verified in one write');
INSERT INTO public.tenants VALUES ('cccccccc-1111-0000-0000-000000000000', 'C', 'example.com', true);
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'cccccccc-1111-0000-0000-000000000000') IS FALSE,
  'client INSERT with domain_verified = true is stored false');
ROLLBACK;

-- Changing the domain resets verification; other edits keep it.
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
UPDATE public.tenants SET name = 'B renamed' WHERE id = 'bbbbbbbb-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'bbbbbbbb-1111-0000-0000-000000000000') IS TRUE,
  'unrelated client edit keeps an existing verification');
UPDATE public.tenants SET custom_domain = 'portal.b-builders.com' WHERE id = 'bbbbbbbb-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'bbbbbbbb-1111-0000-0000-000000000000') IS FALSE,
  'client custom_domain change resets verification');
ROLLBACK;

-- The web callers' own write (custom_domain + domain_verified false) still works.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
UPDATE public.tenants SET custom_domain = 'portal.a-builders.com', domain_verified = false
  WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT custom_domain FROM public.tenants WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000') = 'portal.a-builders.com',
  'CustomDomain.tsx save (custom_domain + domain_verified false) still succeeds');
ROLLBACK;

-- The service role (verify-domain after a TXT match) can set it.
BEGIN;
SET LOCAL ROLE service_role;
UPDATE public.tenants SET domain_verified = true WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000';
SELECT test_assert(
  (SELECT domain_verified FROM public.tenants WHERE id = 'aaaaaaaa-1111-0000-0000-000000000000') IS TRUE,
  'service_role can set domain_verified = true');
ROLLBACK;
