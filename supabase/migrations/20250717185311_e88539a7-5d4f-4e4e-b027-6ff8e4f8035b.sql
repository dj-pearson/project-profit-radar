-- Add missing task management features

-- 1. Task Comments for discussion
CREATE TABLE IF NOT EXISTS public.task_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  comment TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 2. Task Attachments for file management
CREATE TABLE IF NOT EXISTS public.task_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  file_type TEXT,
  uploaded_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 3. Task Subtasks for hierarchical structure
CREATE TABLE IF NOT EXISTS public.task_subtasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  completed BOOLEAN DEFAULT false,
  order_index INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 4. Task Time Entries for actual time tracking
CREATE TABLE IF NOT EXISTS public.task_time_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  description TEXT,
  hours_logged DECIMAL(5,2) NOT NULL,
  date_logged DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 5. Task Activity Log for audit trail
CREATE TABLE IF NOT EXISTS public.task_activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  action_type TEXT NOT NULL, -- 'created', 'updated', 'commented', 'assigned', 'completed', etc.
  field_changed TEXT,
  old_value TEXT,
  new_value TEXT,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- 6. Add tags support to tasks table
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS tags TEXT[] DEFAULT '{}';

-- 7. Add notification preferences
CREATE TABLE IF NOT EXISTS public.task_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  task_id UUID NOT NULL REFERENCES public.tasks(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL, -- 'due_date', 'assigned', 'commented', 'status_changed'
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on all new tables
ALTER TABLE public.task_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_attachments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_subtasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_time_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.task_notifications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for task_comments
CREATE POLICY "Users can view comments for tasks in their company" ON public.task_comments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_comments.task_id 
      AND (t.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Users can create comments for tasks in their company" ON public.task_comments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_comments.task_id 
      AND t.company_id = get_user_company(auth.uid())
    ) AND user_id = auth.uid()
  );

CREATE POLICY "Users can update their own comments" ON public.task_comments
  FOR UPDATE USING (user_id = auth.uid());

-- RLS Policies for task_attachments
CREATE POLICY "Users can view attachments for tasks in their company" ON public.task_attachments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_attachments.task_id 
      AND (t.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Users can upload attachments for tasks in their company" ON public.task_attachments
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_attachments.task_id 
      AND t.company_id = get_user_company(auth.uid())
    ) AND uploaded_by = auth.uid()
  );

-- RLS Policies for task_subtasks
CREATE POLICY "Users can manage subtasks for tasks in their company" ON public.task_subtasks
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_subtasks.parent_task_id 
      AND (t.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

-- RLS Policies for task_time_entries
CREATE POLICY "Users can view time entries for tasks in their company" ON public.task_time_entries
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_time_entries.task_id 
      AND (t.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Users can create their own time entries" ON public.task_time_entries
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_time_entries.task_id 
      AND t.company_id = get_user_company(auth.uid())
    ) AND user_id = auth.uid()
  );

-- RLS Policies for task_activity_logs
CREATE POLICY "Users can view activity logs for tasks in their company" ON public.task_activity_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.tasks t 
      WHERE t.id = task_activity_logs.task_id 
      AND (t.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "System can create activity logs" ON public.task_activity_logs
  FOR INSERT WITH CHECK (true);

-- RLS Policies for task_notifications
CREATE POLICY "Users can manage their own task notifications" ON public.task_notifications
  FOR ALL USING (user_id = auth.uid());

-- Add triggers for updated_at timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_task_comments_updated_at BEFORE UPDATE ON public.task_comments
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_task_subtasks_updated_at BEFORE UPDATE ON public.task_subtasks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();