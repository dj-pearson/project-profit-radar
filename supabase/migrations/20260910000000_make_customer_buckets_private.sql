-- Make the customer-content buckets private (US-289, final stage).
--
-- project-documents, company-documents and project-communications were all
-- created with public = true. Supabase does not apply storage.objects RLS to
-- reads through the /storage/v1/object/public/ path, so every customer
-- document, job-site photo, inspection photo, voice note and chat attachment
-- in them has been readable by anyone holding or guessing the URL, regardless
-- of company, role, or whether they have an account at all.
--
-- This migration is deliberately last. Flipping the buckets is what starts
-- enforcing the policies, and a policy that does not match the paths the app
-- writes turns a silent access gap into a silent outage. The prerequisites
-- landed first and each is a separate, already-merged migration:
--
--   20260818010000_backfill_storage_paths          existing objects moved to
--                                                  the paths the policies key on
--   20260818015000_project_documents_read_policies  category/<projectId>,
--                                                  task-attachments/<taskId>
--                                                  and documents-table shapes
--   20260830010000_project_communications_company_policies
--                                                  company+role read and upload,
--                                                  since the participants table
--                                                  nothing writes authorised nobody
--
-- The app reads all three through signed URLs already (src/lib/storage/signedUrl.ts,
-- whose PUBLIC_ASSET_BUCKETS allowlist is marketing assets only), and the iOS
-- app does not touch these buckets, so no shipped client depends on the public
-- read path. site-assets and blog-images stay public by design.
--
-- Idempotent: re-running sets public = false on buckets that already are.

-- Pre-flight 1: a private bucket with no SELECT policy is an outage for every
-- object in it. Warn rather than abort. Failing here would leave the exposure
-- open, which is strictly worse than a named warning in the apply log.
DO $$
DECLARE
  target text;
  policy_count int;
BEGIN
  FOREACH target IN ARRAY ARRAY['project-documents', 'company-documents', 'project-communications']
  LOOP
    SELECT count(*) INTO policy_count
    FROM pg_policies
    WHERE schemaname = 'storage'
      AND tablename = 'objects'
      AND cmd IN ('SELECT', 'ALL')
      AND qual LIKE '%' || target || '%';

    IF policy_count = 0 THEN
      RAISE WARNING 'Bucket % is about to become private with no SELECT policy on storage.objects. Every object in it will be unreadable until one is added.', target;
    ELSE
      RAISE NOTICE 'Bucket %: % SELECT policy/policies found.', target, policy_count;
    END IF;
  END LOOP;
END $$;

-- Pre-flight 2: count objects whose path matches no policy branch. Code review
-- cannot answer this - files left by a deleted feature, or uploaded by hand,
-- have no call site to audit. It has to be measured against real data at apply
-- time, and it is a count rather than a failure because the right response
-- depends on what the objects turn out to be.
DO $$
DECLARE
  orphaned int;
BEGIN
  SELECT count(*) INTO orphaned
  FROM storage.objects o
  WHERE o.bucket_id = 'project-documents'
    AND NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(o.name))[1]
         OR p.id::text = (storage.foldername(o.name))[2]
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.tasks t
      WHERE (storage.foldername(o.name))[1] = 'task-attachments'
        AND t.id::text = (storage.foldername(o.name))[2]
    )
    AND NOT EXISTS (
      SELECT 1 FROM public.documents d WHERE d.file_path = o.name
    );
  IF orphaned > 0 THEN
    RAISE WARNING 'project-documents: % object(s) match no read policy and will become unreachable. Audit before or after the flip; they stay stored either way.', orphaned;
  END IF;

  SELECT count(*) INTO orphaned
  FROM storage.objects o
  WHERE o.bucket_id = 'company-documents'
    AND NOT EXISTS (
      SELECT 1 FROM public.companies c
      WHERE c.id::text = (storage.foldername(o.name))[1]
    );
  IF orphaned > 0 THEN
    RAISE WARNING 'company-documents: % object(s) are not company-first and match no read policy.', orphaned;
  END IF;

  SELECT count(*) INTO orphaned
  FROM storage.objects o
  WHERE o.bucket_id = 'project-communications'
    AND NOT EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(o.name))[1]
    );
  IF orphaned > 0 THEN
    RAISE WARNING 'project-communications: % object(s) are not project-first and match no read policy.', orphaned;
  END IF;
END $$;

-- The flip.
UPDATE storage.buckets
SET public = false
WHERE id IN ('project-documents', 'company-documents', 'project-communications');

-- Confirm it took, so the apply log says what happened rather than the operator
-- inferring it from an absence of errors.
DO $$
DECLARE
  still_public text[];
BEGIN
  SELECT array_agg(id) INTO still_public
  FROM storage.buckets
  WHERE id IN ('project-documents', 'company-documents', 'project-communications')
    AND public;

  IF still_public IS NOT NULL THEN
    RAISE EXCEPTION 'Buckets still public after the flip: %', still_public;
  END IF;

  RAISE NOTICE 'project-documents, company-documents and project-communications are now private.';
END $$;
