-- Document Management System (Simplified)
-- Create storage buckets for documents
INSERT INTO storage.buckets (id, name, public) 
VALUES 
  ('documents', 'documents', false),
  ('templates', 'templates', false),
  ('signatures', 'signatures', false)
ON CONFLICT (id) DO NOTHING;

-- Create document categories table
CREATE TABLE IF NOT EXISTS public.document_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#6B7280',
  icon TEXT DEFAULT 'folder',
  parent_category_id UUID REFERENCES public.document_categories(id) ON DELETE CASCADE,
  is_system_category BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE(company_id, name)
);

-- Create documents table
CREATE TABLE IF NOT EXISTS public.documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  
  -- Document metadata
  name TEXT NOT NULL,
  description TEXT,
  file_name TEXT NOT NULL,
  file_path TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  file_type TEXT NOT NULL,
  mime_type TEXT,
  
  -- Version control
  version TEXT NOT NULL DEFAULT '1.0',
  is_current_version BOOLEAN DEFAULT true,
  parent_document_id UUID REFERENCES public.documents(id) ON DELETE CASCADE,
  version_notes TEXT,
  
  -- Document properties
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'review', 'approved', 'archived', 'deleted')),
  tags TEXT[] DEFAULT '{}',
  
  -- Access control
  is_public BOOLEAN DEFAULT false,
  password_protected BOOLEAN DEFAULT false,
  expires_at TIMESTAMP WITH TIME ZONE,
  
  -- Tracking
  uploaded_by UUID NOT NULL REFERENCES auth.users(id),
  last_modified_by UUID REFERENCES auth.users(id),
  downloaded_count INTEGER DEFAULT 0,
  viewed_count INTEGER DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create document templates table
CREATE TABLE IF NOT EXISTS public.document_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  category_id UUID REFERENCES public.document_categories(id) ON DELETE SET NULL,
  
  -- Template metadata
  name TEXT NOT NULL,
  description TEXT,
  template_type TEXT NOT NULL DEFAULT 'document' CHECK (template_type IN ('document', 'contract', 'invoice', 'report')),
  file_path TEXT NOT NULL,
  thumbnail_path TEXT,
  
  -- Template properties
  is_system_template BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  variables JSONB DEFAULT '{}',
  
  -- Access control
  is_public BOOLEAN DEFAULT false,
  
  created_by UUID NOT NULL REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create document signatures table
CREATE TABLE IF NOT EXISTS public.document_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES public.documents(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Signature details
  signer_name TEXT NOT NULL,
  signer_email TEXT NOT NULL,
  signer_role TEXT,
  signature_type TEXT NOT NULL DEFAULT 'electronic' CHECK (signature_type IN ('electronic', 'digital', 'wet')),
  signature_data TEXT,
  
  -- Signing process
  signing_order INTEGER DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'signed', 'declined', 'expired')),
  signed_at TIMESTAMP WITH TIME ZONE,
  
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at triggers
CREATE TRIGGER trigger_document_categories_updated_at
  BEFORE UPDATE ON public.document_categories
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_documents_updated_at
  BEFORE UPDATE ON public.documents
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_document_templates_updated_at
  BEFORE UPDATE ON public.document_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_documents_company_id ON public.documents(company_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON public.documents(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_category_id ON public.documents(category_id);
CREATE INDEX IF NOT EXISTS idx_documents_status ON public.documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_file_type ON public.documents(file_type);
CREATE INDEX IF NOT EXISTS idx_documents_tags ON public.documents USING GIN(tags);

-- Enable RLS
ALTER TABLE public.document_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for document_categories
CREATE POLICY "Users can view company document categories" ON public.document_categories
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Managers can manage document categories" ON public.document_categories
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
  );

-- Create RLS policies for documents
CREATE POLICY "Users can view company documents" ON public.documents
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    is_public = true OR
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Users can upload documents" ON public.documents
  FOR INSERT WITH CHECK (
    company_id = get_user_company(auth.uid()) AND 
    uploaded_by = auth.uid()
  );

CREATE POLICY "Users can update their documents" ON public.documents
  FOR UPDATE USING (
    company_id = get_user_company(auth.uid()) AND 
    (uploaded_by = auth.uid() OR get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'root_admin']))
  );

CREATE POLICY "Users can delete their documents" ON public.documents
  FOR DELETE USING (
    company_id = get_user_company(auth.uid()) AND 
    (uploaded_by = auth.uid() OR get_user_role(auth.uid()) = ANY(ARRAY['admin', 'root_admin']))
  );

-- Create RLS policies for document_signatures
CREATE POLICY "Users can view document signatures" ON public.document_signatures
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "System can manage signatures" ON public.document_signatures
  FOR ALL USING (true);

-- Create RLS policies for document_templates
CREATE POLICY "Users can view templates" ON public.document_templates
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    is_public = true OR
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Managers can manage templates" ON public.document_templates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin'])
  );