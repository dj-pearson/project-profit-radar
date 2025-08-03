-- Advanced Workflow Automation Tables
-- Table for workflow definitions
CREATE TABLE public.workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  trigger_type TEXT NOT NULL, -- 'schedule', 'event', 'condition'
  trigger_config JSONB NOT NULL DEFAULT '{}',
  workflow_steps JSONB NOT NULL DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for workflow executions
CREATE TABLE public.workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'cancelled'
  trigger_data JSONB DEFAULT '{}',
  execution_log JSONB DEFAULT '[]',
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  total_steps INTEGER DEFAULT 0,
  completed_steps INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for workflow step executions
CREATE TABLE public.workflow_step_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  execution_id UUID NOT NULL REFERENCES public.workflow_executions(id) ON DELETE CASCADE,
  step_index INTEGER NOT NULL,
  step_name TEXT NOT NULL,
  step_type TEXT NOT NULL, -- 'notification', 'task_creation', 'status_update', 'api_call', 'condition'
  step_config JSONB NOT NULL DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed', 'skipped'
  input_data JSONB DEFAULT '{}',
  output_data JSONB DEFAULT '{}',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for workflow triggers (scheduled executions)
CREATE TABLE public.workflow_triggers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL,
  trigger_config JSONB NOT NULL DEFAULT '{}',
  next_execution_at TIMESTAMP WITH TIME ZONE,
  last_execution_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Table for workflow analytics
CREATE TABLE public.workflow_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.workflow_definitions(id) ON DELETE CASCADE,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  total_executions INTEGER DEFAULT 0,
  successful_executions INTEGER DEFAULT 0,
  failed_executions INTEGER DEFAULT 0,
  average_execution_time_ms INTEGER DEFAULT 0,
  total_time_saved_hours NUMERIC DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, workflow_id, period_start, period_end)
);

-- Enable RLS
ALTER TABLE public.workflow_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_step_executions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_triggers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workflow_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for workflow_definitions
CREATE POLICY "Users can view company workflow definitions" ON public.workflow_definitions
FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage workflow definitions" ON public.workflow_definitions
FOR ALL USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin'])
);

-- RLS Policies for workflow_executions
CREATE POLICY "Users can view company workflow executions" ON public.workflow_executions
FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can manage workflow executions" ON public.workflow_executions
FOR ALL USING (true);

-- RLS Policies for workflow_step_executions
CREATE POLICY "Users can view company workflow step executions" ON public.workflow_step_executions
FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can manage workflow step executions" ON public.workflow_step_executions
FOR ALL USING (true);

-- RLS Policies for workflow_triggers
CREATE POLICY "Users can view company workflow triggers" ON public.workflow_triggers
FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage workflow triggers" ON public.workflow_triggers
FOR ALL USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin'])
);

-- RLS Policies for workflow_analytics
CREATE POLICY "Users can view company workflow analytics" ON public.workflow_analytics
FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can manage workflow analytics" ON public.workflow_analytics
FOR ALL USING (true);

-- Indexes for performance
CREATE INDEX idx_workflow_definitions_company_id ON public.workflow_definitions(company_id);
CREATE INDEX idx_workflow_definitions_active ON public.workflow_definitions(company_id, is_active);
CREATE INDEX idx_workflow_executions_company_id ON public.workflow_executions(company_id);
CREATE INDEX idx_workflow_executions_workflow_id ON public.workflow_executions(workflow_id);
CREATE INDEX idx_workflow_executions_status ON public.workflow_executions(company_id, status);
CREATE INDEX idx_workflow_step_executions_execution_id ON public.workflow_step_executions(execution_id);
CREATE INDEX idx_workflow_triggers_next_execution ON public.workflow_triggers(next_execution_at) WHERE is_active = true;
CREATE INDEX idx_workflow_analytics_period ON public.workflow_analytics(company_id, period_start, period_end);

-- Triggers for updated_at
CREATE TRIGGER update_workflow_definitions_updated_at
  BEFORE UPDATE ON public.workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_triggers_updated_at
  BEFORE UPDATE ON public.workflow_triggers
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_workflow_analytics_updated_at
  BEFORE UPDATE ON public.workflow_analytics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default workflow templates for existing companies
INSERT INTO public.workflow_definitions (company_id, name, description, trigger_type, trigger_config, workflow_steps, created_by)
SELECT 
  c.id,
  'Daily Project Status Report',
  'Automatically generate and send daily project status reports to stakeholders',
  'schedule',
  '{"schedule": "daily", "time": "18:00", "timezone": "America/New_York"}',
  '[
    {
      "name": "Generate Report",
      "type": "report_generation",
      "config": {"report_type": "project_status", "include_metrics": true}
    },
    {
      "name": "Send Email",
      "type": "notification",
      "config": {"method": "email", "recipients": "stakeholders", "template": "daily_status"}
    }
  ]',
  NULL
FROM public.companies c
WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.company_id = c.id);

INSERT INTO public.workflow_definitions (company_id, name, description, trigger_type, trigger_config, workflow_steps, created_by)
SELECT 
  c.id,
  'Budget Alert Automation',
  'Automatically notify team when project budgets exceed thresholds',
  'event',
  '{"event_type": "budget_threshold_exceeded", "threshold_percentage": 85}',
  '[
    {
      "name": "Calculate Budget Impact",
      "type": "calculation",
      "config": {"calculate": "budget_variance", "include_projections": true}
    },
    {
      "name": "Notify Project Manager",
      "type": "notification", 
      "config": {"method": "email", "recipients": "project_manager", "template": "budget_alert"}
    },
    {
      "name": "Create Follow-up Task",
      "type": "task_creation",
      "config": {"task_type": "budget_review", "assign_to": "project_manager", "priority": "high"}
    }
  ]',
  NULL
FROM public.companies c
WHERE EXISTS (SELECT 1 FROM public.user_profiles up WHERE up.company_id = c.id);

-- Insert corresponding triggers
INSERT INTO public.workflow_triggers (company_id, workflow_id, trigger_type, trigger_config, next_execution_at)
SELECT 
  wd.company_id,
  wd.id,
  wd.trigger_type,
  wd.trigger_config,
  CASE 
    WHEN wd.trigger_type = 'schedule' THEN 
      (CURRENT_DATE + INTERVAL '1 day' + TIME '18:00:00')
    ELSE NULL
  END
FROM public.workflow_definitions wd
WHERE wd.trigger_type = 'schedule';