-- Create equipment inventory table (if not exists)
CREATE TABLE IF NOT EXISTS public.equipment_inventory (
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

-- Create maintenance records table (if not exists)
CREATE TABLE IF NOT EXISTS public.maintenance_records (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id uuid NOT NULL,
  equipment_id uuid,
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

-- Create labor rates table (if not exists)
CREATE TABLE IF NOT EXISTS public.labor_rates (
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

-- Create material pricing table (if not exists)
CREATE TABLE IF NOT EXISTS public.material_pricing (
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

-- Create certifications table (if not exists)
CREATE TABLE IF NOT EXISTS public.certifications (
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

-- Enable RLS (only if not already enabled)
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'equipment_inventory' AND rowsecurity = true) THEN
    ALTER TABLE public.equipment_inventory ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'maintenance_records' AND rowsecurity = true) THEN
    ALTER TABLE public.maintenance_records ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'labor_rates' AND rowsecurity = true) THEN
    ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'material_pricing' AND rowsecurity = true) THEN
    ALTER TABLE public.material_pricing ENABLE ROW LEVEL SECURITY;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM pg_tables WHERE tablename = 'certifications' AND rowsecurity = true) THEN
    ALTER TABLE public.certifications ENABLE ROW LEVEL SECURITY;
  END IF;
END $$;

-- Create RLS policies (drop if exists to avoid conflicts)
DO $$ BEGIN
  -- Equipment policies
  DROP POLICY IF EXISTS "Users can view company equipment inventory" ON public.equipment_inventory;
  DROP POLICY IF EXISTS "Staff can manage equipment inventory" ON public.equipment_inventory;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'equipment_inventory') THEN
    CREATE POLICY "Users can view company equipment inventory" ON public.equipment_inventory FOR SELECT USING (company_id = get_user_company(auth.uid()));
    CREATE POLICY "Staff can manage equipment inventory" ON public.equipment_inventory FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));
  END IF;

  -- Maintenance records policies
  DROP POLICY IF EXISTS "Users can view company maintenance records" ON public.maintenance_records;
  DROP POLICY IF EXISTS "Staff can manage maintenance records" ON public.maintenance_records;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'maintenance_records') THEN
    CREATE POLICY "Users can view company maintenance records" ON public.maintenance_records FOR SELECT USING (company_id = get_user_company(auth.uid()));
    CREATE POLICY "Staff can manage maintenance records" ON public.maintenance_records FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'superintendent'::user_role, 'root_admin'::user_role])));
  END IF;

  -- Labor rates policies
  DROP POLICY IF EXISTS "Users can view company labor rates" ON public.labor_rates;
  DROP POLICY IF EXISTS "Staff can manage labor rates" ON public.labor_rates;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'labor_rates') THEN
    CREATE POLICY "Users can view company labor rates" ON public.labor_rates FOR SELECT USING (company_id = get_user_company(auth.uid()));
    CREATE POLICY "Staff can manage labor rates" ON public.labor_rates FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'accounting'::user_role, 'root_admin'::user_role])));
  END IF;

  -- Material pricing policies
  DROP POLICY IF EXISTS "Users can view company material pricing" ON public.material_pricing;
  DROP POLICY IF EXISTS "Staff can manage material pricing" ON public.material_pricing;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'material_pricing') THEN
    CREATE POLICY "Users can view company material pricing" ON public.material_pricing FOR SELECT USING (company_id = get_user_company(auth.uid()));
    CREATE POLICY "Staff can manage material pricing" ON public.material_pricing FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'accounting'::user_role, 'root_admin'::user_role])));
  END IF;

  -- Certifications policies
  DROP POLICY IF EXISTS "Users can view company certifications" ON public.certifications;
  DROP POLICY IF EXISTS "Staff can manage certifications" ON public.certifications;
  
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'certifications') THEN
    CREATE POLICY "Users can view company certifications" ON public.certifications FOR SELECT USING (company_id = get_user_company(auth.uid()));
    CREATE POLICY "Staff can manage certifications" ON public.certifications FOR ALL USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'project_manager'::user_role, 'safety_officer'::user_role, 'root_admin'::user_role])));
  END IF;
END $$;