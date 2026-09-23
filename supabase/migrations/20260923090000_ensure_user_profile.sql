-- A signed-in user with no user_profiles row gets one, not a sign-out (US-357).
--
-- AuthContext treated zero profile rows as "account deleted", signed the user
-- out and told them to sign up again. That is exactly what an SSO or OAuth user
-- hits when handle_new_user fails for them, and what anyone hits after a
-- partial signup: an auth user with no profile, locked out with no way back.
--
-- ensure_user_profile() creates the minimal row handle_new_user would have
-- created, for the CALLER only (auth.uid(), never a parameter), with no company,
-- so the app sends them to /setup. It returns the caller's profile either way.
-- The role is 'admin' of no company, the same as a self-signup: it grants
-- nothing until /setup creates a company for them.
--
-- Also here, because it is the same trigger: handle_new_user took the profile
-- role from raw_user_meta_data, which the person signing up controls
-- (supabase.auth.signUp({ options: { data: { role: 'root_admin' } } })). The
-- UPDATE trigger from 20260910010000 stops a later self-edit, but not the
-- INSERT this trigger does. Nothing legitimate needs it: invite-team-member and
-- create-root-admin set role with the service role after creating the user, and
-- signup-with-otp inserts the profile itself. The role now comes from
-- raw_app_meta_data (server-set only) or defaults to 'admin'. Its error path
-- still RAISEs a WARNING into the Postgres log and does not block the auth
-- insert; ensure_user_profile is the recovery for that case.

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE((NEW.raw_app_meta_data ->> 'role')::public.user_role, 'admin'::public.user_role)
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Never block the auth insert; AuthContext recovers through
    -- ensure_user_profile(). The warning is what an operator greps for.
    RAISE WARNING 'handle_new_user: no profile created for user %: % (SQLSTATE %)', NEW.id, SQLERRM, SQLSTATE;
    RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.ensure_user_profile()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_uid uuid := auth.uid();
  v_user record;
  v_profile jsonb;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'ensure_user_profile: not signed in' USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT id, email, raw_user_meta_data INTO v_user FROM auth.users WHERE id = v_uid;
  IF NOT FOUND THEN
    -- The token outlived its user. The caller should sign out.
    RAISE EXCEPTION 'ensure_user_profile: auth user % no longer exists', v_uid USING ERRCODE = 'no_data_found';
  END IF;

  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    v_uid,
    v_user.email,
    COALESCE(v_user.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(v_user.raw_user_meta_data ->> 'last_name', ''),
    'admin'::public.user_role
  )
  ON CONFLICT (id) DO NOTHING;

  SELECT jsonb_build_object(
    'id', p.id, 'email', p.email, 'first_name', p.first_name, 'last_name', p.last_name,
    'phone', p.phone, 'company_id', p.company_id, 'role', p.role, 'is_active', p.is_active
  ) INTO v_profile
  FROM public.user_profiles p WHERE p.id = v_uid;

  RETURN v_profile;
END;
$$;

REVOKE ALL ON FUNCTION public.ensure_user_profile() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.ensure_user_profile() TO authenticated, service_role;
