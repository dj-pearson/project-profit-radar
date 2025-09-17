-- Fix Security Definer View Issue
-- Drop and recreate the project_pl_summary view without SECURITY DEFINER

-- Drop the existing view
DROP VIEW IF EXISTS public.project_pl_summary;

-- Recreate the view without SECURITY DEFINER property
-- This ensures that RLS policies are enforced based on the querying user, not the view creator
CREATE VIEW public.project_pl_summary AS
SELECT 
    id AS project_id,
    name AS project_name,
    company_id,
    budget AS total_budget,
    completion_percentage
FROM projects p;

-- Ensure RLS is enabled on the underlying projects table (should already be enabled)
-- This view will now properly respect the RLS policies of the projects table
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;