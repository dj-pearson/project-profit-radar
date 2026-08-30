-- Give project-communications storage the same company-scoped branch its own
-- message table already has (US-289, prerequisite for the privacy flip).
--
-- Migration 20250706130335 created this bucket and gated every object on
-- membership in project_communication_participants:
--
--   FOR SELECT USING (bucket_id = 'project-communications' AND EXISTS (
--     SELECT 1 FROM project_communication_participants pcp
--     WHERE pcp.user_id = auth.uid() AND (storage.foldername(name))[1] = pcp.project_id::text))
--
-- NOTHING WRITES THAT TABLE. Not the app, not an edge function, not a trigger,
-- not a seed in any migration - the only way a row gets there is somebody
-- typing it into the SQL editor. The same migration knew that gate was too
-- narrow on its own: the project_messages policies twenty lines above carry an
-- OR branch admitting admin, project_manager and root_admin in the project's
-- company. The three storage policies got no such branch.
--
-- So uploads to this bucket already fail for everyone, including admins -
-- storage.objects RLS applies to INSERT whether or not the bucket is public.
-- ProjectCommunication.tsx and ClientMessageCenter.tsx both throw on the
-- upload error and show "Upload failed", so it is a visible broken feature
-- rather than a silent one. Reads have been working only because a public
-- bucket serves /object/public/ without consulting a policy at all; the moment
-- the flip lands, every existing attachment stops loading too.
--
-- This adds one SELECT and one INSERT policy carrying exactly the branch
-- project_messages already has - company match plus admin/project_manager/
-- root_admin - so the people who can already post a message in a project can
-- read and attach its files. It does not widen access beyond what that message
-- policy grants, and it does not touch the participant branch: policies are
-- PERMISSIVE and OR together, so an enrolled client keeps the access they have.
--
-- WHAT THIS DELIBERATELY DOES NOT FIX: the client-portal side. A client_portal
-- user is in neither branch of the project_messages policy either, so client
-- messaging depends on participant rows that nothing creates. Building that
-- enrolment is a feature, not a policy fix, and pretending otherwise here would
-- hide it.

DROP POLICY IF EXISTS "Company staff can read project-communications" ON storage.objects;

CREATE POLICY "Company staff can read project-communications"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'project-communications'
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (
        (
          p.company_id = public.get_user_company(auth.uid())
          AND public.get_user_role(auth.uid()) = ANY (
            ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]
          )
        )
        OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
      )
  )
);

DROP POLICY IF EXISTS "Company staff can upload project-communications" ON storage.objects;

CREATE POLICY "Company staff can upload project-communications"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'project-communications'
  -- Same <projectId>/<userId>/<file> convention both writers use, so a user
  -- can only write under their own id.
  AND auth.uid()::text = (storage.foldername(name))[2]
  AND EXISTS (
    SELECT 1 FROM public.projects p
    WHERE p.id::text = (storage.foldername(name))[1]
      AND (
        (
          p.company_id = public.get_user_company(auth.uid())
          AND public.get_user_role(auth.uid()) = ANY (
            ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]
          )
        )
        OR public.get_user_role(auth.uid()) = 'root_admin'::user_role
      )
  )
);

COMMENT ON POLICY "Company staff can read project-communications" ON storage.objects IS
  'US-289. project_communication_participants is written by nothing, so the original membership-only policy authorises nobody. This carries the same company plus admin/project_manager/root_admin branch project_messages already has.';

COMMENT ON POLICY "Company staff can upload project-communications" ON storage.objects IS
  'US-289. Restores attachment upload for the same people who can already post a message, under the <projectId>/<userId>/ path both writers use.';
