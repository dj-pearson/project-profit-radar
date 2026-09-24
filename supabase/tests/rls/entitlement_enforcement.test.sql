-- US-335: storage quota and trial expiry at upload, behind flags that default
-- off, and billing-state columns a user token cannot change.

ALTER TABLE public.companies
  ADD COLUMN subscription_tier text DEFAULT 'starter',
  ADD COLUMN subscription_status text DEFAULT 'trial',
  ADD COLUMN trial_end_date timestamptz DEFAULT now() + interval '14 days',
  ADD COLUMN stripe_subscription_id text,
  ADD COLUMN updated_at timestamptz;
GRANT SELECT, INSERT, UPDATE ON public.companies TO authenticated;
-- Stand-in for the production company-admin UPDATE policy: row scoped, no
-- column restriction. That missing column restriction is the hole.
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
CREATE POLICY own_company_read ON public.companies FOR SELECT TO authenticated
  USING (id = public.get_user_company(auth.uid()));
CREATE POLICY own_company_update ON public.companies FOR UPDATE TO authenticated
  USING (id = public.get_user_company(auth.uid()));
CREATE POLICY any_insert ON public.companies FOR INSERT TO authenticated WITH CHECK (true);

CREATE TABLE public.subscribers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid, is_complimentary boolean DEFAULT false, complimentary_expires_at timestamptz
);

-- Only the columns feature_flag_enabled reads (20260924160000 has the rest).
CREATE TABLE public.feature_flags (flag_key text, company_id uuid, enabled boolean);

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text, name text, owner uuid, metadata jsonb
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
-- The existing permissive upload policies, reduced to "signed in".
CREATE POLICY uploads ON storage.objects FOR INSERT TO authenticated WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY reads ON storage.objects FOR SELECT TO authenticated USING (true);

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b'),
  ('cccccccc-0000-0000-0000-00000000000c');
INSERT INTO public.companies (id, name, subscription_tier, subscription_status, trial_end_date) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A starter over quota', 'starter', 'active', now() - interval '1 year'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'B expired trial', 'starter', 'trial', now() - interval '30 days'),
  ('cccccccc-0000-0000-0000-000000000000', 'C enterprise', 'enterprise', 'active', NULL);
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('cccccccc-0000-0000-0000-00000000000c', 'cccccccc-0000-0000-0000-000000000000', 'admin');

-- A: 11 GB on a 10 GB plan. C: 11 GB on an unlimited plan.
INSERT INTO storage.objects (bucket_id, name, owner, metadata) VALUES
  ('project-documents', 'a/big.bin', 'aaaaaaaa-0000-0000-0000-00000000000a', jsonb_build_object('size', 11::bigint * 1073741824)),
  ('avatars', 'a/me.png', 'aaaaaaaa-0000-0000-0000-00000000000a', jsonb_build_object('size', 5::bigint * 1073741824)),
  ('project-documents', 'c/big.bin', 'cccccccc-0000-0000-0000-00000000000c', jsonb_build_object('size', 11::bigint * 1073741824));

\i supabase/migrations/20260924170000_entitlement_enforcement.sql

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

-- Measuring usage ---------------------------------------------------------

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(public.company_storage_used_bytes('aaaaaaaa-0000-0000-0000-000000000000') = 11::bigint * 1073741824,
  'usage counts company buckets and leaves avatars out');
SELECT test_assert(pg_temp.denied($$SELECT public.company_storage_used_bytes('cccccccc-0000-0000-0000-000000000000')$$),
  'a user cannot read another company''s usage');
ROLLBACK;

-- Flags off: nothing changes ------------------------------------------------

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/one-more.pdf', auth.uid());
SELECT test_assert(true, 'flags off: a company over its storage allowance can still upload');
ROLLBACK;

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'b/one.pdf', auth.uid());
SELECT test_assert(true, 'flags off: an expired trial can still upload');
ROLLBACK;

-- storage_quota on ----------------------------------------------------------

INSERT INTO public.feature_flags VALUES ('entitlements.storage_quota', NULL, true);

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/x.pdf', auth.uid())$$),
  'quota on: a starter company over 10 GB cannot upload');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('avatars', 'a/new-me.png', auth.uid());
SELECT test_assert(true, 'quota on: avatars are not counted or refused');
ROLLBACK;

BEGIN;
SELECT test_act_as('cccccccc-0000-0000-0000-00000000000c');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'c/x.pdf', auth.uid());
SELECT test_assert(true, 'quota on: enterprise is unlimited');
ROLLBACK;

INSERT INTO public.subscribers (user_id, is_complimentary) VALUES ('aaaaaaaa-0000-0000-0000-00000000000a', true);
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/comp.pdf', auth.uid());
SELECT test_assert(true, 'quota on: a complimentary user is not held to the quota');
ROLLBACK;
DELETE FROM public.subscribers;

-- A company row switches it off for that company.
INSERT INTO public.feature_flags VALUES ('entitlements.storage_quota', 'aaaaaaaa-0000-0000-0000-000000000000', false);
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/exempt.pdf', auth.uid());
SELECT test_assert(true, 'a company row turns the quota off for that company');
ROLLBACK;

-- A global off row is the kill switch, whatever the company row says.
DELETE FROM public.feature_flags;
INSERT INTO public.feature_flags VALUES
  ('entitlements.storage_quota', NULL, false),
  ('entitlements.storage_quota', 'aaaaaaaa-0000-0000-0000-000000000000', true);
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/killed.pdf', auth.uid());
SELECT test_assert(true, 'a global off row overrides a company on row');
ROLLBACK;
DELETE FROM public.feature_flags;

-- trial_expiry on -----------------------------------------------------------

INSERT INTO public.feature_flags VALUES ('entitlements.trial_expiry', NULL, true);

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
SELECT test_assert(pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'b/x.pdf', auth.uid())$$),
  'trial expiry on: a trial that ended 30 days ago cannot upload');
SELECT test_assert((SELECT count(*) FROM storage.objects) >= 3, 'trial expiry on: reads still work');
ROLLBACK;

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'a/paid.pdf', auth.uid());
SELECT test_assert(true, 'trial expiry on: an active company is unaffected (quota flag off)');
ROLLBACK;

UPDATE public.companies SET trial_end_date = now() - interval '3 days' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000';
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'b/grace.pdf', auth.uid());
SELECT test_assert(true, 'trial expiry on: inside the 7-day grace period uploads still work');
ROLLBACK;

UPDATE public.companies SET subscription_status = 'grace_period', trial_end_date = now() - interval '1 year'
  WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000';
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'b/pastdue.pdf', auth.uid());
SELECT test_assert(true, 'trial expiry on: grace_period (also the past_due state) is not read-only by date');
ROLLBACK;

UPDATE public.companies SET subscription_status = 'suspended' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000';
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
SELECT test_assert(pg_temp.denied($$INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('project-documents', 'b/s.pdf', auth.uid())$$),
  'trial expiry on: a suspended company cannot upload');
ROLLBACK;
DELETE FROM public.feature_flags;

-- Billing state is server-only ---------------------------------------------

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
SELECT test_assert(pg_temp.denied($$UPDATE public.companies SET trial_end_date = now() + interval '10 years' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000'$$),
  'an admin cannot extend their own trial');
SELECT test_assert(pg_temp.denied($$UPDATE public.companies SET subscription_status = 'active' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000'$$),
  'an admin cannot mark their own company active');
SELECT test_assert(pg_temp.denied($$UPDATE public.companies SET stripe_subscription_id = 'sub_fake' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000'$$),
  'an admin cannot attach a fake Stripe subscription');
UPDATE public.companies SET name = 'B renamed' WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000';
SELECT test_assert((SELECT name FROM public.companies WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000') = 'B renamed',
  'renaming the company still works');
ROLLBACK;

BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"authenticated"}', true);
SET LOCAL ROLE authenticated;
INSERT INTO public.companies (id, name, subscription_status, trial_end_date, stripe_subscription_id)
  VALUES ('dddddddd-0000-0000-0000-000000000000', 'D', 'active', now() + interval '10 years', 'sub_fake');
RESET ROLE;
SELECT test_assert(
  (SELECT subscription_status = 'trial'
      AND trial_end_date < now() + interval '15 days'
      AND stripe_subscription_id IS NULL
   FROM public.companies WHERE id = 'dddddddd-0000-0000-0000-000000000000'),
  'a company inserted with a user token starts a fresh trial whatever it asked for');
ROLLBACK;

BEGIN;
SELECT set_config('request.jwt.claims', '{"role":"service_role"}', true);
UPDATE public.companies SET subscription_status = 'active', stripe_subscription_id = 'sub_real'
  WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000';
SELECT test_assert((SELECT subscription_status FROM public.companies WHERE id = 'bbbbbbbb-0000-0000-0000-000000000000') = 'active',
  'the service role (Stripe webhook) still sets billing state');
ROLLBACK;
