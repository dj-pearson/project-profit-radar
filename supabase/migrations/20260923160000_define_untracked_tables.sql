-- US-311: describe the tables the app writes that no migration created.
--
-- Thirteen tables were read or written by src/ or supabase/functions/ and
-- created by no migration. Ten of them were settled by removing or repointing
-- the call site (see US-311 in prd.json). The three that stay are here:
--
--   lead_scores             Exists in the live schema (types.ts has it) but was
--                           only ever typed into the SQL editor. The CREATE
--                           below matches the live shape column for column, so
--                           it no-ops in production and builds the same table
--                           everywhere else. Read by CRMLeadIntelligence ->
--                           LeadScoring.
--   geofence_breach_alerts  Written by the geofencing edge function (user JWT,
--                           so RLS applies). Not in the live schema.
--   intervention_logs       Written by send-intervention-email (user JWT) in the
--                           sent and suppressed-by-opt-out paths. The opt-out row
--                           is consent evidence. Not in the live schema.
--
-- Everything is additive: CREATE TABLE IF NOT EXISTS, new policies under new
-- names, a NOT VALID foreign key that does not check existing rows. No existing
-- policy is dropped or narrowed.

-- ---------------------------------------------------------------------------
-- lead_scores
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.lead_scores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  lead_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  score_factors jsonb NOT NULL DEFAULT '{}'::jsonb,
  calculated_at timestamptz NOT NULL DEFAULT now()
);

-- LeadScoring embeds `lead:leads(...)`, which PostgREST can only resolve through
-- a foreign key. The live table has none (types.ts lists only the companies
-- FK), so that read has been failing with "Could not find a relationship".
-- NOT VALID: existing rows are not checked, so this cannot fail on orphans
-- already in production; only new writes must name a real lead. Nothing in the
-- repo writes this table today.
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conrelid = 'public.lead_scores'::regclass
      AND contype = 'f'
      AND confrelid = 'public.leads'::regclass
  ) THEN
    ALTER TABLE public.lead_scores
      ADD CONSTRAINT lead_scores_lead_id_fkey
      FOREIGN KEY (lead_id) REFERENCES public.leads(id) ON DELETE CASCADE NOT VALID;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_lead_scores_company_id ON public.lead_scores (company_id);
CREATE INDEX IF NOT EXISTS idx_lead_scores_lead_id ON public.lead_scores (lead_id);

ALTER TABLE public.lead_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lead_scores_company_select" ON public.lead_scores;
CREATE POLICY "lead_scores_company_select" ON public.lead_scores
  FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

DROP POLICY IF EXISTS "lead_scores_company_manage" ON public.lead_scores;
CREATE POLICY "lead_scores_company_manage" ON public.lead_scores
  FOR ALL TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('root_admin', 'admin', 'project_manager')
  )
  WITH CHECK (
    company_id = public.get_user_company(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('root_admin', 'admin', 'project_manager')
  );

-- ---------------------------------------------------------------------------
-- geofence_breach_alerts
-- ---------------------------------------------------------------------------
-- Columns are the ones supabase/functions/geofencing inserts, plus company_id
-- (the function now passes the geofence's company). time_entry_id carries no
-- FK: the two call sites pass ids from different flows and neither is the
-- canonical time_entries table.
CREATE TABLE IF NOT EXISTS public.geofence_breach_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  geofence_id uuid NOT NULL REFERENCES public.geofences(id) ON DELETE CASCADE,
  time_entry_id uuid,
  breach_type text NOT NULL CHECK (breach_type IN ('outside', 'clock_in_outside')),
  distance_from_boundary_meters numeric,
  breach_timestamp timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_geofence_breach_alerts_company_id ON public.geofence_breach_alerts (company_id);
CREATE INDEX IF NOT EXISTS idx_geofence_breach_alerts_geofence_id ON public.geofence_breach_alerts (geofence_id);

ALTER TABLE public.geofence_breach_alerts ENABLE ROW LEVEL SECURITY;

-- Any company member can record a breach (the function runs as the worker),
-- but only against a geofence of their own company.
DROP POLICY IF EXISTS "geofence_breach_alerts_company_insert" ON public.geofence_breach_alerts;
CREATE POLICY "geofence_breach_alerts_company_insert" ON public.geofence_breach_alerts
  FOR INSERT TO authenticated
  WITH CHECK (
    company_id = public.get_user_company(auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.geofences g
      WHERE g.id = geofence_id AND g.company_id = geofence_breach_alerts.company_id
    )
  );

-- Location alerts about workers: supervisors and up read them.
DROP POLICY IF EXISTS "geofence_breach_alerts_company_select" ON public.geofence_breach_alerts;
CREATE POLICY "geofence_breach_alerts_company_select" ON public.geofence_breach_alerts
  FOR SELECT TO authenticated
  USING (
    company_id = public.get_user_company(auth.uid())
    AND public.get_user_role(auth.uid()) IN ('root_admin', 'admin', 'project_manager', 'field_supervisor')
  );

-- No UPDATE or DELETE policy: an alert log is append-only for clients.

-- ---------------------------------------------------------------------------
-- intervention_logs
-- ---------------------------------------------------------------------------
-- user_id is the user_profiles.id the admin screen passes as userId. The
-- function now also passes that profile's company_id.
CREATE TABLE IF NOT EXISTS public.intervention_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  prediction_id uuid REFERENCES public.churn_predictions(id) ON DELETE SET NULL,
  intervention_type text NOT NULL,
  subject text,
  status text NOT NULL CHECK (status IN ('sent', 'skipped_opt_out')),
  sent_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_intervention_logs_company_id ON public.intervention_logs (company_id);
CREATE INDEX IF NOT EXISTS idx_intervention_logs_user_id ON public.intervention_logs (user_id);

ALTER TABLE public.intervention_logs ENABLE ROW LEVEL SECURITY;

-- Company admins for their own company; root_admin runs churn outreach across
-- tenants from the admin console.
DROP POLICY IF EXISTS "intervention_logs_admin_insert" ON public.intervention_logs;
CREATE POLICY "intervention_logs_admin_insert" ON public.intervention_logs
  FOR INSERT TO authenticated
  WITH CHECK (
    public.get_user_role(auth.uid()) = 'root_admin'
    OR (
      company_id = public.get_user_company(auth.uid())
      AND public.get_user_role(auth.uid()) = 'admin'
    )
  );

DROP POLICY IF EXISTS "intervention_logs_admin_select" ON public.intervention_logs;
CREATE POLICY "intervention_logs_admin_select" ON public.intervention_logs
  FOR SELECT TO authenticated
  USING (
    public.get_user_role(auth.uid()) = 'root_admin'
    OR (
      company_id = public.get_user_company(auth.uid())
      AND public.get_user_role(auth.uid()) = 'admin'
    )
  );

-- No UPDATE or DELETE policy: this is consent evidence and must not be edited
-- from a client.
