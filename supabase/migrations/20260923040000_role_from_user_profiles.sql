-- One source of truth for role: user_profiles.role (US-348, release N).
--
-- 20251006204552 created public.user_roles, copied every user's role into it
-- once, and pointed has_role() and get_user_primary_role() at it. Nothing has
-- written to it since, so:
--   - a user created after that migration has no row: has_role() is false for
--     them in every policy that uses it;
--   - a user whose role changed since still has their OLD role there, and
--     AuthContext overrode user_profiles.role with it, so a demoted admin kept
--     admin in the UI;
--   - its "Admins can assign roles" / "Admins can update roles" policies let
--     an admin of ANY company insert or edit ANY row, including a root_admin
--     row for themselves, and has_role(..., 'root_admin') trusted it
--     (disable-mfa uses exactly that check to switch off another user's MFA).
--
-- user_profiles.role is what get_user_role() and every other policy read, and
-- its privilege columns are locked against self-edit (20260910010000). So:
--   1. has_role and get_user_primary_role keep their signatures and read
--      user_profiles. Every policy and caller that uses them follows without
--      being edited.
--   2. The write policies and the cross-company read policy on user_roles are
--      dropped. No client writes or reads it (src/, iOS, edge functions).
--
-- Release N+1 (not here, per the multi-release rule): drop user_roles, and
-- has_role / get_user_primary_role once no shipped client calls them.

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role public.user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT EXISTS (
    SELECT 1
      FROM public.user_profiles
     WHERE id = _user_id
       AND role::text = _role::text
  )
$$;

CREATE OR REPLACE FUNCTION public.get_user_primary_role(_user_id uuid)
RETURNS public.user_role
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path = ''
AS $$
  SELECT role::text::public.user_role
    FROM public.user_profiles
   WHERE id = _user_id
$$;

DO $$
BEGIN
  IF to_regclass('public.user_roles') IS NOT NULL THEN
    DROP POLICY IF EXISTS "Admins can assign roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can update roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Only root admins can delete roles" ON public.user_roles;
    DROP POLICY IF EXISTS "Admins can view all company user roles" ON public.user_roles;
    COMMENT ON TABLE public.user_roles IS
      'DEPRECATED (US-348): frozen copy of roles from 2025-10. Read user_profiles.role. Dropped in a later release.';
  END IF;
END $$;
