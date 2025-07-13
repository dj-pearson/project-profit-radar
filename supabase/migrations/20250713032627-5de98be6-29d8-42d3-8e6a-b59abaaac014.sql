-- Add task categories and enhance task functionality
DO $$ 
BEGIN
  -- Check if task_category type exists and create if it doesn't
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'task_category') THEN
    CREATE TYPE public.task_category AS ENUM (
      'general',
      'permit',
      'estimate',
      'inspection',
      'material_order',
      'labor',
      'safety',
      'quality_control',
      'client_communication',
      'documentation',
      'financial',
      'equipment'
    );
  END IF;
END $$;

-- Add task category column to tasks table if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'category'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN category public.task_category DEFAULT 'general';
  END IF;
END $$;

-- Add priority field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'priority'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent'));
  END IF;
END $$;

-- Add estimated_hours field if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'tasks' AND column_name = 'estimated_hours'
  ) THEN
    ALTER TABLE public.tasks ADD COLUMN estimated_hours NUMERIC DEFAULT 0;
  END IF;
END $$;

-- Create project templates table
CREATE TABLE IF NOT EXISTS public.project_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  industry_type TEXT,
  project_type TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create task templates table
CREATE TABLE IF NOT EXISTS public.task_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_template_id UUID NOT NULL REFERENCES public.project_templates(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category public.task_category DEFAULT 'general',
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  estimated_hours NUMERIC DEFAULT 0,
  due_days_from_start INTEGER DEFAULT 0,
  dependencies TEXT[], -- Array of task template names this depends on
  phase_order INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on new tables
ALTER TABLE public.project_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for project templates
CREATE POLICY "Users can view company project templates" ON public.project_templates
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage project templates" ON public.project_templates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  );

-- Create RLS policies for task templates  
CREATE POLICY "Users can view task templates" ON public.task_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.project_templates pt 
      WHERE pt.id = task_templates.project_template_id 
      AND pt.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Admins can manage task templates" ON public.task_templates
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.project_templates pt 
      WHERE pt.id = task_templates.project_template_id 
      AND pt.company_id = get_user_company(auth.uid())
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
    )
  );

-- Add triggers for updated_at
CREATE OR REPLACE TRIGGER update_project_templates_updated_at
  BEFORE UPDATE ON public.project_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE TRIGGER update_task_templates_updated_at
  BEFORE UPDATE ON public.task_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for better performance
CREATE INDEX IF NOT EXISTS idx_tasks_category ON public.tasks(category);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON public.tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_company_category ON public.tasks(company_id, category);
CREATE INDEX IF NOT EXISTS idx_project_templates_company ON public.project_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_task_templates_project ON public.task_templates(project_template_id);