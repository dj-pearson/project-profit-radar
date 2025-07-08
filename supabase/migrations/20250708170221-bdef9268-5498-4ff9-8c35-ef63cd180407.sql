-- Create function to calculate project completion percentage based on tasks
CREATE OR REPLACE FUNCTION public.calculate_project_completion(p_project_id uuid)
RETURNS numeric
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  task_avg numeric := 0;
  task_count integer := 0;
BEGIN
  -- Calculate average completion percentage of all tasks for the project
  SELECT 
    COALESCE(AVG(completion_percentage), 0),
    COUNT(*)
  INTO task_avg, task_count
  FROM public.tasks 
  WHERE project_id = p_project_id;
  
  -- If no tasks exist, return 0
  IF task_count = 0 THEN
    RETURN 0;
  END IF;
  
  -- Return the average completion percentage, rounded to 1 decimal place
  RETURN ROUND(task_avg, 1);
END;
$$;

-- Create function to update project completion percentage
CREATE OR REPLACE FUNCTION public.update_project_completion()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  target_project_id uuid;
  new_completion numeric;
BEGIN
  -- Determine which project to update based on the operation
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;
  
  -- Calculate new completion percentage
  SELECT public.calculate_project_completion(target_project_id)
  INTO new_completion;
  
  -- Update the project's completion percentage
  UPDATE public.projects 
  SET 
    completion_percentage = new_completion,
    updated_at = now()
  WHERE id = target_project_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$;

-- Create trigger to automatically update project completion when tasks change
DROP TRIGGER IF EXISTS trigger_update_project_completion ON public.tasks;
CREATE TRIGGER trigger_update_project_completion
  AFTER INSERT OR UPDATE OR DELETE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_project_completion();

-- Update all existing projects to have correct completion percentages
UPDATE public.projects 
SET completion_percentage = public.calculate_project_completion(id)
WHERE id IN (SELECT DISTINCT project_id FROM public.tasks);