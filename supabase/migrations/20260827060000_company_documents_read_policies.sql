-- Make the company-documents SELECT policy match the paths the app actually
-- wrote (US-289, prerequisite for the privacy flip).
--
-- The original policy (migration 20250703014008) reads:
--
--   bucket_id = 'company-documents'
--   AND (storage.foldername(name))[1] = get_user_company(auth.uid())::text
--
-- so it only authorises objects whose FIRST path segment is the caller's
-- company id. Of the three writers, two produced that shape and one did not:
--
--   DocumentTemplates    <companyId>/templates/...          matches
--   DocumentManagement   <companyId>/<file>                 matches
--   DocumentVersions     <userId>/<file>                    does not match
--
-- Nobody noticed because the bucket is public: reads go through
-- /object/public/ and never consult a policy at all. This is the same latent
-- break that 20260818015000 fixed for project-documents; it was never checked
-- for this bucket.
--
-- DocumentVersions now writes <companyId>/versions/<documentId>/..., so new
-- uploads match the original policy directly. Objects already stored under the
-- user-id prefix cannot be relocated from a migration -- moving an object is a
-- storage API call, not SQL -- so they need a read path that does not depend on
-- their prefix. Every version row carries file_path and resolves to a document,
-- which carries company_id, so the join is exact rather than a pattern match.
--
-- Additive (PERMISSIVE) alongside the original policy, deliberately: rewriting
-- a merged migration is forbidden, and dropping the first-segment rule would
-- leave the bucket with no read path for the objects that do match it.

DROP POLICY IF EXISTS "Company members can read company-documents by record" ON storage.objects;

CREATE POLICY "Company members can read company-documents by record"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'company-documents'
  AND (
    -- Legacy <userId>/<file> version uploads: resolve the version row to its
    -- document, which carries company_id.
    EXISTS (
      SELECT 1
      FROM public.document_versions dv
      JOIN public.documents d ON d.id = dv.document_id
      WHERE dv.file_path = storage.objects.name
        AND (
          d.company_id = public.get_user_company(auth.uid())
          OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
        )
    )

    -- Anything recorded directly in the documents table, matched on the stored
    -- path. Covers uploads whose prefix drifts from the company id for any
    -- other reason.
    OR EXISTS (
      SELECT 1 FROM public.documents d
      WHERE d.file_path = storage.objects.name
        AND (
          d.company_id = public.get_user_company(auth.uid())
          OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
        )
    )
  )
);

COMMENT ON POLICY "Company members can read company-documents by record" ON storage.objects IS
  'US-289. Supplements the original first-segment-is-company-id policy so document versions stored under the historical <userId>/ prefix remain readable once the bucket is private. Both branches are scoped to the caller company.';
