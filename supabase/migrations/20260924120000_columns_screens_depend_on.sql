-- Columns that eight screens read or write but that no migration reliably
-- creates on every database (US-369).
--
-- The migration history cannot be replayed in order: several tables are
-- created twice, and the second definition is either a plain CREATE TABLE that
-- would fail against the first, or a CREATE TABLE IF NOT EXISTS that is a
-- silent no-op against it. In both cases the columns only the second
-- definition has are not guaranteed to exist. The generated types
-- (src/integrations/supabase/types.ts) show exactly those columns absent:
--
--   data_subject_requests  20250703164717 created the GDPR-tools shape
--                          (requester_email, subject_user_id, due_date, ...).
--                          20260414000000 re-declared it with IF NOT EXISTS, so
--                          user_id, email, source, legal_basis, notes, due_at
--                          and denial_reason were never added. That migration
--                          then indexes user_id, which errors on such a
--                          database and rolls the whole file back - taking
--                          company_settings.enable_ai_* and the email
--                          preferences changes with it.
--   email_preferences      20250202000001 created it with marketing_emails;
--                          20260414000000 re-declared it (IF NOT EXISTS) with
--                          marketing. EmailPreferences.tsx and email-unsubscribe
--                          write marketing.
--   punch_list_items       20250711192213 created it without notes;
--                          20250915000002 re-declared it (IF NOT EXISTS) with
--                          notes. PunchList.tsx appends comments to notes.
--   client_portal_access   20250202000027 created the tenant_id shape;
--                          20250727050851 re-created it with company_id,
--                          access_level, last_accessed_at and created_by.
--                          invite-client writes those; ProjectClientAccess.tsx
--                          reads them.
--   audit_logs             20250202000012 created it without risk_level;
--                          20250703164308 re-created it with risk_level.
--                          ComplianceAudit.tsx filters on it.
--   company_settings       enable_ai_features / enable_ai_data_sharing are
--                          added by 20260414000000, which rolls back on the
--                          databases described above.
--
-- time_entries.notes (20260209100000) and ai_model_configurations.task_type
-- (20260204000000) are already added with ADD COLUMN IF NOT EXISTS and need
-- nothing here; types.ts lacks them only because it was generated from the old
-- cloud project.
--
-- Everything below is additive and idempotent: ADD COLUMN IF NOT EXISTS with a
-- nullable column or a constant default, plus two DROP NOT NULLs that widen
-- data_subject_requests to the shape 20260414000000 intended. Where a column
-- already exists the statement is a no-op, so this is safe on a database where
-- every earlier migration did apply. No RLS policy changes.

-- ---------------------------------------------------------------------------
-- 1. company_settings: workspace AI switches (CompanySettings.tsx,
--    useAIFeatures.ts, _shared AI gating)
-- ---------------------------------------------------------------------------
ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS enable_ai_features BOOLEAN NOT NULL DEFAULT TRUE;

ALTER TABLE public.company_settings
  ADD COLUMN IF NOT EXISTS enable_ai_data_sharing BOOLEAN NOT NULL DEFAULT TRUE;

-- ---------------------------------------------------------------------------
-- 2. data_subject_requests: self-service DSAR columns (PrivacyControls.tsx,
--    data-subject-export, data-subject-delete, process-dsar-fulfillment)
-- ---------------------------------------------------------------------------
ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL;

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS email TEXT;

-- The default satisfies the check for every existing row.
ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS source TEXT NOT NULL DEFAULT 'self_service'
    CHECK (source IN ('self_service', 'email', 'phone', 'mail', 'agent'));

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS legal_basis TEXT;

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS notes TEXT;

ALTER TABLE public.data_subject_requests
  ADD COLUMN IF NOT EXISTS denial_reason TEXT;

-- due_at is added nullable with no default so existing rows are not all given
-- "30 days from the day this migration ran" as their statutory deadline.
-- Rows from the older shape carry their deadline in due_date; copy that
-- across, then give new rows the 30-day default 20260414000000 intended.
DO $$
DECLARE
  had_due_at boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'data_subject_requests' AND column_name = 'due_at'
  ) INTO had_due_at;

  ALTER TABLE public.data_subject_requests ADD COLUMN IF NOT EXISTS due_at TIMESTAMPTZ;

  IF NOT had_due_at THEN
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'data_subject_requests' AND column_name = 'due_date'
    ) THEN
      EXECUTE 'UPDATE public.data_subject_requests SET due_at = due_date::timestamptz WHERE due_at IS NULL AND due_date IS NOT NULL';
    END IF;
    ALTER TABLE public.data_subject_requests ALTER COLUMN due_at SET DEFAULT (NOW() + INTERVAL '30 days');
  END IF;
END $$;

-- The older shape made requester_email and company_id mandatory. The
-- self-service paths send email (not requester_email), and data-subject-export
-- sends no company_id, so every one of those inserts failed. Widening only.
DO $$
DECLARE
  col text;
BEGIN
  FOREACH col IN ARRAY ARRAY['requester_email', 'company_id'] LOOP
    IF EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'data_subject_requests'
        AND column_name = col AND is_nullable = 'NO'
    ) THEN
      EXECUTE format('ALTER TABLE public.data_subject_requests ALTER COLUMN %I DROP NOT NULL', col);
    END IF;
  END LOOP;
END $$;

CREATE INDEX IF NOT EXISTS idx_data_subject_requests_user
  ON public.data_subject_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_data_subject_requests_due_at
  ON public.data_subject_requests(due_at) WHERE status != 'completed';

-- ---------------------------------------------------------------------------
-- 3. email_preferences.marketing (EmailPreferences.tsx, email-unsubscribe,
--    _shared/email-consent)
-- ---------------------------------------------------------------------------
-- A plain DEFAULT TRUE would opt back in everyone who had already opted out
-- through marketing_emails. When the column is new, seed it from that value.
DO $$
DECLARE
  had_marketing boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_preferences' AND column_name = 'marketing'
  ) INTO had_marketing;

  ALTER TABLE public.email_preferences ADD COLUMN IF NOT EXISTS marketing BOOLEAN NOT NULL DEFAULT TRUE;

  IF NOT had_marketing AND EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'email_preferences' AND column_name = 'marketing_emails'
  ) THEN
    EXECUTE 'UPDATE public.email_preferences SET marketing = FALSE WHERE marketing_emails IS FALSE';
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. punch_list_items.notes (PunchList.tsx comment log)
-- ---------------------------------------------------------------------------
ALTER TABLE public.punch_list_items
  ADD COLUMN IF NOT EXISTS notes TEXT;

-- ---------------------------------------------------------------------------
-- 5. client_portal_access (ProjectClientAccess.tsx, invite-client)
-- ---------------------------------------------------------------------------
ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS access_level TEXT NOT NULL DEFAULT 'read_only';

ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMPTZ;

ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

ALTER TABLE public.client_portal_access
  ADD COLUMN IF NOT EXISTS created_by UUID;

-- A row enrolled before company_id existed belongs to its project's company.
-- Joined through companies so a project pointing at a deleted company cannot
-- fail the foreign key and abort the whole migration.
UPDATE public.client_portal_access a
   SET company_id = c.id
  FROM public.projects p
  JOIN public.companies c ON c.id = p.company_id
 WHERE a.company_id IS NULL
   AND a.project_id = p.id;

-- ---------------------------------------------------------------------------
-- 6. audit_logs.risk_level (ComplianceAudit.tsx high-risk count)
-- ---------------------------------------------------------------------------
ALTER TABLE public.audit_logs
  ADD COLUMN IF NOT EXISTS risk_level TEXT DEFAULT 'low';
