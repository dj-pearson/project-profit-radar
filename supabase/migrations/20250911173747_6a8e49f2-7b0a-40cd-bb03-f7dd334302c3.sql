-- Fix critical security issues: Enable RLS on tables with policies

-- Enable RLS on tasks table (it should already be enabled, but making sure)
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Enable RLS on task_comments table (it should already be enabled, but making sure)  
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Check and enable RLS on any other public tables that might be missing it
-- Look for tables that might have been created without RLS

-- Enable RLS on projects table if not already enabled
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'projects' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Enable RLS on user_profiles table if not already enabled
DO $$ 
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles' 
    AND table_schema = 'public'
  ) THEN
    ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;