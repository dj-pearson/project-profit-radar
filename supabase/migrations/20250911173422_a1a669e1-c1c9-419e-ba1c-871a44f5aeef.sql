-- Fix tasks table schema to match the application code

-- 1. Rename title column to name to match application expectations
ALTER TABLE public.tasks RENAME COLUMN title TO name;

-- 2. Add missing columns that the application expects
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS start_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS end_date DATE;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS completion_percentage NUMERIC DEFAULT 0;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS category TEXT;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS dependencies JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_milestone BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS is_critical_path BOOLEAN DEFAULT false;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS duration_days INTEGER;

-- 3. Add foreign key constraints for the joins used in the application
-- First, ensure the referenced tables exist and add constraints
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- 4. Add foreign key for task_comments table
ALTER TABLE public.task_comments 
  ADD CONSTRAINT task_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;

-- 5. Update the tasks table trigger to use the correct function name
DROP TRIGGER IF EXISTS update_tasks_updated_at ON public.tasks;
CREATE TRIGGER update_tasks_updated_at
  BEFORE UPDATE ON public.tasks
  FOR EACH ROW
  EXECUTE FUNCTION public.update_tasks_updated_at();

-- 6. Update task_comments trigger to use the existing function
DROP TRIGGER IF EXISTS update_task_comments_updated_at ON public.task_comments;
CREATE TRIGGER update_task_comments_updated_at
  BEFORE UPDATE ON public.task_comments
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();