-- Create SOC 2 compliance audit trail tables

-- Audit log table for tracking all system activities
CREATE TABLE public.audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  action_type TEXT NOT NULL, -- 'create', 'read', 'update', 'delete', 'export', 'login', 'logout', 'access'
  resource_type TEXT NOT NULL, -- 'project', 'document', 'user', 'financial_data', 'system_config', etc.
  resource_id TEXT, -- ID of the affected resource
  resource_name TEXT, -- Human readable name of the resource
  old_values JSONB, -- Previous values (for updates/deletes)
  new_values JSONB, -- New values (for creates/updates)
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  risk_level TEXT DEFAULT 'low', -- 'low', 'medium', 'high', 'critical'
  compliance_category TEXT, -- 'data_access', 'configuration_change', 'user_management', 'financial', 'security'
  description TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Data access logs for tracking sensitive data access
CREATE TABLE public.data_access_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  data_type TEXT NOT NULL, -- 'financial', 'personal', 'project', 'document', 'report'
  data_classification TEXT NOT NULL, -- 'public', 'internal', 'confidential', 'restricted'
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  access_method TEXT NOT NULL, -- 'view', 'download', 'export', 'print', 'copy'
  access_purpose TEXT, -- Business justification for access
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  retention_applied BOOLEAN DEFAULT false,
  lawful_basis TEXT, -- GDPR lawful basis for processing
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- System configuration changes for compliance tracking
CREATE TABLE public.system_config_changes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.user_profiles(id),
  change_type TEXT NOT NULL, -- 'security_setting', 'user_permission', 'system_config', 'integration'
  component TEXT NOT NULL, -- 'auth', 'database', 'storage', 'api', 'ui'
  setting_name TEXT NOT NULL,
  old_value TEXT,
  new_value TEXT,
  change_reason TEXT,
  approval_required BOOLEAN DEFAULT false,
  approved_by UUID REFERENCES public.user_profiles(id),
  approved_at TIMESTAMPTZ,
  rollback_possible BOOLEAN DEFAULT true,
  rollback_data JSONB,
  ip_address INET,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Compliance reports and certifications
CREATE TABLE public.compliance_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_type TEXT NOT NULL, -- 'soc2_audit', 'gdpr_assessment', 'security_review', 'access_review'
  reporting_period_start DATE NOT NULL,
  reporting_period_end DATE NOT NULL,
  generated_by UUID NOT NULL REFERENCES public.user_profiles(id),
  report_data JSONB NOT NULL,
  findings JSONB, -- Issues or observations found
  recommendations JSONB, -- Recommendations for improvement
  status TEXT DEFAULT 'draft', -- 'draft', 'final', 'submitted', 'approved'
  file_path TEXT, -- Link to generated report file
  compliance_score INTEGER, -- Overall compliance score (0-100)
  risk_assessment JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.system_config_changes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.compliance_reports ENABLE ROW LEVEL SECURITY;

-- RLS Policies for audit_logs
CREATE POLICY "Root admins can view all audit logs" 
ON public.audit_logs FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can view company audit logs" 
ON public.audit_logs FOR SELECT 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

CREATE POLICY "System can insert audit logs" 
ON public.audit_logs FOR INSERT 
WITH CHECK (true);

-- RLS Policies for data_access_logs
CREATE POLICY "Root admins can view all data access logs" 
ON public.data_access_logs FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can view company data access logs" 
ON public.data_access_logs FOR SELECT 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

CREATE POLICY "System can insert data access logs" 
ON public.data_access_logs FOR INSERT 
WITH CHECK (true);

-- RLS Policies for system_config_changes
CREATE POLICY "Root admins can manage all config changes" 
ON public.system_config_changes FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can view config changes" 
ON public.system_config_changes FOR SELECT 
USING (get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS Policies for compliance_reports
CREATE POLICY "Root admins can manage all compliance reports" 
ON public.compliance_reports FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can view compliance reports" 
ON public.compliance_reports FOR SELECT 
USING (get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- Create indexes for better performance
CREATE INDEX idx_audit_logs_company_date ON public.audit_logs(company_id, created_at DESC);
CREATE INDEX idx_audit_logs_user_action ON public.audit_logs(user_id, action_type);
CREATE INDEX idx_audit_logs_resource ON public.audit_logs(resource_type, resource_id);
CREATE INDEX idx_data_access_logs_user_date ON public.data_access_logs(user_id, created_at DESC);
CREATE INDEX idx_data_access_logs_data_type ON public.data_access_logs(data_type, data_classification);
CREATE INDEX idx_system_config_changes_date ON public.system_config_changes(created_at DESC);
CREATE INDEX idx_compliance_reports_type_period ON public.compliance_reports(report_type, reporting_period_end DESC);

-- Create trigger for updating updated_at timestamps
CREATE TRIGGER update_compliance_reports_updated_at
  BEFORE UPDATE ON public.compliance_reports
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
  p_company_id UUID,
  p_user_id UUID,
  p_action_type TEXT,
  p_resource_type TEXT,
  p_resource_id TEXT DEFAULT NULL,
  p_resource_name TEXT DEFAULT NULL,
  p_old_values JSONB DEFAULT NULL,
  p_new_values JSONB DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_risk_level TEXT DEFAULT 'low',
  p_compliance_category TEXT DEFAULT 'general',
  p_description TEXT DEFAULT NULL,
  p_metadata JSONB DEFAULT '{}'
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    company_id, user_id, action_type, resource_type, resource_id, resource_name,
    old_values, new_values, ip_address, user_agent, session_id, risk_level,
    compliance_category, description, metadata
  ) VALUES (
    p_company_id, p_user_id, p_action_type, p_resource_type, p_resource_id, p_resource_name,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id, p_risk_level,
    p_compliance_category, p_description, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Create function to log data access
CREATE OR REPLACE FUNCTION public.log_data_access(
  p_company_id UUID,
  p_user_id UUID,
  p_data_type TEXT,
  p_data_classification TEXT,
  p_resource_id TEXT,
  p_resource_name TEXT DEFAULT NULL,
  p_access_method TEXT DEFAULT 'view',
  p_access_purpose TEXT DEFAULT NULL,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_session_id TEXT DEFAULT NULL,
  p_lawful_basis TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  access_log_id UUID;
BEGIN
  INSERT INTO public.data_access_logs (
    company_id, user_id, data_type, data_classification, resource_id, resource_name,
    access_method, access_purpose, ip_address, user_agent, session_id, lawful_basis
  ) VALUES (
    p_company_id, p_user_id, p_data_type, p_data_classification, p_resource_id, p_resource_name,
    p_access_method, p_access_purpose, p_ip_address, p_user_agent, p_session_id, p_lawful_basis
  ) RETURNING id INTO access_log_id;
  
  RETURN access_log_id;
END;
$$;