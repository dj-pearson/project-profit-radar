-- Audit rows for the actions customers ask about most (US-359).
--
-- CLAUDE.md security rule 4: log critical actions. Three were not logged, or
-- not usefully:
--   - deleting a project: projectService.ts does a direct .delete(), no row;
--   - Export Center exports: export_history records them, audit_logs does not;
--   - a role or company change on user_profiles: log_admin_action records
--     "UPDATE user_profiles" with no old or new value, so nobody can see what
--     changed, and nothing surfaces it.
--
-- Triggers rather than client calls, so every path is covered: the web app,
-- iOS, an edge function, or SQL in the dashboard. Each writes through
-- write_audit_log_internal (20260923020000), which clients cannot call.
-- auth.uid() is the actor; it is NULL for service-role and SQL-console
-- changes, which the row then shows as a system action.

CREATE OR REPLACE FUNCTION public.audit_project_delete()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.write_audit_log_internal(
    OLD.company_id,
    auth.uid(),
    'delete',
    'project',
    OLD.id::text,
    OLD.name,
    jsonb_build_object('name', OLD.name, 'status', OLD.status, 'client_name', OLD.client_name, 'budget', OLD.budget),
    NULL, NULL, NULL, NULL,
    'high',
    'data_retention',
    'Project deleted: ' || COALESCE(OLD.name, OLD.id::text),
    jsonb_build_object('project_id', OLD.id)
  );
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS audit_project_delete ON public.projects;
CREATE TRIGGER audit_project_delete
  AFTER DELETE ON public.projects
  FOR EACH ROW EXECUTE FUNCTION public.audit_project_delete();

CREATE OR REPLACE FUNCTION public.audit_export()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.write_audit_log_internal(
    NEW.company_id,
    auth.uid(),
    'export',
    'export_center',
    NEW.id::text,
    NEW.template,
    NULL, NULL, NULL, NULL, NULL,
    'medium',
    'data_access',
    'Exported ' || COALESCE(NEW.row_count::text, '?') || ' row(s) of ' || COALESCE(NEW.template, 'unknown') || ' as ' || COALESCE(NEW.format, '?'),
    jsonb_build_object('template', NEW.template, 'format', NEW.format, 'filters', NEW.filters, 'row_count', NEW.row_count)
  );
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF to_regclass('public.export_history') IS NOT NULL THEN
    DROP TRIGGER IF EXISTS audit_export ON public.export_history;
    CREATE TRIGGER audit_export
      AFTER INSERT ON public.export_history
      FOR EACH ROW EXECUTE FUNCTION public.audit_export();
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.audit_privilege_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
BEGIN
  PERFORM public.write_audit_log_internal(
    COALESCE(NEW.company_id, OLD.company_id),
    auth.uid(),
    'privilege_change',
    'user_profile_privilege',
    NEW.id::text,
    NEW.email,
    jsonb_build_object('role', OLD.role, 'company_id', OLD.company_id),
    jsonb_build_object('role', NEW.role, 'company_id', NEW.company_id),
    NULL, NULL, NULL,
    'high',
    'access_control',
    'Role or company changed for ' || COALESCE(NEW.email, NEW.id::text)
      || ': ' || COALESCE(OLD.role::text, 'none') || ' -> ' || COALESCE(NEW.role::text, 'none'),
    jsonb_build_object('actor_is_system', auth.uid() IS NULL)
  );
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS audit_privilege_change ON public.user_profiles;
CREATE TRIGGER audit_privilege_change
  AFTER UPDATE OF role, company_id ON public.user_profiles
  FOR EACH ROW
  WHEN (OLD.role IS DISTINCT FROM NEW.role OR OLD.company_id IS DISTINCT FROM NEW.company_id)
  EXECUTE FUNCTION public.audit_privilege_change();

-- What a root admin reviews. security_invoker, so the caller's audit_logs RLS
-- applies: a root admin sees every company, a company admin their own.
CREATE OR REPLACE VIEW public.recent_privilege_changes
WITH (security_invoker = true) AS
SELECT
  a.created_at,
  a.company_id,
  a.user_id AS actor_user_id,
  a.resource_id AS target_user_id,
  a.resource_name AS target_email,
  a.old_values ->> 'role' AS old_role,
  a.new_values ->> 'role' AS new_role,
  a.old_values ->> 'company_id' AS old_company_id,
  a.new_values ->> 'company_id' AS new_company_id,
  COALESCE((a.metadata ->> 'actor_is_system')::boolean, false) AS actor_is_system
FROM public.audit_logs a
WHERE a.resource_type = 'user_profile_privilege'
ORDER BY a.created_at DESC;

REVOKE ALL ON public.recent_privilege_changes FROM anon;
GRANT SELECT ON public.recent_privilege_changes TO authenticated;
