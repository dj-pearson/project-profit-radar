-- US-348: has_role and get_user_primary_role read user_profiles, and
-- user_roles can no longer be written by company admins.

CREATE TABLE public.user_roles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id),
  role public.user_role NOT NULL,
  UNIQUE (user_id, role)
);
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- 20251006204552, verbatim in substance.
CREATE FUNCTION public.has_role(_user_id uuid, _role public.user_role) RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role) $$;
CREATE FUNCTION public.get_user_primary_role(_user_id uuid) RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public
AS $$ SELECT role FROM public.user_roles WHERE user_id = _user_id ORDER BY role LIMIT 1 $$;
CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT TO authenticated USING (user_id = auth.uid());
CREATE POLICY "Admins can view all company user roles" ON public.user_roles FOR SELECT TO authenticated
  USING (public.has_role(auth.uid(), 'root_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can assign roles" ON public.user_roles FOR INSERT TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'root_admin') OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update roles" ON public.user_roles FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(), 'root_admin') OR public.has_role(auth.uid(), 'admin'));

INSERT INTO auth.users VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a'), ('bbbbbbbb-0000-0000-0000-00000000000b'), ('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO public.companies VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  -- demoted since the 2025-10 copy
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  -- an admin of company B
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'bbbbbbbb-0000-0000-0000-000000000000', 'admin'),
  -- created after the copy, so no user_roles row
  ('cccccccc-0000-0000-0000-0000000000cc', 'aaaaaaaa-0000-0000-0000-000000000000', 'project_manager');
INSERT INTO public.user_roles (user_id, role) VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'admin'),
  ('bbbbbbbb-0000-0000-0000-00000000000b', 'admin');

-- Before: the stale copy wins, and an admin can make themselves root_admin.
SELECT test_assert(public.has_role('aaaaaaaa-0000-0000-0000-00000000000a', 'admin'), 'before: a demoted user still has admin via user_roles');
SELECT test_assert(NOT public.has_role('cccccccc-0000-0000-0000-0000000000cc', 'project_manager'), 'before: a newer user has no role at all');
BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
INSERT INTO public.user_roles (user_id, role) VALUES ('bbbbbbbb-0000-0000-0000-00000000000b', 'root_admin');
SELECT test_assert(public.has_role('bbbbbbbb-0000-0000-0000-00000000000b', 'root_admin'), 'before: a company admin can grant themselves root_admin');
ROLLBACK;

\i supabase/migrations/20260923040000_role_from_user_profiles.sql

SELECT test_assert(NOT public.has_role('aaaaaaaa-0000-0000-0000-00000000000a', 'admin'), 'after: the demoted user is not admin');
SELECT test_assert(public.has_role('aaaaaaaa-0000-0000-0000-00000000000a', 'office_staff'), 'after: the demoted user has their current role');
SELECT test_assert(public.has_role('cccccccc-0000-0000-0000-0000000000cc', 'project_manager'), 'after: a newer user has their role');
SELECT test_assert(public.get_user_primary_role('aaaaaaaa-0000-0000-0000-00000000000a') = 'office_staff', 'after: get_user_primary_role reads user_profiles');

CREATE FUNCTION pg_temp.denied(sql text) RETURNS boolean LANGUAGE plpgsql AS $$
BEGIN
  EXECUTE sql;
  RETURN false;
EXCEPTION WHEN insufficient_privilege THEN
  RETURN true;
END $$;

BEGIN;
SELECT test_act_as('bbbbbbbb-0000-0000-0000-00000000000b');
SELECT test_assert(pg_temp.denied($$INSERT INTO public.user_roles (user_id, role) VALUES ('bbbbbbbb-0000-0000-0000-00000000000b', 'root_admin')$$),
  'after: a company admin cannot write user_roles');
SELECT test_assert(NOT public.has_role('bbbbbbbb-0000-0000-0000-00000000000b', 'root_admin'), 'after: and has_role would not trust it anyway');
SELECT test_assert((SELECT count(*) FROM public.user_roles) = 1, 'after: an admin reads only their own user_roles row');
ROLLBACK;
