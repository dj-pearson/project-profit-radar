-- Create materials table
CREATE TABLE public.materials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  unit TEXT NOT NULL DEFAULT 'unit',
  unit_cost NUMERIC DEFAULT 0,
  quantity_available INTEGER DEFAULT 0,
  minimum_stock_level INTEGER DEFAULT 0,
  supplier_name TEXT,
  supplier_contact TEXT,
  last_ordered_date DATE,
  location TEXT,
  material_code TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create equipment table
CREATE TABLE public.equipment (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id),
  name TEXT NOT NULL,
  description TEXT,
  equipment_type TEXT NOT NULL,
  model TEXT,
  serial_number TEXT,
  purchase_date DATE,
  purchase_cost NUMERIC DEFAULT 0,
  current_value NUMERIC DEFAULT 0,
  location TEXT,
  status TEXT DEFAULT 'available',
  maintenance_schedule TEXT,
  last_maintenance_date DATE,
  next_maintenance_date DATE,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Create material usage tracking
CREATE TABLE public.material_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  material_id UUID NOT NULL REFERENCES public.materials(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  quantity_used NUMERIC NOT NULL,
  unit_cost NUMERIC NOT NULL,
  total_cost NUMERIC NOT NULL,
  date_used DATE NOT NULL DEFAULT CURRENT_DATE,
  used_by UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create equipment usage tracking
CREATE TABLE public.equipment_usage (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  equipment_id UUID NOT NULL REFERENCES public.equipment(id),
  project_id UUID NOT NULL REFERENCES public.projects(id),
  start_date DATE NOT NULL,
  end_date DATE,
  hours_used NUMERIC DEFAULT 0,
  hourly_rate NUMERIC DEFAULT 0,
  total_cost NUMERIC DEFAULT 0,
  operator_id UUID REFERENCES auth.users(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipment_usage ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for materials
CREATE POLICY "Users can view company materials" ON public.materials FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage materials" ON public.materials FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']));

-- Create RLS policies for equipment
CREATE POLICY "Users can view company equipment" ON public.equipment FOR SELECT
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage equipment" ON public.equipment FOR ALL
USING (company_id = get_user_company(auth.uid()) AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']));

-- Create RLS policies for material usage
CREATE POLICY "Users can view company material usage" ON public.material_usage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.materials m 
  WHERE m.id = material_usage.material_id 
  AND (m.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
));

CREATE POLICY "Field staff can manage material usage" ON public.material_usage FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.materials m 
  WHERE m.id = material_usage.material_id 
  AND m.company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'office_staff', 'root_admin'])
));

-- Create RLS policies for equipment usage
CREATE POLICY "Users can view company equipment usage" ON public.equipment_usage FOR SELECT
USING (EXISTS (
  SELECT 1 FROM public.equipment e 
  WHERE e.id = equipment_usage.equipment_id 
  AND (e.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
));

CREATE POLICY "Field staff can manage equipment usage" ON public.equipment_usage FOR ALL
USING (EXISTS (
  SELECT 1 FROM public.equipment e 
  WHERE e.id = equipment_usage.equipment_id 
  AND e.company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'field_supervisor', 'office_staff', 'root_admin'])
));

-- Create triggers for updated_at
CREATE TRIGGER update_materials_updated_at BEFORE UPDATE ON public.materials
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_updated_at BEFORE UPDATE ON public.equipment
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_equipment_usage_updated_at BEFORE UPDATE ON public.equipment_usage
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();