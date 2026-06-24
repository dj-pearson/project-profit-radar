-- Create project_contacts junction table to link contacts to projects
CREATE TABLE public.project_contacts (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  contact_id uuid NOT NULL REFERENCES public.contacts(id) ON DELETE CASCADE,
  role text, -- Role of contact in this specific project (e.g., 'project_manager', 'client_contact', 'inspector', etc.)
  is_primary boolean DEFAULT false, -- Whether this is the primary contact for this role
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  
  -- Ensure no duplicate contact-project combinations with same role
  UNIQUE(project_id, contact_id, role)
);

-- Enable RLS
ALTER TABLE public.project_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for project_contacts
CREATE POLICY "Users can view project contacts for their company projects"
ON public.project_contacts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_contacts.project_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage project contacts for their company projects"
ON public.project_contacts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.projects p 
    WHERE p.id = project_contacts.project_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);