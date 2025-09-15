-- Create cross_module_relationships table for tracking relationships between different modules
CREATE TABLE public.cross_module_relationships (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  source_module TEXT NOT NULL, -- 'crm', 'projects', 'financial', 'materials', etc.
  source_id UUID NOT NULL,
  target_module TEXT NOT NULL,
  target_id UUID NOT NULL,
  relationship_type TEXT NOT NULL, -- 'created_from', 'generated', 'associated_with', etc.
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create indexes for performance
CREATE INDEX idx_cross_module_relationships_company_id ON public.cross_module_relationships(company_id);
CREATE INDEX idx_cross_module_relationships_source ON public.cross_module_relationships(source_module, source_id);
CREATE INDEX idx_cross_module_relationships_target ON public.cross_module_relationships(target_module, target_id);
CREATE INDEX idx_cross_module_relationships_type ON public.cross_module_relationships(relationship_type);

-- Enable RLS
ALTER TABLE public.cross_module_relationships ENABLE ROW LEVEL SECURITY;

-- Policy for users to view relationships within their company
CREATE POLICY "Users can view cross-module relationships for their company"
ON public.cross_module_relationships FOR SELECT
USING (company_id = get_user_company(auth.uid()));

-- Policy for users to manage relationships within their company
CREATE POLICY "Users can manage cross-module relationships for their company"
ON public.cross_module_relationships FOR ALL
USING (company_id = get_user_company(auth.uid()));

-- Trigger for updated_at
CREATE TRIGGER update_cross_module_relationships_updated_at
BEFORE UPDATE ON public.cross_module_relationships
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Add opportunity_id column to projects table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'opportunity_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN opportunity_id UUID REFERENCES public.opportunities(id);
        
        CREATE INDEX idx_projects_opportunity_id ON public.projects(opportunity_id);
    END IF;
END $$;

-- Add project_id column to opportunities table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'opportunities' 
        AND column_name = 'project_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.opportunities 
        ADD COLUMN project_id UUID REFERENCES public.projects(id);
        
        CREATE INDEX idx_opportunities_project_id ON public.opportunities(project_id);
    END IF;
END $$;

-- Add crm_contact_id column to project_contacts table if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'project_contacts' 
        AND column_name = 'crm_contact_id'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.project_contacts 
        ADD COLUMN crm_contact_id UUID REFERENCES public.contacts(id);
        
        CREATE INDEX idx_project_contacts_crm_contact_id ON public.project_contacts(crm_contact_id);
    END IF;
END $$;

-- Add created_from column to projects table to track how project was created
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'projects' 
        AND column_name = 'created_from'
        AND table_schema = 'public'
    ) THEN
        ALTER TABLE public.projects 
        ADD COLUMN created_from TEXT CHECK (created_from IN ('manual', 'opportunity', 'template', 'import'));
    END IF;
END $$;
