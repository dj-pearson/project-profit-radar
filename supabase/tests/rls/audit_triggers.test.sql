-- US-359: project delete, export and role change each leave an audit row.

CREATE TABLE public.audit_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid, user_id uuid, action_type text, resource_type text, resource_id text,
  resource_name text, old_values jsonb, new_values jsonb, ip_address inet, user_agent text,
  session_id text, risk_level text, compliance_category text, description text, metadata jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_read ON public.audit_logs FOR SELECT TO authenticated
  USING (company_id = public.get_user_company(auth.uid()) OR public.get_user_role(auth.uid())::text = 'root_admin');

CREATE TABLE public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid, name text,
  status text, client_name text, budget numeric
);
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_projects ON public.projects FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE TABLE public.export_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(), company_id uuid NOT NULL, template text NOT NULL,
  format text NOT NULL, filters jsonb NOT NULL DEFAULT '{}', row_count integer NOT NULL DEFAULT 0
);
ALTER TABLE public.export_history ENABLE ROW LEVEL SECURITY;
CREATE POLICY company_exports ON public.export_history FOR ALL TO authenticated
  USING (company_id = public.get_user_company(auth.uid()));
CREATE FUNCTION public.log_consent_withdrawal() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN RETURN NEW; END $$;
ALTER TABLE public.user_profiles ADD COLUMN email text;

\i supabase/migrations/20260923020000_lock_privileged_definer_functions.sql
\i supabase/migrations/20260923100000_audit_project_delete_export_role_change.sql

INSERT INTO auth.users VALUES ('aaaaaaaa-0000-0000-0000-00000000000a'), ('aaaaaaaa-0000-0000-0000-0000000000b1'), ('cccccccc-0000-0000-0000-0000000000cc');
INSERT INTO public.companies VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'A'), ('bbbbbbbb-0000-0000-0000-000000000000', 'B');
INSERT INTO public.user_profiles VALUES
  ('aaaaaaaa-0000-0000-0000-00000000000a', 'aaaaaaaa-0000-0000-0000-000000000000', 'admin'),
  ('aaaaaaaa-0000-0000-0000-0000000000b1', 'aaaaaaaa-0000-0000-0000-000000000000', 'office_staff'),
  ('cccccccc-0000-0000-0000-0000000000cc', NULL, 'root_admin');
INSERT INTO public.projects (company_id, name, status, client_name, budget)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'Maple St Remodel', 'active', 'Reyes', 125000);

BEGIN;
SELECT test_act_as('aaaaaaaa-0000-0000-0000-00000000000a');
DELETE FROM public.projects WHERE name = 'Maple St Remodel';
INSERT INTO public.export_history (company_id, template, format, filters, row_count)
VALUES ('aaaaaaaa-0000-0000-0000-000000000000', 'financial', 'csv', '{"from":"2026-01-01"}', 42);
RESET ROLE;
SELECT test_assert(
  (SELECT count(*) FROM public.audit_logs WHERE action_type = 'delete' AND resource_type = 'project'
     AND resource_name = 'Maple St Remodel' AND user_id = 'aaaaaaaa-0000-0000-0000-00000000000a'
     AND company_id = 'aaaaaaaa-0000-0000-0000-000000000000') = 1,
  'deleting a project writes an audit row with actor, company, id and name');
SELECT test_assert(
  (SELECT (metadata ->> 'row_count')::int FROM public.audit_logs WHERE action_type = 'export') = 42
  AND (SELECT metadata -> 'filters' ->> 'from' FROM public.audit_logs WHERE action_type = 'export') = '2026-01-01',
  'an export writes an audit row with template, filters and row count');
ROLLBACK;

-- A role change made with the service role (the only path allowed since US-337).
BEGIN;
UPDATE public.user_profiles SET role = 'project_manager' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000b1';
UPDATE public.user_profiles SET role = 'project_manager' WHERE id = 'aaaaaaaa-0000-0000-0000-0000000000b1';
SELECT test_assert((SELECT count(*) FROM public.audit_logs WHERE resource_type = 'user_profile_privilege') = 1,
  'a role change is audited once, and a no-op update is not');
SELECT test_act_as('cccccccc-0000-0000-0000-0000000000cc');
SELECT test_assert(
  (SELECT old_role || '>' || new_role FROM public.recent_privilege_changes) = 'office_staff>project_manager',
  'root_admin sees old and new role in recent_privilege_changes');
ROLLBACK;
