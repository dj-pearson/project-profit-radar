
-- Fix Security Definer View issue
-- The view 'project_pl_summary' needs to run with the invoker's permissions, not the definer's
-- This ensures Row Level Security policies are properly enforced

-- Drop and recreate the view with SECURITY INVOKER
DROP VIEW IF EXISTS public.project_pl_summary;

CREATE VIEW public.project_pl_summary
WITH (security_invoker = true)
AS
SELECT 
  id AS project_id,
  name AS project_name,
  company_id,
  budget AS total_budget,
  completion_percentage
FROM public.projects;

-- Grant appropriate permissions
GRANT SELECT ON public.project_pl_summary TO authenticated;
GRANT SELECT ON public.project_pl_summary TO anon;

COMMENT ON VIEW public.project_pl_summary IS 'Project Profit & Loss summary view with security invoker enabled to respect RLS policies';
