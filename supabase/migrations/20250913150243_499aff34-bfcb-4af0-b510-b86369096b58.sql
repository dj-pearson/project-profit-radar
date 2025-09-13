-- Create email marketing tables
CREATE TABLE public.email_campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'sending', 'sent', 'paused', 'cancelled')),
  type TEXT NOT NULL DEFAULT 'promotional' CHECK (type IN ('promotional', 'newsletter', 'transactional', 'welcome', 'announcement')),
  recipients_count INTEGER DEFAULT 0,
  sent_count INTEGER DEFAULT 0,
  delivered_count INTEGER DEFAULT 0,
  open_count INTEGER DEFAULT 0,
  click_count INTEGER DEFAULT 0,
  bounce_count INTEGER DEFAULT 0,
  unsubscribe_count INTEGER DEFAULT 0,
  open_rate NUMERIC DEFAULT 0,
  click_rate NUMERIC DEFAULT 0,
  bounce_rate NUMERIC DEFAULT 0,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  template_id UUID,
  list_ids JSONB DEFAULT '[]'::JSONB,
  tags JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_campaigns ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company email campaigns" 
ON public.email_campaigns 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Marketing staff can manage email campaigns" 
ON public.email_campaigns 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

-- Create email lists table
CREATE TABLE public.email_lists (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  subscribers_count INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  tags JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_lists ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company email lists" 
ON public.email_lists 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Marketing staff can manage email lists" 
ON public.email_lists 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

-- Create email templates table  
CREATE TABLE public.email_marketing_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  subject TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'promotional' CHECK (type IN ('promotional', 'newsletter', 'transactional', 'welcome', 'announcement')),
  is_active BOOLEAN DEFAULT true,
  variables JSONB DEFAULT '[]'::JSONB,
  design_settings JSONB DEFAULT '{}'::JSONB,
  usage_count INTEGER DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.email_marketing_templates ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company email templates" 
ON public.email_marketing_templates 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Marketing staff can manage email templates" 
ON public.email_marketing_templates 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])));

-- Create workflow definitions table
CREATE TABLE public.automated_workflow_definitions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'paused', 'archived')),
  trigger_config JSONB NOT NULL DEFAULT '{}'::JSONB,
  action_config JSONB NOT NULL DEFAULT '[]'::JSONB,
  conditions JSONB DEFAULT '[]'::JSONB,
  schedule_config JSONB DEFAULT '{}'::JSONB,
  success_count INTEGER DEFAULT 0,
  failure_count INTEGER DEFAULT 0,
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,
  is_template BOOLEAN DEFAULT false,
  category TEXT,
  tags JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automated_workflow_definitions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company workflow definitions" 
ON public.automated_workflow_definitions 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Managers can manage workflow definitions" 
ON public.automated_workflow_definitions 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

-- Create workflow executions table
CREATE TABLE public.automated_workflow_executions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  workflow_id UUID NOT NULL REFERENCES public.automated_workflow_definitions(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'completed', 'failed', 'cancelled')),
  started_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  completed_at TIMESTAMP WITH TIME ZONE,
  execution_time_ms INTEGER,
  steps_completed INTEGER DEFAULT 0,
  total_steps INTEGER DEFAULT 0,
  error_message TEXT,
  result_data JSONB DEFAULT '{}'::JSONB,
  logs JSONB DEFAULT '[]'::JSONB,
  triggered_by TEXT,
  trigger_data JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.automated_workflow_executions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company workflow executions" 
ON public.automated_workflow_executions 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "System can manage workflow executions" 
ON public.automated_workflow_executions 
FOR ALL 
USING (true);

-- Add indexes for performance
CREATE INDEX idx_email_campaigns_company_id ON public.email_campaigns(company_id);
CREATE INDEX idx_email_campaigns_status ON public.email_campaigns(status);
CREATE INDEX idx_email_lists_company_id ON public.email_lists(company_id);
CREATE INDEX idx_email_marketing_templates_company_id ON public.email_marketing_templates(company_id);
CREATE INDEX idx_automated_workflow_definitions_company_id ON public.automated_workflow_definitions(company_id);
CREATE INDEX idx_automated_workflow_definitions_status ON public.automated_workflow_definitions(status);
CREATE INDEX idx_automated_workflow_executions_company_id ON public.automated_workflow_executions(company_id);
CREATE INDEX idx_automated_workflow_executions_workflow_id ON public.automated_workflow_executions(workflow_id);

-- Add updated_at triggers
CREATE TRIGGER update_email_campaigns_updated_at
  BEFORE UPDATE ON public.email_campaigns
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_lists_updated_at
  BEFORE UPDATE ON public.email_lists
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_email_marketing_templates_updated_at
  BEFORE UPDATE ON public.email_marketing_templates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_automated_workflow_definitions_updated_at
  BEFORE UPDATE ON public.automated_workflow_definitions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();