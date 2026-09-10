-- Only the server may change user_profiles.role or .company_id (US-337).
--
-- The UPDATE policies on user_profiles restrict the ROW and never the COLUMNS:
--
--   20260128000001_defense_in_depth_rls.sql:633   user_profiles_update
--                                                 USING (id = auth.uid() OR ...)
--   20260209100000_bootstrap_foundational_schema.sql:681
--                                                 bootstrap_user_profiles_update_own
--                                                 USING (id = auth.uid())
--
-- Neither has a WITH CHECK, so Postgres reuses USING for the new row - which
-- pins `id` and nothing else. role and company_id appear in no policy
-- expression, so:
--
--   PATCH /rest/v1/user_profiles?id=eq.<me>
--   {"role": "root_admin", "company_id": "<any company>"}
--
-- succeeds for any signed-in user. That is total compromise, not a privilege
-- nudge: every RLS policy in the schema resolves authority through
-- get_user_role(), which reads this column, as do user_is_root_admin() and
-- isRootAdmin() in supabase/functions/_shared/auth-helpers.ts. Setting
-- company_id moves the account into a victim workspace; setting role to
-- root_admin also fires grant_root_admin_complimentary, which hands out a paid
-- subscription.
--
-- A BEFORE UPDATE trigger rather than column privileges. REVOKE UPDATE (role)
-- does not do what it reads like when UPDATE was granted table-wide: the
-- table-level grant still covers every column, so closing this with grants
-- means REVOKE UPDATE on the table and then GRANT UPDATE on an explicit list of
-- the other columns. That list silently omits every column added afterwards,
-- and the failure is a write that stops working for a reason nobody connects to
-- this file. The trigger covers columns that do not exist yet.
--
-- WHO CAN STILL WRITE THESE COLUMNS: anything not carrying an end-user JWT.
-- Migrations and psql sessions have no request.jwt.claims at all; edge
-- functions that legitimately assign role and company_id - create-root-admin,
-- signup-with-otp, verify-auth-otp, invite-team-member - use the service-role
-- key. Verified nothing in src/ writes either column with a user JWT: profile
-- edits touch first_name/last_name/phone/avatar_url, admin screens toggle
-- is_active (deliberately still allowed, it is the deactivate button and RLS
-- already limits it to company admins), and role assignment goes through
-- invite-team-member.
--
-- This is a tightening, which CLAUDE.md normally requires be split across
-- releases. It is shipped in one because no client at any supported version
-- writes these columns - the iOS app never references them either - so there is
-- no older caller to strand, and the alternative is leaving a total-compromise
-- path open for a release cycle.

CREATE OR REPLACE FUNCTION public.prevent_privilege_column_self_service()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  claims text;
  jwt_role text;
BEGIN
  IF NEW.role IS NOT DISTINCT FROM OLD.role
     AND NEW.company_id IS NOT DISTINCT FROM OLD.company_id THEN
    RETURN NEW;
  END IF;

  claims := current_setting('request.jwt.claims', true);

  -- No JWT: a migration, a psql session, or a backend connection that is not
  -- PostgREST. Not reachable by an end user.
  IF claims IS NULL OR claims = '' THEN
    RETURN NEW;
  END IF;

  jwt_role := claims::jsonb ->> 'role';

  -- The service-role key. Edge functions assigning role and company_id use it.
  IF jwt_role = 'service_role' THEN
    RETURN NEW;
  END IF;

  RAISE EXCEPTION
    'user_profiles.role and user_profiles.company_id cannot be changed with a user token (attempted on profile %). Use an edge function running under the service role.',
    NEW.id
    USING ERRCODE = 'insufficient_privilege';
END;
$$;

COMMENT ON FUNCTION public.prevent_privilege_column_self_service() IS
  'US-337. The user_profiles UPDATE policies gate the row and not the columns, so any signed-in user could PATCH their own role to root_admin or move themselves into another company. Rejects a change to role or company_id from any caller holding an end-user JWT.';

DROP TRIGGER IF EXISTS prevent_privilege_column_self_service ON public.user_profiles;

CREATE TRIGGER prevent_privilege_column_self_service
  BEFORE UPDATE ON public.user_profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.prevent_privilege_column_self_service();
