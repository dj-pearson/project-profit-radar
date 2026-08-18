-- DSAR storage erasure support (US-290), plus declarations for the storage
-- buckets that only ever existed in the Supabase dashboard (US-289).
--
-- Background
-- ----------
-- process-dsar-fulfillment deletes the auth user and lets foreign-key cascade
-- clear dependent rows. Storage is not covered by that cascade: deleting an
-- auth user leaves every uploaded file in place, so files a data subject was
-- told had been erased survived indefinitely. This migration adds the two
-- lookups the job needs to find and scope those files.
--
-- Why RPC rather than querying storage.objects directly
-- -----------------------------------------------------
-- The storage schema is not exposed through PostgREST, so an edge function
-- using supabase-js cannot select from storage.objects. These SECURITY DEFINER
-- functions give the service role a narrow, auditable window instead of
-- widening PostgREST's exposed schemas.

-- ---------------------------------------------------------------------------
-- 1. Declare the buckets that were created by hand.
--
-- ON CONFLICT DO NOTHING deliberately: this makes a fresh environment match
-- production without altering any bucket that already exists there. If any of
-- these is currently public in production, this migration does NOT change it -
-- that flip belongs to US-289, which stages it behind the reader migration.
-- ---------------------------------------------------------------------------
INSERT INTO storage.buckets (id, name, public)
VALUES
  ('project-files', 'project-files', false),
  ('expense-receipts', 'expense-receipts', false),
  ('receipts', 'receipts', false),
  ('avatars', 'avatars', false)
ON CONFLICT (id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. List the storage objects a data subject uploaded.
--
-- storage.objects.owner holds the auth uid of the uploader. Upload paths in
-- this codebase are keyed by entity (inspections/<id>/, task-attachments/
-- <task_id>/, chat-attachments/<channel_id>/) rather than by user or company,
-- so owner is the only reliable link from a file back to a person.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsar_list_subject_objects(p_user_id UUID)
RETURNS TABLE (bucket_id TEXT, object_name TEXT)
LANGUAGE sql
SECURITY DEFINER
SET search_path = storage, public
AS $$
  SELECT o.bucket_id::TEXT, o.name::TEXT
  FROM storage.objects o
  WHERE o.owner = p_user_id
$$;

REVOKE ALL ON FUNCTION public.dsar_list_subject_objects(UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dsar_list_subject_objects(UUID) TO service_role;

COMMENT ON FUNCTION public.dsar_list_subject_objects(UUID) IS
  'Lists storage objects uploaded by a data subject, for GDPR Art. 17 / CCPA 1798.105 erasure. Service role only; called by the process-dsar-fulfillment edge function.';

-- ---------------------------------------------------------------------------
-- 3. Is the data subject the last remaining user of their company?
--
-- Scope decision for company-owned content: files a user uploaded on behalf of
-- their employer are Customer Content, for which Brikly is a processor rather
-- than a controller (Privacy Policy sections 1 and 6), and other people at a
-- live company still depend on them. So company-bucket files are erased only
-- when the subject is the last user of that company - the workspace is being
-- wound down and nobody is left to be deprived of the records. While other
-- users remain, erasure of Customer Content runs through the workspace admin,
-- which is what the Privacy Policy already tells end users to do.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.dsar_is_last_company_user(p_user_id UUID, p_company_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_company_id IS NOT NULL
     AND NOT EXISTS (
       SELECT 1
       FROM public.user_profiles up
       WHERE up.company_id = p_company_id
         AND up.id <> p_user_id
     )
$$;

REVOKE ALL ON FUNCTION public.dsar_is_last_company_user(UUID, UUID) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.dsar_is_last_company_user(UUID, UUID) TO service_role;

COMMENT ON FUNCTION public.dsar_is_last_company_user(UUID, UUID) IS
  'True when the data subject is the only remaining user of their company, meaning company-owned uploads may be erased alongside their personal ones. Service role only.';
