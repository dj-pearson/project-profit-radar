-- Step 4: Data Classification & Access Control for SOC Compliance (Fixed)

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

-- Create simplified RLS policies
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

CREATE POLICY "Admins can manage access control matrix" 
ON public.access_control_matrix 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

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

CREATE POLICY "Admins can manage PIAs" 
ON public.privacy_impact_assessments 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.profiles 
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

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
CREATE INDEX IF NOT EXISTS idx_access_control_matrix_resource ON public.access_control_matrix(resource_type, classification);
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