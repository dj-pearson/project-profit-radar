-- Step 4: Data Classification & Access Control for SOC Compliance (Simple Version)

-- Create data classification levels enum
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'data_classification') THEN
    CREATE TYPE public.data_classification AS ENUM ('public', 'internal', 'confidential', 'restricted');
  END IF;
END $$;

-- Create data classification table
CREATE TABLE IF NOT EXISTS public.data_classifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  classification public.data_classification NOT NULL DEFAULT 'internal',
  classification_reason TEXT,
  data_types TEXT[],
  retention_period_months INTEGER,
  legal_basis TEXT,
  processing_purpose TEXT,
  data_owner UUID,
  data_steward UUID,
  sensitivity_tags TEXT[],
  compliance_requirements TEXT[],
  access_restrictions JSONB DEFAULT '{}',
  review_date DATE,
  last_reviewed_at TIMESTAMP WITH TIME ZONE,
  last_reviewed_by UUID,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
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
  conditions JSONB DEFAULT '{}',
  approval_required BOOLEAN DEFAULT false,
  approval_workflow JSONB DEFAULT '{}',
  granted_by UUID,
  granted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  expires_at TIMESTAMP WITH TIME ZONE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create data access logs table
CREATE TABLE IF NOT EXISTS public.data_access_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  user_id UUID,
  resource_type TEXT NOT NULL,
  resource_id TEXT NOT NULL,
  resource_name TEXT,
  data_classification public.data_classification,
  access_method TEXT NOT NULL DEFAULT 'view',
  access_purpose TEXT,
  access_result TEXT DEFAULT 'success',
  denial_reason TEXT,
  data_volume TEXT,
  ip_address INET,
  user_agent TEXT,
  session_id TEXT,
  lawful_basis TEXT,
  retention_applied BOOLEAN DEFAULT false,
  anonymized BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.data_classifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_control_matrix ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_access_logs ENABLE ROW LEVEL SECURITY;

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

-- Create basic indexes
CREATE INDEX IF NOT EXISTS idx_data_classifications_company_id ON public.data_classifications(company_id);
CREATE INDEX IF NOT EXISTS idx_access_control_matrix_company_id ON public.access_control_matrix(company_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_company_id ON public.data_access_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_data_access_logs_user_id ON public.data_access_logs(user_id);