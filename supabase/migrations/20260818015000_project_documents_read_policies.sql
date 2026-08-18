-- Make the project-documents SELECT policy match the paths the app actually
-- writes (US-289, prerequisite for the privacy flip).
--
-- The original policy (migration 20250703014008) reads:
--
--   bucket_id = 'project-documents' AND EXISTS (
--     SELECT 1 FROM projects p WHERE p.id::text = (storage.foldername(name))[1] ...)
--
-- so it only authorises objects whose FIRST path segment is a project id.
-- Almost nothing in the app writes that shape:
--
--   ClientPortalRFIs        <projectId>/rfi/...             matches
--   DailyReports            daily-reports/<projectId>/...   does not match
--   ProjectPunchList        punch-list/<projectId>/...      does not match
--   TaskAttachments         task-attachments/<taskId>/...   does not match
--   InspectionConductDialog inspections/<inspectionId>/...  does not match
--   VoiceNotes              voice-notes/<filename>          does not match
--
-- Nobody noticed because the bucket was public: reads went through
-- /object/public/ and never consulted a policy at all. Flipping the bucket to
-- private without this migration would turn a silent authorisation gap into a
-- silent outage -- inspection photos, daily-report photos, punch-list photos,
-- task attachments and voice notes would all stop loading.
--
-- This adds one additional SELECT policy covering the remaining shapes. Every
-- branch is company-scoped; none of them widen access beyond the workspace.
-- Policies are additive (PERMISSIVE), so this sits alongside the original
-- first-segment rule rather than replacing it -- deliberately, because
-- rewriting a merged migration is forbidden and dropping the old policy would
-- briefly leave the bucket with no read path at all.

DROP POLICY IF EXISTS "Company members can read project-documents by path" ON storage.objects;

CREATE POLICY "Company members can read project-documents by path"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-documents'
  AND (
    -- <category>/<projectId>/... : daily-reports, punch-list, and anything
    -- else that namespaces by category first and project second.
    EXISTS (
      SELECT 1 FROM public.projects p
      WHERE p.id::text = (storage.foldername(name))[2]
        AND (
          p.company_id = public.get_user_company(auth.uid())
          OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
        )
    )

    -- task-attachments/<taskId>/... : resolve the task to its project.
    OR (
      (storage.foldername(name))[1] = 'task-attachments'
      AND EXISTS (
        SELECT 1
        FROM public.tasks t
        JOIN public.projects p ON p.id = t.project_id
        WHERE t.id::text = (storage.foldername(name))[2]
          AND (
            p.company_id = public.get_user_company(auth.uid())
            OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
          )
      )
    )

    -- Anything recorded in the documents table, matched on the stored path.
    -- Covers voice notes and any other upload that does not encode a project
    -- in its path but does own a documents row carrying company_id.
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

COMMENT ON POLICY "Company members can read project-documents by path" ON storage.objects IS
  'US-289. Supplements the original first-segment-is-project-id policy so the category/<projectId>, task-attachments/<taskId>, and documents-table path shapes remain readable once the bucket is private. Every branch is scoped to the caller company.';
