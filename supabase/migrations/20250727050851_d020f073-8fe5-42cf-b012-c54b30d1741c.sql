-- Customer Communication Hub Tables

-- Client portal access management
CREATE TABLE public.client_portal_access (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  client_email TEXT NOT NULL,
  access_token TEXT NOT NULL UNIQUE,
  access_level TEXT NOT NULL DEFAULT 'read_only',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID,
  UNIQUE(project_id, client_email)
);

-- Communication timeline/log
CREATE TABLE public.communication_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
  lead_id UUID,
  communication_type TEXT NOT NULL, -- email, call, meeting, text, portal_message
  direction TEXT NOT NULL, -- inbound, outbound
  subject TEXT,
  content TEXT,
  participants JSONB DEFAULT '[]',
  metadata JSONB DEFAULT '{}',
  attachments JSONB DEFAULT '[]',
  is_automated BOOLEAN DEFAULT false,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  read_at TIMESTAMP WITH TIME ZONE,
  replied_at TIMESTAMP WITH TIME ZONE,
  status TEXT DEFAULT 'pending', -- pending, sent, delivered, read, replied, failed
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Communication templates
CREATE TABLE public.communication_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- welcome, status_update, invoice, follow_up, etc.
  communication_type TEXT NOT NULL, -- email, sms, portal_notification
  subject_template TEXT,
  content_template TEXT NOT NULL,
  variables JSONB DEFAULT '[]', -- list of available variables
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Automated notification rules
CREATE TABLE public.notification_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL, -- project_status_change, payment_received, etc.
  trigger_conditions JSONB DEFAULT '{}',
  template_id UUID,
  recipients JSONB DEFAULT '[]', -- list of recipient types/emails
  delay_minutes INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Document sharing for clients
CREATE TABLE public.client_document_shares (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  document_id UUID,
  document_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  file_path TEXT NOT NULL,
  shared_with_email TEXT NOT NULL,
  access_level TEXT DEFAULT 'view', -- view, download
  is_active BOOLEAN DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  download_count INTEGER DEFAULT 0,
  last_accessed_at TIMESTAMP WITH TIME ZONE,
  shared_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Project status updates for client portal
CREATE TABLE public.project_status_updates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  status_type TEXT NOT NULL, -- milestone, delay, completion, issue
  visibility TEXT DEFAULT 'client', -- internal, client, public
  images JSONB DEFAULT '[]',
  attachments JSONB DEFAULT '[]',
  is_published BOOLEAN DEFAULT false,
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.client_portal_access ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.communication_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notification_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.client_document_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_status_updates ENABLE ROW LEVEL SECURITY;

-- RLS policies for client_portal_access
CREATE POLICY "Staff can manage client portal access" 
ON public.client_portal_access 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company client portal access" 
ON public.client_portal_access 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- RLS policies for communication_log
CREATE POLICY "Staff can manage communication log" 
ON public.communication_log 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company communication log" 
ON public.communication_log 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- RLS policies for communication_templates
CREATE POLICY "Staff can manage communication templates" 
ON public.communication_templates 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company communication templates" 
ON public.communication_templates 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- RLS policies for notification_rules
CREATE POLICY "Staff can manage notification rules" 
ON public.notification_rules 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company notification rules" 
ON public.notification_rules 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- RLS policies for client_document_shares
CREATE POLICY "Staff can manage client document shares" 
ON public.client_document_shares 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company client document shares" 
ON public.client_document_shares 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- RLS policies for project_status_updates
CREATE POLICY "Staff can manage project status updates" 
ON public.project_status_updates 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

CREATE POLICY "Users can view company project status updates" 
ON public.project_status_updates 
FOR SELECT 
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'::user_role
);

-- Create indexes for performance
CREATE INDEX idx_client_portal_access_company_id ON public.client_portal_access(company_id);
CREATE INDEX idx_client_portal_access_project_id ON public.client_portal_access(project_id);
CREATE INDEX idx_client_portal_access_token ON public.client_portal_access(access_token);

CREATE INDEX idx_communication_log_company_id ON public.communication_log(company_id);
CREATE INDEX idx_communication_log_project_id ON public.communication_log(project_id);
CREATE INDEX idx_communication_log_lead_id ON public.communication_log(lead_id);
CREATE INDEX idx_communication_log_created_at ON public.communication_log(created_at);

CREATE INDEX idx_communication_templates_company_id ON public.communication_templates(company_id);
CREATE INDEX idx_communication_templates_category ON public.communication_templates(category);

CREATE INDEX idx_notification_rules_company_id ON public.notification_rules(company_id);
CREATE INDEX idx_notification_rules_trigger_event ON public.notification_rules(trigger_event);

CREATE INDEX idx_client_document_shares_company_id ON public.client_document_shares(company_id);
CREATE INDEX idx_client_document_shares_project_id ON public.client_document_shares(project_id);

CREATE INDEX idx_project_status_updates_company_id ON public.project_status_updates(company_id);
CREATE INDEX idx_project_status_updates_project_id ON public.project_status_updates(project_id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_client_portal_access_updated_at
  BEFORE UPDATE ON public.client_portal_access
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_log_updated_at
  BEFORE UPDATE ON public.communication_log
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_communication_templates_updated_at
  BEFORE UPDATE ON public.communication_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_notification_rules_updated_at
  BEFORE UPDATE ON public.notification_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_client_document_shares_updated_at
  BEFORE UPDATE ON public.client_document_shares
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_status_updates_updated_at
  BEFORE UPDATE ON public.project_status_updates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();