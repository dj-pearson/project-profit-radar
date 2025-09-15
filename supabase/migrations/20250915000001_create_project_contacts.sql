-- Create project_contacts table for project-specific contact management
CREATE TABLE IF NOT EXISTS public.project_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Contact information
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  mobile_phone TEXT,
  title TEXT,
  company_name TEXT,
  
  -- Contact role/type
  contact_type TEXT NOT NULL CHECK (contact_type IN ('client', 'architect', 'engineer', 'subcontractor', 'supplier', 'inspector', 'project_manager', 'foreman', 'other')),
  role_description TEXT,
  
  -- Contact details
  address TEXT,
  notes TEXT,
  is_primary BOOLEAN DEFAULT false,
  is_emergency_contact BOOLEAN DEFAULT false,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  
  -- Metadata
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view project contacts for their company projects"
ON public.project_contacts FOR SELECT
USING (
  project_id IN (
    SELECT p.id FROM public.projects p
    WHERE p.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Users can manage project contacts for their company projects"
ON public.project_contacts FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

-- Create indexes
CREATE INDEX idx_project_contacts_project_id ON public.project_contacts(project_id);
CREATE INDEX idx_project_contacts_company_id ON public.project_contacts(company_id);
CREATE INDEX idx_project_contacts_contact_type ON public.project_contacts(contact_type);
CREATE INDEX idx_project_contacts_is_active ON public.project_contacts(is_active);

-- Create trigger for updated_at
CREATE TRIGGER update_project_contacts_updated_at
  BEFORE UPDATE ON public.project_contacts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
