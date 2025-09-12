-- Create equipment inventory table
CREATE TABLE public.equipment_inventory (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  name text NOT NULL,
  equipment_type text NOT NULL,
  make text,
  model text,
  year integer,
  serial_number text,
  status text NOT NULL DEFAULT 'available',
  location text,
  specifications jsonb DEFAULT '{}',
  purchase_price numeric,
  purchase_date date,
  current_value numeric,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create maintenance records table
CREATE TABLE public.maintenance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  equipment_id uuid NOT NULL REFERENCES public.equipment_inventory(id),
  maintenance_type text NOT NULL,
  description text,
  performed_by text,
  maintenance_date date NOT NULL,
  cost numeric DEFAULT 0,
  parts_used jsonb DEFAULT '[]',
  hours_spent numeric DEFAULT 0,
  notes text,
  next_due_date date,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create cost codes table
CREATE TABLE public.cost_codes (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  project_id uuid,
  code text NOT NULL,
  description text NOT NULL,
  category text NOT NULL,
  budget_amount numeric NOT NULL DEFAULT 0,
  actual_amount numeric NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create labor rates table
CREATE TABLE public.labor_rates (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  trade text NOT NULL,
  base_rate numeric NOT NULL,
  overtime_rate numeric NOT NULL,
  current_rate numeric NOT NULL,
  efficiency_factor numeric DEFAULT 1.0,
  effective_date date NOT NULL DEFAULT CURRENT_DATE,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create material pricing table
CREATE TABLE public.material_pricing (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  material_name text NOT NULL,
  current_price numeric NOT NULL,
  supplier text,
  price_trend text DEFAULT 'stable',
  price_change_percentage numeric DEFAULT 0,
  last_updated timestamp with time zone NOT NULL DEFAULT now(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Create certifications table
CREATE TABLE public.certifications (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  employee_name text NOT NULL,
  certification_type text NOT NULL,
  issue_date date NOT NULL,
  expiry_date date NOT NULL,
  status text NOT NULL DEFAULT 'valid',
  file_url text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_pricing ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can view company equipment inventory" ON public.equipment_inventory FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage equipment inventory" ON public.equipment_inventory FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company maintenance records" ON public.maintenance_records FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage maintenance records" ON public.maintenance_records FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company cost codes" ON public.cost_codes FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage cost codes" ON public.cost_codes FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'accounting'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company labor rates" ON public.labor_rates FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage labor rates" ON public.labor_rates FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'accounting'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company material pricing" ON public.material_pricing FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage material pricing" ON public.material_pricing FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'accounting'::user_role, 'root_admin'::user_role])));

CREATE POLICY "Users can view company certifications" ON public.certifications FOR SELECT USING (company_id = get_user_company(auth.uid()));
CREATE POLICY "Staff can manage certifications" ON public.certifications FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'safety_officer'::user_role, 'root_admin'::user_role])));

-- Add indexes for better performance
CREATE INDEX idx_equipment_inventory_company_id ON public.equipment_inventory(company_id);
CREATE INDEX idx_equipment_inventory_status ON public.equipment_inventory(status);
CREATE INDEX idx_maintenance_records_company_id ON public.maintenance_records(company_id);
CREATE INDEX idx_maintenance_records_equipment_id ON public.maintenance_records(equipment_id);
CREATE INDEX idx_cost_codes_company_id ON public.cost_codes(company_id);
CREATE INDEX idx_cost_codes_project_id ON public.cost_codes(project_id);
CREATE INDEX idx_labor_rates_company_id ON public.labor_rates(company_id);
CREATE INDEX idx_material_pricing_company_id ON public.material_pricing(company_id);
CREATE INDEX idx_certifications_company_id ON public.certifications(company_id);
CREATE INDEX idx_certifications_expiry_date ON public.certifications(expiry_date);

-- Add triggers for updated_at columns
CREATE TRIGGER update_equipment_inventory_updated_at 
  BEFORE UPDATE ON public.equipment_inventory 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_maintenance_records_updated_at 
  BEFORE UPDATE ON public.maintenance_records 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cost_codes_updated_at 
  BEFORE UPDATE ON public.cost_codes 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labor_rates_updated_at 
  BEFORE UPDATE ON public.labor_rates 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_pricing_updated_at 
  BEFORE UPDATE ON public.material_pricing 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_certifications_updated_at 
  BEFORE UPDATE ON public.certifications 
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();