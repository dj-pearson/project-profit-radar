-- Add missing foreign key constraints for tasks table joins

-- Add foreign key constraints for the joins used in the application
ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_project_id_fkey 
  FOREIGN KEY (project_id) REFERENCES public.projects(id) ON DELETE CASCADE;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_assigned_to_fkey 
  FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

ALTER TABLE public.tasks 
  ADD CONSTRAINT tasks_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;

-- Add foreign key for task_comments table
ALTER TABLE public.task_comments 
  ADD CONSTRAINT task_comments_user_id_fkey 
  FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;