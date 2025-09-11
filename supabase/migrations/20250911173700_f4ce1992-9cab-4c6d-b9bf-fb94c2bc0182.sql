-- Add missing foreign key constraints (skip if they exist)

-- Add assigned_to foreign key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_assigned_to_fkey' 
    AND table_name = 'tasks'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_assigned_to_fkey 
      FOREIGN KEY (assigned_to) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add created_by foreign key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'tasks_created_by_fkey' 
    AND table_name = 'tasks'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.tasks 
      ADD CONSTRAINT tasks_created_by_fkey 
      FOREIGN KEY (created_by) REFERENCES public.user_profiles(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Add task_comments user_id foreign key if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'task_comments_user_id_fkey' 
    AND table_name = 'task_comments'
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.task_comments 
      ADD CONSTRAINT task_comments_user_id_fkey 
      FOREIGN KEY (user_id) REFERENCES public.user_profiles(id) ON DELETE CASCADE;
  END IF;
END $$;