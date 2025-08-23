-- Add missing columns to tasks table for Gantt chart functionality
ALTER TABLE public.tasks 
ADD COLUMN IF NOT EXISTS start_date date,
ADD COLUMN IF NOT EXISTS end_date date,
ADD COLUMN IF NOT EXISTS duration_days integer DEFAULT 1,
ADD COLUMN IF NOT EXISTS is_milestone boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS milestone_type text,
ADD COLUMN IF NOT EXISTS is_critical_path boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS resource_requirements jsonb DEFAULT '[]'::jsonb;

-- Create task dependencies table with proper relationship types
CREATE TABLE IF NOT EXISTS public.task_dependencies (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.user_profiles(company_id),
  predecessor_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  successor_task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  dependency_type text NOT NULL DEFAULT 'finish_to_start' CHECK (dependency_type IN ('finish_to_start', 'start_to_start', 'finish_to_finish', 'start_to_finish')),
  lag_days integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  UNIQUE(predecessor_task_id, successor_task_id)
);

-- Create project milestones table
CREATE TABLE IF NOT EXISTS public.project_milestones (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.user_profiles(company_id),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  target_date date NOT NULL,
  actual_date date,
  milestone_type text DEFAULT 'project' CHECK (milestone_type IN ('project', 'phase', 'delivery', 'payment', 'approval')),
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'achieved', 'missed', 'cancelled')),
  is_critical boolean DEFAULT false,
  created_by uuid REFERENCES public.user_profiles(id),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Create resource allocations table
CREATE TABLE IF NOT EXISTS public.task_resource_allocations (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL REFERENCES public.user_profiles(company_id),
  task_id uuid NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  resource_type text NOT NULL CHECK (resource_type IN ('crew_member', 'equipment', 'material')),
  resource_id uuid,
  resource_name text NOT NULL,
  allocation_percentage numeric(5,2) DEFAULT 100.00,
  start_date date,
  end_date date,
  cost_per_unit numeric(10,2),
  total_units numeric(10,2),
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now()
);

-- Enable RLS policies
ALTER TABLE public.task_dependencies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_milestones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_resource_allocations ENABLE ROW LEVEL SECURITY;

-- RLS policies for task_dependencies
CREATE POLICY "Users can view company task dependencies" ON public.task_dependencies
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage task dependencies" ON public.task_dependencies
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'superintendent', 'root_admin']::user_role[])
  );

-- RLS policies for project_milestones
CREATE POLICY "Users can view company milestones" ON public.project_milestones
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage milestones" ON public.project_milestones
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'superintendent', 'root_admin']::user_role[])
  );

-- RLS policies for task_resource_allocations
CREATE POLICY "Users can view company task resources" ON public.task_resource_allocations
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage task resources" ON public.task_resource_allocations
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'superintendent', 'foreman', 'field_supervisor', 'root_admin']::user_role[])
  );

-- Add triggers for updated_at
CREATE TRIGGER update_task_dependencies_updated_at
  BEFORE UPDATE ON public.task_dependencies
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_milestones_updated_at
  BEFORE UPDATE ON public.project_milestones
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_task_resource_allocations_updated_at
  BEFORE UPDATE ON public.task_resource_allocations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to calculate critical path
CREATE OR REPLACE FUNCTION public.calculate_critical_path(p_project_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  critical_tasks jsonb := '[]'::jsonb;
  task_record RECORD;
  project_end_date date;
BEGIN
  -- This is a simplified critical path calculation
  -- In a real implementation, this would use more sophisticated algorithms
  
  -- Get project end date
  SELECT end_date INTO project_end_date FROM public.projects WHERE id = p_project_id;
  
  -- Mark tasks as critical if they have no slack time
  -- Simplified logic: tasks that are on the longest path
  FOR task_record IN 
    SELECT t.id, t.name, t.start_date, t.end_date, t.duration_days
    FROM public.tasks t
    WHERE t.project_id = p_project_id
    AND t.end_date IS NOT NULL
    ORDER BY t.end_date DESC
  LOOP
    critical_tasks := critical_tasks || jsonb_build_object(
      'task_id', task_record.id,
      'name', task_record.name,
      'start_date', task_record.start_date,
      'end_date', task_record.end_date,
      'duration', task_record.duration_days
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'critical_path', critical_tasks,
    'project_duration', EXTRACT(days FROM (project_end_date - (SELECT MIN(start_date) FROM tasks WHERE project_id = p_project_id))),
    'calculated_at', now()
  );
END;
$$;