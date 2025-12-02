-- Add missing roles to the user_role enum
ALTER TYPE user_role ADD VALUE 'technician';
ALTER TYPE user_role ADD VALUE 'foreman';
ALTER TYPE user_role ADD VALUE 'superintendent';
ALTER TYPE user_role ADD VALUE 'estimator';
ALTER TYPE user_role ADD VALUE 'safety_officer';
ALTER TYPE user_role ADD VALUE 'quality_inspector';
ALTER TYPE user_role ADD VALUE 'equipment_operator';
ALTER TYPE user_role ADD VALUE 'journeyman';
ALTER TYPE user_role ADD VALUE 'apprentice';
ALTER TYPE user_role ADD VALUE 'laborer';

-- Create a function to get role hierarchy and permissions
CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role user_role)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
AS $$
BEGIN
  RETURN CASE p_role
    WHEN 'root_admin' THEN '{"level": 10, "can_manage_all": true, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'admin' THEN '{"level": 9, "can_manage_all": false, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'superintendent' THEN '{"level": 8, "can_manage_all": false, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'project_manager' THEN '{"level": 7, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": true, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'estimator' THEN '{"level": 6, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'accounting' THEN '{"level": 6, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'safety_officer' THEN '{"level": 5, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'quality_inspector' THEN '{"level": 5, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'foreman' THEN '{"level": 4, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'field_supervisor' THEN '{"level": 4, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'technician' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'equipment_operator' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'journeyman' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'office_staff' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": true}'::jsonb
    WHEN 'apprentice' THEN '{"level": 2, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'laborer' THEN '{"level": 1, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'client_portal' THEN '{"level": 0, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    ELSE '{"level": 0, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
  END;
END;
$$;