-- Legal & compliance schema additions.
--
-- Adds:
--   1. Workspace-level AI opt-out columns on company_settings so admins can
--      turn AI features and AI-provider data sharing off for their entire
--      organization. Read by the useAIFeatures hook and by AI edge
--      functions via the shared auth helpers.
--   2. data_subject_requests table that backs the self-service DSAR flow
--      in UserProfile → Privacy. Each row represents a user-initiated
--      right of access, deletion, correction, portability, or opt-out
--      request under CCPA/CPRA, GDPR, and U.S. state privacy laws.
--   3. consent_ledger table for auditable cookie/tracking consent
--      records. CookieConsentBanner persists client-side state in
--      localStorage; this table receives a server-side audit entry when
--      the user is authenticated (or when the edge function is called
--      anonymously with a session ID).
--
-- All tables are protected with Row-Level Security that follows the
-- platform's existing company-scoped pattern.

-- ---------------------------------------------------------------------------
-- 1. company_settings.enable_ai_features / enable_ai_data_sharing
-- ---------------------------------------------------------------------------

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS enable_ai_features BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS enable_ai_data_sharing BOOLEAN NOT NULL DEFAULT TRUE;

COMMENT ON COLUMN public.company_settings.enable_ai_features IS
  'Workspace-level kill switch for all AI-assisted features (estimating, insights, document analysis, etc.). When false, AI entry points are hidden and AI edge functions reject invocations.';

COMMENT ON COLUMN public.company_settings.enable_ai_data_sharing IS
  'When false, Brikly will not transmit Customer Content to external AI subprocessors (Anthropic, etc.) even if enable_ai_features is true. Features that require external providers are disabled.';

-- ---------------------------------------------------------------------------
-- 2. data_subject_requests
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.data_subject_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES public.companies(id) ON DELETE SET NULL,
  email TEXT,
  request_type TEXT NOT NULL
    CHECK (request_type IN (
      'access',
      'deletion',
      'correction',
      'portability',
      'opt_out_sale_share',
      'restrict',
      'object'
    )),
  status TEXT NOT NULL DEFAULT 'pending'
    CHECK (status IN ('pending', 'verifying', 'in_progress', 'completed', 'denied', 'cancelled')),
  source TEXT NOT NULL DEFAULT 'self_service'
    CHECK (source IN ('self_service', 'email', 'phone', 'mail', 'agent')),
  legal_basis TEXT,
  verification_method TEXT,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '30 days'),
  completed_at TIMESTAMPTZ,
  denial_reason TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.data_subject_requests IS
  'Audit trail for data subject requests under CCPA/CPRA, GDPR, and U.S. state privacy laws. One row per request. Populated by the self-service Privacy tab and by the privacy@ inbox workflow.';

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user ON public.data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_company ON public.data_subject_requests(company_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_status ON public.data_subject_requests(status) WHERE status != 'completed';
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_due_at ON public.data_subject_requests(due_at) WHERE status != 'completed';

ALTER TABLE public.data_subject_requests ENABLE ROW LEVEL SECURITY;

-- Users may read and create requests for themselves.
DROP POLICY IF EXISTS "users_read_own_dsar" ON public.data_subject_requests;
CREATE POLICY "users_read_own_dsar"
  ON public.data_subject_requests
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

DROP POLICY IF EXISTS "users_create_own_dsar" ON public.data_subject_requests;
CREATE POLICY "users_create_own_dsar"
  ON public.data_subject_requests
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Company admins may read requests that belong to their workspace so they
-- can respond to workspace-scoped DSARs. Privacy-team service-role access
-- goes through the service role key (bypasses RLS).
DROP POLICY IF EXISTS "admins_read_company_dsar" ON public.data_subject_requests;
CREATE POLICY "admins_read_company_dsar"
  ON public.data_subject_requests
  FOR SELECT
  TO authenticated
  USING (
    company_id IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM public.user_profiles p
      WHERE p.user_id = auth.uid()
        AND p.company_id = data_subject_requests.company_id
        AND p.role IN ('root_admin', 'admin')
    )
  );

-- Keep updated_at in sync without requiring app code to manage it.
CREATE OR REPLACE FUNCTION public.set_data_subject_requests_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_dsar_updated_at ON public.data_subject_requests;
CREATE TRIGGER trg_dsar_updated_at
  BEFORE UPDATE ON public.data_subject_requests
  FOR EACH ROW
  EXECUTE FUNCTION public.set_data_subject_requests_updated_at();

-- ---------------------------------------------------------------------------
-- 3. consent_ledger (cookie / tracking consent audit log)
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.consent_ledger (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_id TEXT,
  consent_state JSONB NOT NULL,
  consent_method TEXT NOT NULL
    CHECK (consent_method IN ('banner', 'preferences', 'gpc', 'reject-all', 'api')),
  gpc_active BOOLEAN NOT NULL DEFAULT FALSE,
  user_agent TEXT,
  ip_address TEXT,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.consent_ledger IS
  'Server-side record of cookie / tracking consent choices. GDPR/CCPA require the controller to demonstrate consent was given; this table is the audit log paired with the client-side CookieConsentBanner.';

CREATE INDEX IF NOT EXISTS idx_consent_ledger_user ON public.consent_ledger(user_id);
CREATE INDEX IF NOT EXISTS idx_consent_ledger_session ON public.consent_ledger(session_id);
CREATE INDEX IF NOT EXISTS idx_consent_ledger_recorded_at ON public.consent_ledger(recorded_at DESC);

ALTER TABLE public.consent_ledger ENABLE ROW LEVEL SECURITY;

-- Authenticated users may insert their own consent records. We intentionally
-- do NOT allow SELECT from the client — the consent history should only be
-- read by privacy admins via the service role.
DROP POLICY IF EXISTS "users_insert_own_consent" ON public.consent_ledger;
CREATE POLICY "users_insert_own_consent"
  ON public.consent_ledger
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Allow anonymous (unauthenticated) visitors to log consent before sign-up.
-- Mapped by session_id only; no user_id is stored.
DROP POLICY IF EXISTS "anon_insert_session_consent" ON public.consent_ledger;
CREATE POLICY "anon_insert_session_consent"
  ON public.consent_ledger
  FOR INSERT
  TO anon
  WITH CHECK (user_id IS NULL AND session_id IS NOT NULL);

-- ---------------------------------------------------------------------------
-- 4. email_preferences (CAN-SPAM / CASL / ePrivacy)
-- ---------------------------------------------------------------------------
--
-- Granular email-category opt-in/out state per user. Backs
-- /email-preferences and is consumed by every transactional and marketing
-- edge function before sending commercial email.

CREATE TABLE IF NOT EXISTS public.email_preferences (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  product_updates BOOLEAN NOT NULL DEFAULT TRUE,
  marketing BOOLEAN NOT NULL DEFAULT TRUE,
  newsletter BOOLEAN NOT NULL DEFAULT TRUE,
  -- Transactional and security_alerts are intentionally NOT columns here:
  -- those are always-on and cannot be disabled by users (CAN-SPAM permits
  -- transactional messages without opt-out; account-security notices are
  -- legitimate-interest under GDPR Art. 6(1)(f)).
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE public.email_preferences IS
  'Per-user marketing / product / newsletter opt-in state. Read by every edge function before sending commercial email to honor CAN-SPAM, CASL, and ePrivacy within the 10-business-day (CAN-SPAM) / immediate (CASL, ePrivacy) SLA.';

ALTER TABLE public.email_preferences ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "users_manage_own_email_prefs" ON public.email_preferences;
CREATE POLICY "users_manage_own_email_prefs"
  ON public.email_preferences
  FOR ALL
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- 5. Schedule DSAR fulfillment job (pg_cron + net.http_post)
-- ---------------------------------------------------------------------------
--
-- Runs once per day at 03:17 UTC. The window is intentionally off-hour so
-- the batch does not collide with backup jobs. The cron entry uses the
-- `pg_cron` and `pg_net` extensions and passes the service-role key in the
-- Authorization header — matching what the edge function validates.
--
-- Idempotency: if pg_cron is not available in the target environment (e.g.,
-- local dev), the DO block swallows the error so migrations still run.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_cron'
  ) AND EXISTS (
    SELECT 1 FROM pg_extension WHERE extname = 'pg_net'
  ) THEN
    -- Unschedule any prior version to avoid duplicate jobs.
    PERFORM cron.unschedule('dsar-fulfillment-daily')
      WHERE EXISTS (SELECT 1 FROM cron.job WHERE jobname = 'dsar-fulfillment-daily');

    PERFORM cron.schedule(
      'dsar-fulfillment-daily',
      '17 3 * * *',
      $job$
      SELECT net.http_post(
        url := current_setting('app.settings.functions_base_url', true) || '/process-dsar-fulfillment',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || current_setting('app.settings.service_role_key', true)
        ),
        body := '{}'::jsonb
      ) AS request_id;
      $job$
    );
  ELSE
    RAISE NOTICE 'pg_cron or pg_net not installed; DSAR fulfillment must be scheduled manually.';
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'DSAR fulfillment schedule skipped: %', SQLERRM;
END $$;

COMMENT ON TABLE public.data_subject_requests IS
  'Audit trail for data subject requests under CCPA/CPRA, GDPR, and U.S. state privacy laws. One row per request. Populated by the self-service Privacy tab and by the privacy@ inbox workflow. Processed nightly by the process-dsar-fulfillment edge function (see pg_cron schedule dsar-fulfillment-daily).';
