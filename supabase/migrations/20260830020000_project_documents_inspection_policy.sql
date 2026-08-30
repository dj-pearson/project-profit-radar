-- The one project-documents path shape still unreadable once the bucket goes
-- private: legacy inspection photos (US-289).
--
-- Migration 20260818015000 added a supplementary SELECT policy for the shapes
-- that are not <projectId>/... , and its header lists inspections among them:
--
--   InspectionConductDialog inspections/<inspectionId>/...  does not match
--
-- but none of its three branches actually covers that shape.
--   * <category>/<projectId> matches foldername[2] against projects.id, and
--     foldername[2] here is an INSPECTION id.
--   * the task-attachments branch is keyed on that literal first segment.
--   * the documents-table branch needs a documents row whose file_path equals
--     the object name, and inspection photos are recorded in
--     quality_inspections.photos (a JSON array), never in documents.
--
-- New uploads are fine - InspectionConductDialog writes
-- <projectId>/inspections/<inspectionId>/photos/... now, which the original
-- first-segment policy matches. This is about the objects already in the
-- bucket. They read today only because a public bucket serves /object/public/
-- without consulting a policy at all, so the flip would silently stop every
-- historical inspection photo from loading.
--
-- quality_inspections carries company_id directly, so the branch resolves
-- without a join.

DROP POLICY IF EXISTS "Company members can read legacy inspection photos" ON storage.objects;

CREATE POLICY "Company members can read legacy inspection photos"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND (storage.foldername(name))[1] = 'inspections'
  AND EXISTS (
    SELECT 1 FROM public.quality_inspections qi
    WHERE qi.id::text = (storage.foldername(name))[2]
      AND (
        qi.company_id = public.get_user_company(auth.uid())
        OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
      )
  )
);

COMMENT ON POLICY "Company members can read legacy inspection photos" ON storage.objects IS
  'US-289. Covers inspections/<inspectionId>/... objects written before InspectionConductDialog converged on the project-first path. 20260818015000 named this shape but none of its branches matched it.';
