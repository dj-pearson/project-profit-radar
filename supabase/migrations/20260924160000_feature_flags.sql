-- Runtime feature flags and kill switches (US-281).
--
-- Deploys ship by branch promotion only, so turning off a misbehaving
-- integration used to mean a revert, a rebuild and (for edge functions) a
-- redeploy. A row here flips a flag at runtime instead. The web app and edge
-- functions both read this table; which flags exist, what each one does with
-- no row, and what it does when the read fails live in code, in
-- supabase/functions/_shared/feature-flags.ts and its web mirror
-- src/lib/featureFlags.ts. A key this table holds that the registry does not
-- know is ignored. How to flip a flag, and when to delete one, is in
-- docs/FEATURE_FLAGS.md.
--
-- Resolution, per flag and company:
--   1. a global row (company_id IS NULL) with enabled = false wins - that is
--      the kill switch, and no company row can override it;
--   2. otherwise a row for the caller's company decides;
--   3. otherwise a global row decides;
--   4. otherwise the registry default applies.
--
-- Additive only: one new table, one new trigger function, one trigger. No
-- client can write the table; flags are flipped with SQL on the service role
-- (dashboard SQL editor), and every change leaves an audit_logs row.

CREATE TABLE IF NOT EXISTS public.feature_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  flag_key TEXT NOT NULL
    CHECK (flag_key ~ '^[a-z][a-z0-9_]*(\.[a-z][a-z0-9_]*)*$' AND length(flag_key) <= 64),
  -- NULL means every company.
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL,
  -- Why it was flipped, so the next person knows whether it is safe to flip
  -- back. Required: an unexplained kill switch is how flags become permanent.
  reason TEXT NOT NULL CHECK (length(btrim(reason)) > 0),
  -- Who flipped it. SQL-editor changes have no auth.uid(), so this is text the
  -- operator types (an email), and the audit row records it too.
  changed_by TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE public.feature_flags IS
  'Runtime flag overrides (US-281). Registry and defaults live in supabase/functions/_shared/feature-flags.ts; procedure in docs/FEATURE_FLAGS.md. Service-role writes only.';

-- One global row and one row per company, per flag.
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_global_key
  ON public.feature_flags (flag_key) WHERE company_id IS NULL;
CREATE UNIQUE INDEX IF NOT EXISTS feature_flags_company_key
  ON public.feature_flags (flag_key, company_id) WHERE company_id IS NOT NULL;

ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.feature_flags FROM anon, authenticated;
GRANT SELECT ON public.feature_flags TO authenticated;
GRANT ALL ON public.feature_flags TO service_role;

-- Signed-in users read the global rows and their own company's rows, because
-- the web app hides a switched-off feature before the user clicks it. The
-- rows say nothing more sensitive than "QuickBooks sync is paused".
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'feature_flags'
      AND policyname = 'Users read global and own-company feature flags'
  ) THEN
    CREATE POLICY "Users read global and own-company feature flags"
      ON public.feature_flags FOR SELECT
      TO authenticated
      USING (
        company_id IS NULL
        OR company_id = public.get_user_company(auth.uid())
      );
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Audit every change (CLAUDE.md security rule 4)
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.audit_feature_flag_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  r public.feature_flags;
BEGIN
  IF TG_OP = 'DELETE' THEN
    r := OLD;
  ELSE
    r := NEW;
    NEW.updated_at := now();
  END IF;

  PERFORM public.write_audit_log_internal(
    r.company_id,
    auth.uid(),
    lower(TG_OP),
    'feature_flag',
    r.id::text,
    r.flag_key,
    CASE WHEN TG_OP = 'INSERT' THEN NULL
         ELSE jsonb_build_object('enabled', OLD.enabled, 'reason', OLD.reason, 'changed_by', OLD.changed_by) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL
         ELSE jsonb_build_object('enabled', NEW.enabled, 'reason', NEW.reason, 'changed_by', NEW.changed_by) END,
    NULL, NULL, NULL,
    'high',
    'general',
    'Feature flag ' || r.flag_key
      || CASE WHEN r.company_id IS NULL THEN ' (all companies)' ELSE ' (one company)' END
      || CASE WHEN TG_OP = 'DELETE' THEN ' removed'
              ELSE ' set to ' || CASE WHEN r.enabled THEN 'on' ELSE 'off' END END
      || COALESCE(' by ' || r.changed_by, ''),
    jsonb_build_object('flag_key', r.flag_key, 'scope', CASE WHEN r.company_id IS NULL THEN 'global' ELSE 'company' END)
  );

  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.audit_feature_flag_change() FROM PUBLIC, anon, authenticated;

-- BEFORE so the same trigger can stamp updated_at on the row it audits.
DROP TRIGGER IF EXISTS audit_feature_flag_change ON public.feature_flags;
CREATE TRIGGER audit_feature_flag_change
  BEFORE INSERT OR UPDATE OR DELETE ON public.feature_flags
  FOR EACH ROW EXECUTE FUNCTION public.audit_feature_flag_change();
