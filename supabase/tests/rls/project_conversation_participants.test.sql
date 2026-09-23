-- US-316: an enrolled client can read and post project messages; revoking
-- portal access takes the conversation away; staff branches are unchanged.

CREATE SCHEMA storage;
GRANT USAGE ON SCHEMA storage TO anon, authenticated, service_role;
CREATE TABLE storage.buckets (id text PRIMARY KEY, name text, public boolean);
CREATE TABLE storage.objects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bucket_id text, name text, owner uuid
);
ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
GRANT ALL ON storage.objects TO anon, authenticated, service_role;
CREATE FUNCTION storage.foldername(name text) RETURNS text[] LANGUAGE sql IMMUTABLE AS $$
  SELECT (string_to_array(name, '/'))[1:array_length(string_to_array(name, '/'), 1) - 1]
$$;

CREATE FUNCTION public.update_updated_at_column() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END $$;

ALTER TABLE public.user_profiles ADD COLUMN email text;
CREATE POLICY company_profiles ON public.user_profiles FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

CREATE TABLE public.projects (id uuid PRIMARY KEY, company_id uuid, name text);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_projects ON public.projects FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));

-- 20250727050851 shape, plus user_id from 20260903020000.
CREATE TABLE public.client_portal_access (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL, project_id uuid NOT NULL, client_email text NOT NULL,
  access_token text NOT NULL UNIQUE DEFAULT gen_random_uuid()::text,
  access_level text NOT NULL DEFAULT 'read_only',
  is_active boolean NOT NULL DEFAULT true, expires_at timestamptz,
  user_id uuid REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  UNIQUE (project_id, client_email)
);
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY staff_manage ON public.client_portal_access FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid())
         AND public.get_user_role(auth.uid()) IN ('admin', 'project_manager', 'root_admin'));

\i supabase/migrations/20250706130335_e51e1aa7-9824-4987-9968-3b4109db6123.sql
\i supabase/migrations/20260830010000_project_communications_company_policies.sql

-- a1 admin, f1 field supervisor, c1/c2/c3 clients, all company A; b1 company B.
INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a1'), ('aaaaaaaa-0000-0000-0000-0000000000f1'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1'), ('aaaaaaaa-0000-0000-0000-0000000000c2'),
  ('aaaaaaaa-0000-0000-0000-0000000000c3'), ('bbbbbbbb-0000-0000-0000-0000000000b1');
INSERT INTO public.companies VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles (id, company_id, role, email) VALUES
  ('aaaaaaaa-0000-0000-0000-0000000000a1', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin', 'a1@a.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000f1', 'aaaaaaaa-0000-0000-0000-000000000000', 'field_supervisor', 'f1@a.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c1', 'aaaaaaaa-0000-0000-0000-000000000000', 'client_portal', 'c1@home.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c2', 'aaaaaaaa-0000-0000-0000-000000000000', 'client_portal', 'C2@Home.test'),
  ('aaaaaaaa-0000-0000-0000-0000000000c3', 'aaaaaaaa-0000-0000-0000-000000000000', 'client_portal', 'c3@home.test'),
  ('bbbbbbbb-0000-0000-0000-0000000000b1', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin', 'b1@b.test');
INSERT INTO public.projects VALUES
  ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-000000000000', 'Maple St');

-- Enrolment that predates this migration: c1 linked by user_id, c2 only by
-- email (older rows), c3 revoked.
INSERT INTO public.client_portal_access (company_id, project_id, client_email, access_level, is_active, user_id) VALUES
  ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000001', 'c1@home.test', 'can_comment', true, 'aaaaaaaa-0000-0000-0000-0000000000c1'),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000001', 'c2@home.test', 'read_only', true, NULL),
  ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000001', 'c3@home.test', 'read_only', false, 'aaaaaaaa-0000-0000-0000-0000000000c3');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

-- Before: the client is enrolled on the portal and still cannot read or post.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.project_messages (project_id, sender_id, sender_type, message_text)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'client', 'hi')
$q$), 'before: an enrolled client cannot post, because nothing wrote a participant row');
ROLLBACK;

\i supabase/migrations/20260923150000_project_conversation_participants.sql

SELECT test_assert(
  (SELECT array_agg(user_id::text || ':' || can_upload_files ORDER BY user_id)
     FROM public.project_communication_participants)
  = ARRAY['aaaaaaaa-0000-0000-0000-0000000000c1:true', 'aaaaaaaa-0000-0000-0000-0000000000c2:false'],
  'backfill enrols active clients (by user_id, or by email for older rows), not revoked ones; uploads follow access_level');

-- An enrolled client reads and posts, with the category/priority the composer sends.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
INSERT INTO public.project_messages (project_id, sender_id, sender_type, message_text, category, priority)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'client', 'When is drywall?', 'question', 'high');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 1, 'an enrolled client can post and read their own project messages');
INSERT INTO storage.objects (bucket_id, name)
VALUES ('project-communications', 'dddddddd-0000-0000-0000-000000000001/aaaaaaaa-0000-0000-0000-0000000000c1/plan.pdf');
SELECT test_assert(true, 'a client with can_upload_files can attach a file');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c2');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO storage.objects (bucket_id, name)
  VALUES ('project-communications', 'dddddddd-0000-0000-0000-000000000001/aaaaaaaa-0000-0000-0000-0000000000c2/x.pdf')
$q$), 'a read_only client cannot attach a file');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 1, 'a read_only client still reads the conversation');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c3');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 0, 'a revoked client sees nothing');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 1, 'staff OR-branch unchanged: admin reads the client message');
RESET ROLE;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-0000000000b1');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 0, 'another company sees nothing');
ROLLBACK;

-- Revoke and restore through client_portal_access, as ProjectClientAccess does.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
UPDATE public.client_portal_access SET is_active = false WHERE client_email = 'c1@home.test';
RESET ROLE;
SELECT test_assert(NOT EXISTS (SELECT 1 FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'), 'revoking portal access removes the client from the conversation');
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000c1');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.project_messages (project_id, sender_id, sender_type, message_text)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000c1', 'client', 'still here?')
$q$), 'a revoked client can no longer post');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
UPDATE public.client_portal_access SET is_active = true WHERE client_email = 'c1@home.test';
RESET ROLE;
SELECT test_assert(EXISTS (SELECT 1 FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1' AND participant_type = 'client'), 'restoring access re-enrols the client');
UPDATE public.client_portal_access SET access_level = 'read_only' WHERE client_email = 'c1@home.test';
SELECT test_assert((SELECT NOT can_upload_files FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'), 'changing access_level re-derives can_upload_files');
DELETE FROM public.client_portal_access WHERE client_email = 'c1@home.test';
SELECT test_assert(NOT EXISTS (SELECT 1 FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c1'), 'deleting the enrolment removes the participant');
ROLLBACK;

-- A new enrolment on any path enrols the client.
BEGIN;
INSERT INTO public.client_portal_access (company_id, project_id, client_email, access_level, user_id)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'dddddddd-0000-0000-0000-000000000001', 'c3b@home.test', 'can_approve', 'aaaaaaaa-0000-0000-0000-0000000000c3');
SELECT test_assert((SELECT can_upload_files FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c3'), 'a new active enrolment creates the participant row');
ROLLBACK;

-- Project managers manage the list, within their own company.
BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
INSERT INTO public.project_communication_participants (project_id, user_id, participant_type)
VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'contractor');
UPDATE public.project_communication_participants SET can_upload_files = true
WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c2';
SELECT test_assert((SELECT count(*) FROM public.project_communication_participants) = 3, 'an admin sees and edits the participant list');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000f1');
SELECT test_assert((SELECT count(*) FROM public.project_messages) = 0 AND NOT pg_temp.denied($q$
  INSERT INTO public.project_messages (project_id, sender_id, sender_type, message_text)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'contractor', 'on it')
$q$), 'an added field supervisor can post through the participant branch');
SELECT test_assert(pg_temp.denied($q$
  DELETE FROM public.project_communication_participants WHERE true;
  INSERT INTO public.project_communication_participants (project_id, user_id, participant_type)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'aaaaaaaa-0000-0000-0000-0000000000f1', 'project_manager')
$q$), 'a participant who is not a manager cannot change the list');
RESET ROLE;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-0000000000a1');
SELECT test_assert(pg_temp.denied($q$
  INSERT INTO public.project_communication_participants (project_id, user_id, participant_type)
  VALUES ('dddddddd-0000-0000-0000-000000000001', 'bbbbbbbb-0000-0000-0000-0000000000b1', 'contractor')
$q$), 'a user from another company cannot be added to the conversation');
ROLLBACK;

-- Deleting a client profile is no longer blocked by their participant row.
BEGIN;
DELETE FROM public.user_profiles WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000c2';
SELECT test_assert(NOT EXISTS (SELECT 1 FROM public.project_communication_participants
  WHERE user_id = 'aaaaaaaa-0000-0000-0000-0000000000c2'), 'deleting a profile cascades to its participant rows');
ROLLBACK;
