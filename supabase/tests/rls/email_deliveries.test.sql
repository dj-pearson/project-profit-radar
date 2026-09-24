-- email_deliveries (US-253): company admins read their own company's rows,
-- nobody else reads, no client writes, and one idempotency key is one row.

\i supabase/migrations/20260924220000_email_deliveries.sql

CREATE FUNCTION public.test_denied(stmt text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE stmt;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('bbbbbbbb-0000-0000-0000-00000000000a');
INSERT INTO public.companies (id, name) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('bbbbbbbb-0000-0000-0000-00000000000a', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin');

-- The service role (the shared sender) writes the ledger.
BEGIN;
SET LOCAL ROLE service_role;
INSERT INTO public.email_deliveries (company_id, idempotency_key, recipients, subject, status, provider_message_id, attempts) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'payment_reminder:aaaa0001', ARRAY['client@a.example'], 'Reminder', 'sent', 'ses-msg-1', 1),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'invoice:aaaa0002', ARRAY['client@a.example'], 'Invoice', 'dead_letter', NULL, 3),
  ('bbbbbbbb-0000-0000-0000-000000000000', 'invoice:bbbb0001', ARRAY['client@b.example'], 'Invoice', 'sent', 'ses-msg-2', 1),
  (NULL, 'auth_otp:00000001', ARRAY['new@signup.example'], 'Your code', 'sent', 'ses-msg-3', 1);
UPDATE public.email_deliveries SET status = 'failed', last_error = 'HTTP 400' WHERE idempotency_key = 'invoice:bbbb0001';
COMMIT;

SELECT test_assert(
  (SELECT count(*) FROM public.email_deliveries) = 4,
  'service_role can insert and update email_deliveries');

-- One key, one row: this is what makes a rerun not send twice.
BEGIN;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  INSERT INTO public.email_deliveries (idempotency_key, recipients, status)
  VALUES ('payment_reminder:aaaa0001', ARRAY['client@a.example'], 'sending');
  RAISE EXCEPTION 'ASSERTION FAILED: duplicate idempotency key was accepted';
EXCEPTION WHEN unique_violation THEN
  RAISE NOTICE 'ok - duplicate idempotency key is rejected';
END $$;
ROLLBACK;

BEGIN;
SET LOCAL ROLE service_role;
DO $$
BEGIN
  INSERT INTO public.email_deliveries (idempotency_key, recipients, status)
  VALUES ('invoice:aaaa0003', ARRAY['x@a.example'], 'delivered-ish');
  RAISE EXCEPTION 'ASSERTION FAILED: unknown status was accepted';
EXCEPTION WHEN check_violation THEN
  RAISE NOTICE 'ok - unknown status is rejected';
END $$;
ROLLBACK;

-- A company admin reads their own company's rows only.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT count(*) FROM public.email_deliveries) = 2,
  'admin reads their company deliveries and no other company, and no company-less rows');
SELECT test_assert(
  (SELECT count(*) FROM public.email_deliveries WHERE status = 'dead_letter') = 1,
  'admin sees their dead-lettered send');
ROLLBACK;

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000a');
SELECT test_assert(
  (SELECT string_agg(idempotency_key, ',') FROM public.email_deliveries) = 'invoice:bbbb0001',
  'company B admin sees only company B');
ROLLBACK;

-- A non-admin in the same company sees nothing: recipients are client addresses.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert(
  (SELECT count(*) FROM public.email_deliveries) = 0,
  'field_supervisor sees no deliveries');
ROLLBACK;

-- No client writes, not even an admin for their own company.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
SELECT test_assert(test_denied(
  $q$INSERT INTO public.email_deliveries (company_id, idempotency_key, status) VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'forged:00000001', 'sent')$q$),
  'admin cannot INSERT a delivery');
SELECT test_assert(test_denied(
  $q$UPDATE public.email_deliveries SET status = 'sent'$q$),
  'admin cannot UPDATE a delivery');
SELECT test_assert(test_denied(
  $q$DELETE FROM public.email_deliveries$q$),
  'admin cannot DELETE a delivery');
ROLLBACK;

BEGIN;
SELECT test_act_as(NULL);
SELECT test_assert(test_denied('SELECT id FROM public.email_deliveries'),
  'anon cannot read deliveries');
ROLLBACK;
