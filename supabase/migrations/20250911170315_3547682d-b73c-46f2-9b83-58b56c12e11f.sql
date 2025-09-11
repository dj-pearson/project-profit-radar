-- Create tasks table for user task management
CREATE TABLE public.tasks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NULL,
  assigned_to UUID NOT NULL,
  created_by UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  due_date DATE NULL,
  completed_at TIMESTAMP WITH TIME ZONE NULL,
  completed_by UUID NULL,
  tags JSONB DEFAULT '[]'::jsonb,
  attachments JSONB DEFAULT '[]'::jsonb,
  estimated_hours NUMERIC NULL,
  actual_hours NUMERIC NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

-- Create policies for tasks
CREATE POLICY "Users can view company tasks" 
ON public.tasks 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can create tasks" 
ON public.tasks 
FOR INSERT 
WITH CHECK (
  company_id = get_user_company(auth.uid()) AND 
  created_by = auth.uid()
);

CREATE POLICY "Users can update tasks they created or are assigned to" 
ON public.tasks 
FOR UPDATE 
USING (
  company_id = get_user_company(auth.uid()) AND 
  (created_by = auth.uid() OR assigned_to = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]))
);

CREATE POLICY "Users can delete tasks they created" 
ON public.tasks 
FOR DELETE 
USING (
  company_id = get_user_company(auth.uid()) AND 
  (created_by = auth.uid() OR get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role]))
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  
  -- If status is being changed to completed, set completed_at and completed_by
  IF NEW.status = 'completed' AND OLD.status != 'completed' THEN
    NEW.completed_at = now();
    NEW.completed_by = auth.uid();
  END IF;
  
  -- If status is being changed from completed to something else, clear completion fields
  IF NEW.status != 'completed' AND OLD.status = 'completed' THEN
    NEW.completed_at = NULL;
    NEW.completed_by = NULL;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON public.tasks
FOR EACH ROW
EXECUTE FUNCTION public.update_tasks_updated_at();

-- Create indexes for better performance
CREATE INDEX idx_tasks_company_id ON public.tasks(company_id);
CREATE INDEX idx_tasks_assigned_to ON public.tasks(assigned_to);
CREATE INDEX idx_tasks_project_id ON public.tasks(project_id);
CREATE INDEX idx_tasks_status ON public.tasks(status);
CREATE INDEX idx_tasks_due_date ON public.tasks(due_date);
CREATE INDEX idx_tasks_created_at ON public.tasks(created_at);

-- Create task comments table for task discussions
CREATE TABLE public.task_comments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  comment TEXT NOT NULL,
  attachments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for task comments
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;

-- Create policies for task comments
CREATE POLICY "Users can view comments on company tasks" 
ON public.task_comments 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_comments.task_id 
    AND t.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Users can create comments on company tasks" 
ON public.task_comments 
FOR INSERT 
WITH CHECK (
  user_id = auth.uid() AND
  EXISTS (
    SELECT 1 FROM public.tasks t 
    WHERE t.id = task_comments.task_id 
    AND t.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Users can update their own comments" 
ON public.task_comments 
FOR UPDATE 
USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own comments" 
ON public.task_comments 
FOR DELETE 
USING (user_id = auth.uid());

-- Create trigger for task comments timestamps
CREATE TRIGGER update_task_comments_updated_at
BEFORE UPDATE ON public.task_comments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for task comments
CREATE INDEX idx_task_comments_task_id ON public.task_comments(task_id);
CREATE INDEX idx_task_comments_user_id ON public.task_comments(user_id);