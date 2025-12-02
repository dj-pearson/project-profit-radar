-- Create materials and material_usage tables for inventory management

-- Create materials table
CREATE TABLE IF NOT EXISTS public.materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_cost NUMERIC NOT NULL DEFAULT 0,
  quantity_available NUMERIC NOT NULL DEFAULT 0,
  minimum_stock_level NUMERIC NOT NULL DEFAULT 0,
  supplier_name TEXT,
  supplier_contact TEXT,
  last_ordered_date DATE,
  location TEXT,
  material_code TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;

-- Create policies for materials
CREATE POLICY "Users can view company materials"
ON public.materials FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Admins can manage materials"
ON public.materials FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
);

-- Create material_usage table
CREATE TABLE IF NOT EXISTS public.material_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  material_id UUID NOT NULL REFERENCES public.materials(id) ON DELETE CASCADE,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  quantity_used NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  date_used DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  used_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for material_usage
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;

-- Create policies for material_usage
CREATE POLICY "Users can view company material usage"
ON public.material_usage FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.materials m 
    WHERE m.id = material_usage.material_id 
    AND (m.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
  )
);

CREATE POLICY "Staff can manage material usage"
ON public.material_usage FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.materials m 
    WHERE m.id = material_usage.material_id 
    AND m.company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'office_staff', 'root_admin']::user_role[])
  )
);

-- Create indexes for performance
CREATE INDEX idx_materials_company_id ON public.materials(company_id);
CREATE INDEX idx_materials_category ON public.materials(category);
CREATE INDEX idx_materials_active ON public.materials(is_active);
CREATE INDEX idx_material_usage_material_id ON public.material_usage(material_id);
CREATE INDEX idx_material_usage_project_id ON public.material_usage(project_id);
CREATE INDEX idx_material_usage_date ON public.material_usage(date_used);

-- Add triggers for updated_at
CREATE TRIGGER update_materials_updated_at
  BEFORE UPDATE ON public.materials
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.materials IS 'Inventory management for construction materials';
COMMENT ON TABLE public.material_usage IS 'Track material consumption across projects';