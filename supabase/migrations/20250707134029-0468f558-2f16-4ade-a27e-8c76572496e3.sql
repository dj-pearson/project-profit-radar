-- Create permits management tables
CREATE TABLE public.permits (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  
  -- Permit details
  permit_type TEXT NOT NULL,
  permit_number TEXT,
  permit_name TEXT NOT NULL,
  description TEXT,
  issuing_authority TEXT NOT NULL,
  
  -- Application details
  application_date DATE,
  application_fee NUMERIC(10,2) DEFAULT 0,
  application_status TEXT NOT NULL DEFAULT 'not_applied' CHECK (application_status IN ('not_applied', 'preparing', 'submitted', 'under_review', 'approved', 'denied', 'expired', 'cancelled')),
  
  -- Approval details
  approval_date DATE,
  permit_fee NUMERIC(10,2) DEFAULT 0,
  permit_start_date DATE,
  permit_expiry_date DATE,
  
  -- Contact and document info
  contact_name TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  permit_document_path TEXT,
  application_document_path TEXT,
  
  -- Requirements and conditions
  requirements TEXT[],
  conditions TEXT,
  inspection_required BOOLEAN DEFAULT false,
  bond_required BOOLEAN DEFAULT false,
  bond_amount NUMERIC(10,2) DEFAULT 0,
  
  -- Status and tracking
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
  notes TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit inspections table
CREATE TABLE public.permit_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  
  -- Inspection details
  inspection_type TEXT NOT NULL,
  inspection_date DATE NOT NULL,
  inspector_name TEXT,
  inspector_contact TEXT,
  
  -- Results
  status TEXT NOT NULL DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'passed', 'failed', 'rescheduled', 'cancelled')),
  result_notes TEXT,
  corrections_required TEXT,
  reinspection_date DATE,
  
  -- Documentation
  inspection_document_path TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create permit renewals table
CREATE TABLE public.permit_renewals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  permit_id UUID NOT NULL REFERENCES public.permits(id) ON DELETE CASCADE,
  
  -- Renewal details
  renewal_date DATE NOT NULL,
  new_expiry_date DATE NOT NULL,
  renewal_fee NUMERIC(10,2) DEFAULT 0,
  renewal_reason TEXT,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'denied')),
  processed_date DATE,
  processed_by TEXT,
  
  -- Documentation
  renewal_document_path TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.permits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permit_renewals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for permits
CREATE POLICY "Users can view company permits" 
ON public.permits 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Staff can manage company permits" 
ON public.permits 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for permit inspections
CREATE POLICY "Users can view company permit inspections" 
ON public.permit_inspections 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.permits p 
    WHERE p.id = permit_inspections.permit_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage permit inspections" 
ON public.permit_inspections 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.permits p 
    WHERE p.id = permit_inspections.permit_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
  )
);

-- RLS Policies for permit renewals
CREATE POLICY "Users can view company permit renewals" 
ON public.permit_renewals 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.permits p 
    WHERE p.id = permit_renewals.permit_id 
    AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Staff can manage permit renewals" 
ON public.permit_renewals 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.permits p 
    WHERE p.id = permit_renewals.permit_id 
    AND p.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_permits_updated_at
  BEFORE UPDATE ON public.permits
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_inspections_updated_at
  BEFORE UPDATE ON public.permit_inspections
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_permit_renewals_updated_at
  BEFORE UPDATE ON public.permit_renewals
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_permits_company_project ON public.permits(company_id, project_id);
CREATE INDEX idx_permits_status ON public.permits(application_status);
CREATE INDEX idx_permits_expiry ON public.permits(permit_expiry_date);
CREATE INDEX idx_permit_inspections_permit_id ON public.permit_inspections(permit_id);
CREATE INDEX idx_permit_inspections_date ON public.permit_inspections(inspection_date);
CREATE INDEX idx_permit_renewals_permit_id ON public.permit_renewals(permit_id);