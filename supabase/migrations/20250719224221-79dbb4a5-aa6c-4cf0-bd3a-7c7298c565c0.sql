-- Step 4: Data Classification & Access Control for SOC Compliance

-- Create data classification levels enum
CREATE TYPE public.data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');

-- Create data classification table
CREATE TABLE IF NOT EXISTS public.data_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  resource_type TEXT NOT NULL, -- table, file, document, etc.
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  classification public.data_classification NOT NULL DEFAULT 'internal',
  classification_reason TEXT,
  data_types TEXT[], -- PII, PHI, financial, etc.
  retention_period_months INTEGER,
  legal_basis TEXT,
  processing_purpose TEXT,
  data_owner UUID,
  data_steward UUID,
  sensitivity_tags TEXT[],
  compliance_requirements TEXT[], -- GDPR, CCPA, HIPAA, etc.
  access_restrictions JSONB DEFAULT '{}',
  review_date DATE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, resource_type, resource_id)
);

-- Create access control matrix table
CREATE TABLE IF NOT EXISTS public.access_control_matrix (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,
  classification public.data_classification NOT NULL,
  role TEXT NOT NULL,
  permission_level TEXT NOT NULL CHECK (permission_level IN ('none', 'read', 'write', 'admin', 'full')),
  conditions JSONB DEFAULT '{}', -- IP restrictions, time-based, etc.
  approval_required BOOLEAN DEFAULT false,
  approval_workflow JSONB DEFAULT '{}',
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data access logs table (separate from general audit logs)
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  data_classification public.data_classification,
  access_method TEXT NOT NULL DEFAULT 'view', -- view, download, export, print, etc.
  access_purpose TEXT,
  access_result TEXT DEFAULT 'success', -- success, denied, error
  denial_reason TEXT,
  data_volume TEXT, -- number of records, file size, etc.
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  lawful_basis TEXT, -- for GDPR compliance
  retention_applied BOOLEAN DEFAULT false,
  anonymized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create privacy impact assessments table
CREATE TABLE IF NOT EXISTS public.privacy_impact_assessments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  assessment_name TEXT NOT NULL,
  project_or_system TEXT NOT NULL,
  description TEXT,
  data_types_processed TEXT[],
  data_subjects TEXT[], -- customers, employees, etc.
  processing_purposes TEXT[],
  legal_basis TEXT[],
  data_sources TEXT[],
  data_recipients TEXT[],
  cross_border_transfers BOOLEAN DEFAULT false,
  transfer_safeguards TEXT,
  retention_periods JSONB DEFAULT '{}',
  security_measures JSONB DEFAULT '{}',
  privacy_risks JSONB DEFAULT '[]',
  risk_mitigation JSONB DEFAULT '[]',
  dpo_consultation BOOLEAN DEFAULT false,
  dpo_consultation_date DATE,
  stakeholder_consultation JSONB DEFAULT '{}',
  assessment_status TEXT DEFAULT 'draft' CHECK (assessment_status IN ('draft', 'review', 'approved', 'rejected')),
  assessment_date DATE,
  next_review_date DATE,
  conducted_by UUID,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data retention policies table
CREATE TABLE IF NOT EXISTS public.data_retention_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  policy_name TEXT NOT NULL,
  data_category TEXT NOT NULL,
  data_classification public.data_classification NOT NULL,
  retention_period_months INTEGER NOT NULL,
  retention_trigger TEXT, -- creation_date, last_access, end_of_contract, etc.
  deletion_method TEXT DEFAULT 'secure_delete', -- secure_delete, anonymize, archive
  legal_requirements TEXT[],
  business_justification TEXT,
  exceptions JSONB DEFAULT '[]',
  auto_deletion_enabled BOOLEAN DEFAULT false,
  notification_before_deletion_days INTEGER DEFAULT 30,
  policy_status TEXT DEFAULT 'active' CHECK (policy_status IN ('draft', 'active', 'suspended', 'archived')),
  effective_date DATE NOT NULL,
  review_frequency_months INTEGER DEFAULT 12,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  next_review_date DATE,
  created_by UUID,
  approved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.data_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_control_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.privacy_impact_assessments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_retention_policies ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for data_classifications
CREATE POLICY "Admins can manage data classifications" 
ON public.data_classifications 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Users can view data classifications" 
ON public.data_classifications 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin', 'project_manager', 'office_staff')
  )
);

-- Create RLS policies for access_control_matrix
CREATE POLICY "Admins can manage access control matrix" 
ON public.access_control_matrix 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

-- Create RLS policies for data_access_logs
CREATE POLICY "Users can view their own access logs" 
ON public.data_access_logs 
FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all access logs" 
ON public.data_access_logs 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "System can create access logs" 
ON public.data_access_logs 
FOR INSERT 
WITH CHECK (true);

-- Create RLS policies for privacy_impact_assessments
CREATE POLICY "Admins can manage PIAs" 
ON public.privacy_impact_assessments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

-- Create RLS policies for data_retention_policies
CREATE POLICY "Admins can manage retention policies" 
ON public.data_retention_policies 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_data_classifications_company_id ON public.data_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_data_classifications_resource ON public.data_classifications(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_classifications_classification ON public.data_classifications(classification);
CREATE INDEX IF NOT EXISTS idx_access_control_matrix_company_id ON public.access_control_matrix(company_id);
CREATE INDEX IF NOT EXISTS idx_access_control_matrix_resource ON public.access_control_matrix(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_company_id ON public.data_access_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON public.data_access_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_created_at ON public.data_access_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_resource ON public.data_access_logs(resource_type, resource_id);
CREATE INDEX IF NOT EXISTS idx_privacy_impact_assessments_company_id ON public.privacy_impact_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_data_retention_policies_company_id ON public.data_retention_policies(company_id);

-- Create triggers for automatic timestamp updates
DROP TRIGGER IF EXISTS update_data_classifications_updated_at ON public.data_classifications;
CREATE TRIGGER update_data_classifications_updated_at
BEFORE UPDATE ON public.data_classifications
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_access_control_matrix_updated_at ON public.access_control_matrix;
CREATE TRIGGER update_access_control_matrix_updated_at
BEFORE UPDATE ON public.access_control_matrix
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_privacy_impact_assessments_updated_at ON public.privacy_impact_assessments;
CREATE TRIGGER update_privacy_impact_assessments_updated_at
BEFORE UPDATE ON public.privacy_impact_assessments
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_data_retention_policies_updated_at ON public.data_retention_policies;
CREATE TRIGGER update_data_retention_policies_updated_at
BEFORE UPDATE ON public.data_retention_policies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

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
)
RETURNS UUID AS $$
DECLARE
  access_log_id UUID;
BEGIN
  INSERT INTO public.data_access_logs (
    company_id, user_id, resource_type, resource_id, resource_name,
    data_classification, access_method, access_purpose, ip_address, 
    user_agent, session_id, lawful_basis
  ) VALUES (
    p_company_id, p_user_id, p_data_type, p_resource_id, p_resource_name,
    p_data_classification::public.data_classification, p_access_method, p_access_purpose, 
    p_ip_address, p_user_agent, p_session_id, p_lawful_basis
  ) RETURNING id INTO access_log_id;
  
  RETURN access_log_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create function to check data access permissions
CREATE OR REPLACE FUNCTION public.check_data_access_permission(
  p_user_id UUID,
  p_resource_type TEXT,
  p_resource_id TEXT,
  p_requested_permission TEXT DEFAULT 'read'
)
RETURNS JSONB AS $$
DECLARE
  user_role TEXT;
  classification public.data_classification;
  access_result JSONB;
  matrix_record RECORD;
BEGIN
  -- Get user role
  SELECT role INTO user_role FROM public.profiles WHERE id = p_user_id;
  
  IF user_role IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'User not found or no role assigned'
    );
  END IF;
  
  -- Root admin has access to everything
  IF user_role = 'root_admin' THEN
    RETURN jsonb_build_object(
      'allowed', true,
      'reason', 'Root admin access'
    );
  END IF;
  
  -- Get data classification
  SELECT dc.classification INTO classification
  FROM public.data_classifications dc
  WHERE dc.resource_type = p_resource_type 
    AND dc.resource_id = p_resource_id;
  
  -- If no classification found, default to internal
  classification := COALESCE(classification, 'internal');
  
  -- Check access control matrix
  SELECT * INTO matrix_record
  FROM public.access_control_matrix acm
  WHERE acm.resource_type = p_resource_type
    AND (acm.resource_id = p_resource_id OR acm.resource_id IS NULL)
    AND acm.classification = classification
    AND acm.role = user_role
    AND acm.is_active = true
    AND (acm.expires_at IS NULL OR acm.expires_at > now())
  ORDER BY (acm.resource_id IS NOT NULL) DESC -- Specific rules override general ones
  LIMIT 1;
  
  IF matrix_record IS NULL THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'reason', 'No access control rule found for this resource and role'
    );
  END IF;
  
  -- Check permission level
  CASE matrix_record.permission_level
    WHEN 'none' THEN
      access_result := jsonb_build_object('allowed', false, 'reason', 'Access explicitly denied');
    WHEN 'read' THEN
      access_result := jsonb_build_object('allowed', p_requested_permission = 'read', 'reason', 'Read-only access');
    WHEN 'write' THEN
      access_result := jsonb_build_object('allowed', p_requested_permission IN ('read', 'write'), 'reason', 'Read-write access');
    WHEN 'admin' THEN
      access_result := jsonb_build_object('allowed', p_requested_permission IN ('read', 'write', 'admin'), 'reason', 'Administrative access');
    WHEN 'full' THEN
      access_result := jsonb_build_object('allowed', true, 'reason', 'Full access');
    ELSE
      access_result := jsonb_build_object('allowed', false, 'reason', 'Unknown permission level');
  END CASE;
  
  -- Add additional metadata
  access_result := access_result || jsonb_build_object(
    'classification', classification,
    'permission_level', matrix_record.permission_level,
    'approval_required', matrix_record.approval_required
  );
  
  RETURN access_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;