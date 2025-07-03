-- Create QuickBooks integration tables

-- QuickBooks integrations table
CREATE TABLE public.quickbooks_integrations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_connected BOOLEAN NOT NULL DEFAULT false,
  qb_company_id TEXT,
  qb_company_name TEXT,
  access_token TEXT,
  refresh_token TEXT,
  token_expires_at TIMESTAMP WITH TIME ZONE,
  oauth_state TEXT,
  connection_status TEXT DEFAULT 'pending',
  sandbox_mode BOOLEAN DEFAULT true,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT,
  last_error_message TEXT,
  sync_settings JSONB DEFAULT '{"auto_sync": false, "sync_frequency": "daily"}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id)
);

-- QuickBooks sync logs
CREATE TABLE public.quickbooks_sync_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  sync_type TEXT NOT NULL, -- 'full' or 'incremental'
  status TEXT NOT NULL DEFAULT 'running', -- 'running', 'completed', 'failed', 'completed_with_errors'
  started_at TIMESTAMP WITH TIME ZONE NOT NULL,
  completed_at TIMESTAMP WITH TIME ZONE,
  records_processed JSONB DEFAULT '{}'::jsonb,
  errors_count INTEGER DEFAULT 0,
  duration_seconds INTEGER,
  error_details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- QuickBooks customers sync table
CREATE TABLE public.quickbooks_customers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  qb_customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  address JSONB,
  qb_sync_token TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(qb_customer_id, company_id)
);

-- QuickBooks items sync table
CREATE TABLE public.quickbooks_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  qb_item_id TEXT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  unit_price DECIMAL(10,2) DEFAULT 0,
  type TEXT,
  qb_sync_token TEXT,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(qb_item_id, company_id)
);

-- Add QuickBooks reference to invoices table
ALTER TABLE public.invoices 
ADD COLUMN qb_invoice_id TEXT,
ADD COLUMN qb_sync_token TEXT,
ADD COLUMN last_synced_to_qb TIMESTAMP WITH TIME ZONE;

-- Enable RLS on new tables
ALTER TABLE public.quickbooks_integrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_sync_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.quickbooks_items ENABLE ROW LEVEL SECURITY;

-- RLS policies for QuickBooks integrations
CREATE POLICY "Admins can manage QuickBooks integrations" 
ON public.quickbooks_integrations 
FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role]));

-- RLS policies for sync logs
CREATE POLICY "Admins can view sync logs" 
ON public.quickbooks_sync_logs 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'accounting'::user_role, 'root_admin'::user_role]));

-- RLS policies for customers
CREATE POLICY "Users can view company QB customers" 
ON public.quickbooks_customers 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage QB customers" 
ON public.quickbooks_customers 
FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'accounting'::user_role, 'root_admin'::user_role]));

-- RLS policies for items
CREATE POLICY "Users can view company QB items" 
ON public.quickbooks_items 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage QB items" 
ON public.quickbooks_items 
FOR ALL 
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'accounting'::user_role, 'root_admin'::user_role]));

-- Triggers for updated_at
CREATE TRIGGER update_quickbooks_integrations_updated_at
  BEFORE UPDATE ON public.quickbooks_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quickbooks_customers_updated_at
  BEFORE UPDATE ON public.quickbooks_customers
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_quickbooks_items_updated_at
  BEFORE UPDATE ON public.quickbooks_items
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Enhanced document versioning system
ALTER TABLE public.documents 
ADD COLUMN parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
ADD COLUMN version_notes TEXT,
ADD COLUMN checksum TEXT,
ADD COLUMN approved_by UUID REFERENCES public.user_profiles(id),
ADD COLUMN approved_at TIMESTAMP WITH TIME ZONE;

-- Document version history table for better tracking
CREATE TABLE public.document_versions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  file_path TEXT NOT NULL,
  file_size INTEGER,
  checksum TEXT,
  version_notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  is_current BOOLEAN DEFAULT false
);

-- Enable RLS on document versions
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;

-- RLS policies for document versions
CREATE POLICY "Users can view company document versions" 
ON public.document_versions 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM public.documents d 
  WHERE d.id = document_versions.document_id 
  AND (d.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
));

CREATE POLICY "Office staff can manage document versions" 
ON public.document_versions 
FOR ALL 
USING (EXISTS (
  SELECT 1 FROM public.documents d 
  WHERE d.id = document_versions.document_id 
  AND d.company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'office_staff'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
));

-- Function to create new document version
CREATE OR REPLACE FUNCTION public.create_document_version(
  p_document_id UUID,
  p_file_path TEXT,
  p_file_size INTEGER,
  p_checksum TEXT DEFAULT NULL,
  p_version_notes TEXT DEFAULT NULL
) RETURNS UUID AS $$
DECLARE
  new_version_number INTEGER;
  version_id UUID;
BEGIN
  -- Get next version number
  SELECT COALESCE(MAX(version_number), 0) + 1
  INTO new_version_number
  FROM public.document_versions
  WHERE document_id = p_document_id;

  -- Mark all existing versions as not current
  UPDATE public.document_versions
  SET is_current = false
  WHERE document_id = p_document_id;

  -- Create new version
  INSERT INTO public.document_versions (
    document_id,
    version_number,
    file_path,
    file_size,
    checksum,
    version_notes,
    created_by,
    is_current
  ) VALUES (
    p_document_id,
    new_version_number,
    p_file_path,
    p_file_size,
    p_checksum,
    p_version_notes,
    auth.uid(),
    true
  ) RETURNING id INTO version_id;

  -- Update main document record
  UPDATE public.documents
  SET 
    file_path = p_file_path,
    file_size = p_file_size,
    version = new_version_number,
    updated_at = now()
  WHERE id = p_document_id;

  RETURN version_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;