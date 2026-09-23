-- Client project messaging: keep the participant table in step with portal
-- enrolment, and fix the two things that stopped an enrolled client posting
-- (US-316).
--
-- project_messages and the project-communications bucket have keyed their
-- participant branch on project_communication_participants since
-- 20250706130335. Until US-319 nothing wrote that table. invite-client now
-- upserts the client's row, but only on the invite path, and only best-effort
-- (a failure is logged, not returned). Three gaps are left, and this closes
-- them in the database so every path is covered:
--
--   1. Revoking portal access (ProjectClientAccess sets is_active = false)
--      left the participant row behind, so a revoked client could still read
--      and post project messages. Restoring access did not re-add it either.
--   2. Clients enrolled before invite-client wrote the row, or whose
--      participant upsert failed, have portal access and no conversation.
--   3. ClientMessageCenter inserts category and priority, which project_messages
--      never had. PostgREST refuses an insert naming an unknown column, so the
--      client composer could not have posted even with a participant row.
--
-- And one nuisance: project_messages is not in the supabase_realtime
-- publication, so neither side saw a new message until they reloaded.
--
-- Everything here is additive. The staff OR-branches on project_messages and
-- storage are left exactly as they are (removing them would tighten RLS in one
-- release). No policy is created, dropped or narrowed.

-- ---------------------------------------------------------------------------
-- 1. The columns the client composer already sends
-- ---------------------------------------------------------------------------
-- Nullable, so every existing row and every older client is unaffected; the
-- CHECKs hold trivially for the NULLs already there.
ALTER TABLE public.project_messages
  ADD COLUMN IF NOT EXISTS category text,
  ADD COLUMN IF NOT EXISTS priority text;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_messages_category_check') THEN
    ALTER TABLE public.project_messages
      ADD CONSTRAINT project_messages_category_check
      CHECK (category IS NULL OR category IN ('general', 'question', 'update', 'approval', 'concern'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'project_messages_priority_check') THEN
    ALTER TABLE public.project_messages
      ADD CONSTRAINT project_messages_priority_check
      CHECK (priority IS NULL OR priority IN ('normal', 'high', 'urgent'));
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 2. A participant must belong to the project's company
-- ---------------------------------------------------------------------------
-- The "Project managers can manage participants" policy checks the PROJECT's
-- company, not the enrolled user's, so a PM could put any user id in the
-- table and hand a stranger this company's messages and files. Client portal
-- users carry the contractor's company_id (invite-client sets it and refuses
-- an address that belongs to another tenant), so a legitimate row always
-- passes. The only writer today already obeys this.
CREATE OR REPLACE FUNCTION public.enforce_conversation_participant_company()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.projects p
    JOIN public.user_profiles up ON up.id = NEW.user_id
    WHERE p.id = NEW.project_id
      AND up.company_id = p.company_id
  ) THEN
    RAISE EXCEPTION 'A conversation participant must belong to the project''s company'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_conversation_participant_company() FROM PUBLIC;

DROP TRIGGER IF EXISTS enforce_conversation_participant_company ON public.project_communication_participants;
CREATE TRIGGER enforce_conversation_participant_company
  BEFORE INSERT OR UPDATE OF project_id, user_id ON public.project_communication_participants
  FOR EACH ROW EXECUTE FUNCTION public.enforce_conversation_participant_company();

-- ---------------------------------------------------------------------------
-- 3. Portal enrolment drives the client's participant row
-- ---------------------------------------------------------------------------
-- Active enrolment with a linked user => a 'client' participant row. Revoked or
-- deleted => the row goes, unless another active enrolment for the same user
-- and project still stands. can_upload_files follows access_level, the same
-- rule invite-client uses, and is re-derived only when access_level changes so
-- a PM's manual toggle survives unrelated updates.
--
-- access_level is read through to_jsonb because the table has two historical
-- shapes in this repo's migrations (20250202000023 vs 20250727050851); the
-- function must not fail to compile on the older one.
--
-- SECURITY DEFINER: the revoking user is a PM acting through
-- client_portal_access's own policy; the participant write must not depend on
-- that user also passing the participant table's policy.
CREATE OR REPLACE FUNCTION public.sync_client_conversation_participant()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_old jsonb := CASE WHEN TG_OP IN ('UPDATE', 'DELETE') THEN to_jsonb(OLD) END;
  v_new jsonb := CASE WHEN TG_OP IN ('INSERT', 'UPDATE') THEN to_jsonb(NEW) END;
  v_old_live boolean;
  v_new_live boolean;
  v_can_upload boolean;
BEGIN
  v_old_live := v_old IS NOT NULL
    AND (v_old ->> 'is_active')::boolean IS TRUE
    AND (v_old ->> 'user_id') IS NOT NULL
    AND (v_old ->> 'project_id') IS NOT NULL;
  v_new_live := v_new IS NOT NULL
    AND (v_new ->> 'is_active')::boolean IS TRUE
    AND (v_new ->> 'user_id') IS NOT NULL
    AND (v_new ->> 'project_id') IS NOT NULL;

  -- Remove the old pairing when it stops being live or points elsewhere.
  IF v_old_live AND (
       NOT v_new_live
       OR (v_new ->> 'user_id') IS DISTINCT FROM (v_old ->> 'user_id')
       OR (v_new ->> 'project_id') IS DISTINCT FROM (v_old ->> 'project_id')
     )
  THEN
    DELETE FROM public.project_communication_participants pcp
    WHERE pcp.project_id = (v_old ->> 'project_id')::uuid
      AND pcp.user_id = (v_old ->> 'user_id')::uuid
      AND pcp.participant_type = 'client'
      AND NOT EXISTS (
        SELECT 1 FROM public.client_portal_access a
        WHERE a.project_id = pcp.project_id
          AND a.user_id = pcp.user_id
          AND a.is_active = true
          AND a.id <> (v_old ->> 'id')::uuid
      );
  END IF;

  IF v_new_live THEN
    v_can_upload := coalesce(v_new ->> 'access_level', 'read_only') <> 'read_only';

    INSERT INTO public.project_communication_participants
      (project_id, user_id, participant_type, can_upload_files)
    SELECT (v_new ->> 'project_id')::uuid, (v_new ->> 'user_id')::uuid, 'client', v_can_upload
    -- Skip silently rather than abort the enrolment if the user is in another
    -- company; the participant guard above would raise otherwise. invite-client
    -- already refuses that case before it gets here.
    WHERE EXISTS (
      SELECT 1 FROM public.projects p
      JOIN public.user_profiles up ON up.id = (v_new ->> 'user_id')::uuid
      WHERE p.id = (v_new ->> 'project_id')::uuid
        AND up.company_id = p.company_id
    )
    ON CONFLICT (project_id, user_id) DO NOTHING;

    IF TG_OP = 'UPDATE' AND v_old_live
       AND (v_new ->> 'access_level') IS DISTINCT FROM (v_old ->> 'access_level')
    THEN
      UPDATE public.project_communication_participants
         SET can_upload_files = v_can_upload
       WHERE project_id = (v_new ->> 'project_id')::uuid
         AND user_id = (v_new ->> 'user_id')::uuid
         AND participant_type = 'client';
    END IF;
  END IF;

  RETURN NULL;
END;
$$;

REVOKE ALL ON FUNCTION public.sync_client_conversation_participant() FROM PUBLIC;

COMMENT ON FUNCTION public.sync_client_conversation_participant() IS
  'US-316. Keeps the client''s project_communication_participants row in step with client_portal_access: added while enrolment is active, removed when it is revoked or deleted.';

DROP TRIGGER IF EXISTS sync_client_conversation_participant ON public.client_portal_access;
CREATE TRIGGER sync_client_conversation_participant
  AFTER INSERT OR UPDATE OR DELETE ON public.client_portal_access
  FOR EACH ROW EXECUTE FUNCTION public.sync_client_conversation_participant();

-- ---------------------------------------------------------------------------
-- 3b. A deleted profile takes its participant rows with it
-- ---------------------------------------------------------------------------
-- The original FK has no ON DELETE action. While the table was empty that
-- never mattered; now that every enrolled client has a row, it would block
-- deleting that client's profile. Loosening only: deletes that used to fail
-- now succeed, nothing that succeeded now fails.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'project_communication_participants_user_id_fkey'
      AND confdeltype <> 'c'
  ) THEN
    ALTER TABLE public.project_communication_participants
      DROP CONSTRAINT project_communication_participants_user_id_fkey;
    ALTER TABLE public.project_communication_participants
      ADD CONSTRAINT project_communication_participants_user_id_fkey
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 4. Backfill: every client with live enrolment gets their conversation
-- ---------------------------------------------------------------------------
-- Rows enrolled before user_id existed are matched by email to a client_portal
-- profile, the same fallback client_has_project_access() uses. Only same-company
-- users, so the guard in section 2 cannot abort the migration.
INSERT INTO public.project_communication_participants
  (project_id, user_id, participant_type, can_upload_files)
SELECT DISTINCT ON (a.project_id, up.id)
  a.project_id,
  up.id,
  'client',
  coalesce(to_jsonb(a) ->> 'access_level', 'read_only') <> 'read_only'
FROM public.client_portal_access a
JOIN public.projects p ON p.id = a.project_id
JOIN public.user_profiles up
  ON up.id = a.user_id
  OR (a.user_id IS NULL
      AND up.role = 'client_portal'
      AND lower(to_jsonb(up) ->> 'email') = lower(a.client_email))
WHERE a.is_active = true
  AND (a.expires_at IS NULL OR a.expires_at > now())
  AND up.company_id = p.company_id
ORDER BY a.project_id, up.id
ON CONFLICT (project_id, user_id) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 5. Deliver new messages live
-- ---------------------------------------------------------------------------
-- Both ClientMessageCenter and ProjectCommunication subscribe to INSERTs on
-- this table; without publication membership the subscription never fires.
-- Realtime applies the table's RLS to each subscriber, so this exposes nothing
-- a SELECT would not.
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'project_messages'
     )
  THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.project_messages;
  END IF;
END $$;
