-- Minimal Supabase shims for RLS tests against a throwaway Postgres (US-343, US-394).
--
-- Only what policies reference: the three API roles, auth.uid() reading the
-- JWT sub the way PostgREST sets it, user_profiles, and the two helper
-- functions every company-scoped policy calls. The helpers are copied from
-- 20260209100000_bootstrap_foundational_schema.sql (get_user_company) and the
-- later get_user_role rewrite; keep them in step if those change.

-- Roles are cluster-wide and every test file gets its own database in the
-- same cluster, so create them once.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
END $$;

CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY);
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$
  SELECT nullif(current_setting('request.jwt.claim.sub', true), '')::uuid
$$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;

CREATE TYPE public.user_role AS ENUM (
  'root_admin', 'admin', 'project_manager', 'field_supervisor', 'office_staff', 'accounting', 'client_portal'
);

CREATE TABLE public.companies (id uuid PRIMARY KEY, name text);
CREATE TABLE public.user_profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id),
  company_id uuid REFERENCES public.companies(id),
  role public.user_role NOT NULL DEFAULT 'office_staff'
);

-- Policies that subquery user_profiles run as the caller. Production lets a
-- user read at least their own row; mirror that much.
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
GRANT SELECT ON public.user_profiles TO authenticated;
CREATE POLICY own_profile ON public.user_profiles FOR SELECT TO authenticated USING (id = auth.uid());

CREATE FUNCTION public.get_user_company(user_id uuid) RETURNS uuid
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT company_id FROM public.user_profiles WHERE id = user_id;
$$;

CREATE FUNCTION public.get_user_role(user_id uuid) RETURNS public.user_role
LANGUAGE sql STABLE SECURITY DEFINER AS $$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$$;

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO anon, authenticated, service_role;

-- Act as a user for the rest of the transaction, the way PostgREST does.
CREATE FUNCTION public.test_act_as(uid uuid) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claim.sub', coalesce(uid::text, ''), true);
  EXECUTE 'SET LOCAL ROLE ' || CASE WHEN uid IS NULL THEN 'anon' ELSE 'authenticated' END;
END $$;

-- Fail the file with a readable message.
CREATE FUNCTION public.test_assert(ok boolean, msg text) RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  IF ok IS NOT TRUE THEN RAISE EXCEPTION 'ASSERTION FAILED: %', msg; END IF;
  RAISE NOTICE 'ok - %', msg;
END $$;
