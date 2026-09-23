-- US-311: lead_scores, geofence_breach_alerts and intervention_logs are
-- tenant-isolated, and the writers' real inserts pass their policies.

-- Shapes of the referenced tables, cut to the columns the migration touches.
CREATE TABLE public.leads (id uuid PRIMARY KEY, company_id uuid NOT NULL);
CREATE TABLE public.geofences (id uuid PRIMARY KEY, company_id uuid, name text);
ALTER TABLE public.geofences ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_geofences ON public.geofences FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE TABLE public.churn_predictions (id uuid PRIMARY KEY, user_id uuid);

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a1'), ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('aaaaaaaa-0000-0000-0000-0000000000e1'), ('bbbbbbbb-0000-0000-0000-0000000000b1'),
  ('cccccccc-0000-0000-0000-0000000000c1');
INSERT INTO public.companies VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles (id, company_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor'),
  ('aaaaaaaa-0000-0000-0000-0000000000e1', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  ('cccccccc-0000-0000-0000-0000000000c1', 'bbbbbbbb-0000-0000-0000-000000000000', 'root_admin');
INSERT INTO public.leads VALUES
  ('11111111-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000'),
  ('11111111-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000');
INSERT INTO public.geofences VALUES
  ('22222222-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'Site A'),
  ('22222222-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'Site B');
INSERT INTO public.churn_predictions VALUES ('33333333-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000e1');

-- Production already has lead_scores (typed into the SQL editor). Stand one up
-- in its live shape with a row whose lead_id has no lead, so the migration has
-- to no-op the CREATE and must not trip over the orphan.
CREATE TABLE public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id),
  lead_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  score_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);
INSERT INTO public.lead_scores (company_id, lead_id, score) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', '99999999-0000-0000-0000-000000000000', 5);

\i supabase/migrations/20260923160000_define_untracked_tables.sql
-- Applying twice must be harmless.
\i supabase/migrations/20260923160000_define_untracked_tables.sql

SELECT test_assert(
  (SELECT count(*) FROM pg_constraint WHERE conname = 'lead_scores_lead_id_fkey' AND NOT convalidated) = 1,
  'lead_scores gets a NOT VALID lead FK on the pre-existing table, and the orphan row survives');
SELECT test_assert(
  (SELECT bool_and(relrowsecurity) FROM pg_class
    WHERE oid IN ('public.lead_scores'::regclass, 'public.geofence_breach_alerts'::regclass,
                  'public.intervention_logs'::regclass)),
  'RLS is enabled on all three tables');

INSERT INTO public.lead_scores (company_id, lead_id, score) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', '11111111-0000-0000-0000-00000000000a', 80),
  ('bbbbbbbb-0000-0000-0000-000000000000', '11111111-0000-0000-0000-00000000000b', 40);

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

-- lead_scores ---------------------------------------------------------------
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000e1');
SELECT test_assert((SELECT count(*) FROM public.lead_scores) = 2
  AND NOT EXISTS (SELECT 1 FROM public.lead_scores WHERE company_id <> 'aaaaaaaa-0000-0000-0000-000000000000'),
  'lead_scores: a company A user reads only company A scores (LeadScoring has no company filter of its own)');
UPDATE public.lead_scores SET score = 0;
SELECT test_assert((SELECT min(score) FROM public.lead_scores) > 0, 'lead_scores: office staff cannot rewrite scores');
RESET ROLE;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.lead_scores) = 1, 'lead_scores: company B sees only its own row');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.lead_scores (company_id, lead_id, score)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '11111111-0000-0000-0000-00000000000a', 1)
$q$), 'lead_scores: company B admin cannot write a score into company A');
ROLLBACK;

-- geofence_breach_alerts ----------------------------------------------------
BEGIN;
-- The geofencing function runs as the worker; this is its insert.
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000e1');
INSERT INTO public.geofence_breach_alerts
  (company_id, geofence_id, time_entry_id, breach_type, distance_from_boundary_meters, breach_timestamp)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '22222222-0000-0000-0000-00000000000a', gen_random_uuid(), 'outside', 12.5, now());
SELECT test_assert(true, 'geofence_breach_alerts: a company member records a breach on their own geofence');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.geofence_breach_alerts (company_id, geofence_id, breach_type)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000000', '22222222-0000-0000-0000-00000000000b', 'outside')
$q$), 'geofence_breach_alerts: cannot attach an alert to another company''s geofence');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.geofence_breach_alerts (company_id, geofence_id, breach_type)
  VALUES ('bbbbbbbb-0000-0000-0000-000000000000', '22222222-0000-0000-0000-00000000000b', 'outside')
$q$), 'geofence_breach_alerts: cannot write into another company');
SELECT test_assert((SELECT count(*) FROM public.geofence_breach_alerts) = 0,
  'geofence_breach_alerts: office staff do not read worker location alerts');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert((SELECT count(*) FROM public.geofence_breach_alerts) = 1, 'geofence_breach_alerts: a field supervisor reads the company alert');
DELETE FROM public.geofence_breach_alerts;
SELECT test_assert((SELECT count(*) FROM public.geofence_breach_alerts) = 1, 'geofence_breach_alerts: alerts cannot be deleted from a client');
RESET ROLE;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.geofence_breach_alerts) = 0, 'geofence_breach_alerts: company B sees nothing of company A');
ROLLBACK;

-- intervention_logs ---------------------------------------------------------
BEGIN;
-- send-intervention-email's insert, run by a company admin for their own user.
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
INSERT INTO public.intervention_logs (company_id, user_id, prediction_id, intervention_type, subject, status, sent_at)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000e1',
        '33333333-0000-0000-0000-000000000001', 'email', 'tips', 'skipped_opt_out', now());
SELECT test_assert((SELECT count(*) FROM public.intervention_logs) = 1, 'intervention_logs: an admin records and reads outreach for their company');
UPDATE public.intervention_logs SET status = 'sent';
SELECT test_assert((SELECT status FROM public.intervention_logs) = 'skipped_opt_out', 'intervention_logs: consent evidence cannot be edited from a client');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000e1');
SELECT test_assert((SELECT count(*) FROM public.intervention_logs) = 0, 'intervention_logs: a non-admin in the same company reads nothing');
RESET ROLE;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.intervention_logs) = 0, 'intervention_logs: company B admin sees nothing of company A');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.intervention_logs (company_id, user_id, intervention_type, status)
  VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'aaaaaaaa-0000-0000-0000-0000000000e1', 'email', 'sent')
$q$), 'intervention_logs: company B admin cannot write into company A');
RESET ROLE;
SELECT test_act_as('cccccccc-0000-0000-0000-0000000000c1');
SELECT test_assert((SELECT count(*) FROM public.intervention_logs) = 1, 'intervention_logs: root_admin reads across tenants for churn outreach');
ROLLBACK;
