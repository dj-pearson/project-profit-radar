-- Create quality_inspections table
CREATE TABLE public.quality_inspections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  inspection_number TEXT NOT NULL,
  inspection_type TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'scheduled',
  scheduled_date DATE,
  conducted_date DATE,
  conducted_by UUID,
  client_signature_url TEXT,
  client_rating INTEGER,
  checklist_items JSONB DEFAULT '[]'::jsonb,
  deficiencies JSONB DEFAULT '[]'::jsonb,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create deficiencies table for tracking remediation
CREATE TABLE public.inspection_deficiencies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  inspection_id UUID NOT NULL,
  text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  due_date TIMESTAMP WITH TIME ZONE,
  assignee_id UUID,
  photos JSONB DEFAULT '[]'::jsonb,
  notes TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.quality_inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inspection_deficiencies ENABLE ROW LEVEL SECURITY;

-- Create policies for quality_inspections
CREATE POLICY "Users can view company inspections" 
ON public.quality_inspections 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage company inspections" 
ON public.quality_inspections 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
);

-- Create policies for inspection_deficiencies
CREATE POLICY "Users can view company deficiencies" 
ON public.inspection_deficiencies 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage company deficiencies" 
ON public.inspection_deficiencies 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'field_supervisor'::user_role, 'root_admin'::user_role])
);

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_quality_inspections_updated_at
BEFORE UPDATE ON public.quality_inspections
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_inspection_deficiencies_updated_at
BEFORE UPDATE ON public.inspection_deficiencies
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();