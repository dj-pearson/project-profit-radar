-- Enhanced Job Costing Tables

-- Project Cost Codes table
CREATE TABLE public.project_cost_codes (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  code VARCHAR(50) NOT NULL,
  description TEXT NOT NULL,
  category TEXT CHECK (category IN ('labor', 'materials', 'equipment', 'overhead', 'subcontractor')) NOT NULL,
  budget_amount DECIMAL(15,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, code)
);

-- Project Cost Entries table
CREATE TABLE public.project_cost_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  cost_code_id UUID NOT NULL REFERENCES public.project_cost_codes(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  entry_type TEXT CHECK (entry_type IN ('labor', 'material', 'equipment', 'overhead', 'subcontractor')) NOT NULL,
  amount DECIMAL(15,2) NOT NULL,
  quantity DECIMAL(10,3),
  unit_cost DECIMAL(15,2),
  description TEXT,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Labor Rates table
CREATE TABLE public.labor_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  trade VARCHAR(100) NOT NULL,
  base_rate DECIMAL(10,2) NOT NULL,
  overtime_rate DECIMAL(10,2) NOT NULL,
  current_rate DECIMAL(10,2) NOT NULL,
  efficiency_factor DECIMAL(5,3) DEFAULT 1.0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, trade)
);

-- Material Pricing table
CREATE TABLE public.material_pricing (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  material_name VARCHAR(200) NOT NULL,
  current_price DECIMAL(15,2) NOT NULL,
  previous_price DECIMAL(15,2),
  price_change_percentage DECIMAL(8,3) DEFAULT 0,
  price_trend TEXT CHECK (price_trend IN ('up', 'down', 'stable')) DEFAULT 'stable',
  supplier VARCHAR(200),
  unit_of_measure VARCHAR(50),
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.project_cost_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_cost_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.labor_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_pricing ENABLE ROW LEVEL SECURITY;

-- RLS policies for project_cost_codes
CREATE POLICY "Users can view cost codes for their company projects" 
ON public.project_cost_codes FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create cost codes for their company projects" 
ON public.project_cost_codes FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update cost codes for their company projects" 
ON public.project_cost_codes FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete cost codes for their company projects" 
ON public.project_cost_codes FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS policies for project_cost_entries
CREATE POLICY "Users can view cost entries for their company" 
ON public.project_cost_entries FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can create cost entries for their company" 
ON public.project_cost_entries FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can update cost entries for their company" 
ON public.project_cost_entries FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can delete cost entries for their company" 
ON public.project_cost_entries FOR DELETE 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS policies for labor_rates
CREATE POLICY "Users can view labor rates for their company" 
ON public.labor_rates FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage labor rates for their company" 
ON public.labor_rates FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- RLS policies for material_pricing
CREATE POLICY "Users can view material pricing for their company" 
ON public.material_pricing FOR SELECT 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage material pricing for their company" 
ON public.material_pricing FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.profiles WHERE id = auth.uid()
  )
);

-- Create indexes for performance
CREATE INDEX idx_project_cost_codes_project_id ON public.project_cost_codes(project_id);
CREATE INDEX idx_project_cost_codes_company_id ON public.project_cost_codes(company_id);
CREATE INDEX idx_project_cost_entries_cost_code_id ON public.project_cost_entries(cost_code_id);
CREATE INDEX idx_project_cost_entries_company_id ON public.project_cost_entries(company_id);
CREATE INDEX idx_labor_rates_company_id ON public.labor_rates(company_id);
CREATE INDEX idx_material_pricing_company_id ON public.material_pricing(company_id);

-- Create triggers for updated_at
CREATE TRIGGER update_project_cost_codes_updated_at
  BEFORE UPDATE ON public.project_cost_codes
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_cost_entries_updated_at
  BEFORE UPDATE ON public.project_cost_entries
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_labor_rates_updated_at
  BEFORE UPDATE ON public.labor_rates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_pricing_updated_at
  BEFORE UPDATE ON public.material_pricing
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert sample labor rates
INSERT INTO public.labor_rates (company_id, trade, base_rate, overtime_rate, current_rate, efficiency_factor)
SELECT 
  id as company_id,
  unnest(ARRAY['General Labor', 'Carpenter', 'Electrician', 'Plumber', 'HVAC Technician', 'Concrete Finisher']) as trade,
  unnest(ARRAY[25.00, 35.00, 45.00, 42.00, 40.00, 32.00]) as base_rate,
  unnest(ARRAY[37.50, 52.50, 67.50, 63.00, 60.00, 48.00]) as overtime_rate,
  unnest(ARRAY[25.00, 35.00, 45.00, 42.00, 40.00, 32.00]) as current_rate,
  unnest(ARRAY[1.0, 1.1, 1.2, 1.15, 1.05, 0.95]) as efficiency_factor
FROM public.companies
LIMIT 1;

-- Insert sample material pricing
INSERT INTO public.material_pricing (company_id, material_name, current_price, previous_price, price_change_percentage, price_trend, supplier, unit_of_measure)
SELECT 
  id as company_id,
  unnest(ARRAY['Lumber 2x4x8', 'Concrete Mix', 'Steel Rebar', 'Insulation R-13', 'Electrical Wire 12AWG', 'PVC Pipe 4"']) as material_name,
  unnest(ARRAY[8.50, 4.25, 0.85, 0.65, 1.25, 12.50]) as current_price,
  unnest(ARRAY[8.00, 4.00, 0.80, 0.60, 1.20, 12.00]) as previous_price,
  unnest(ARRAY[6.25, 6.25, 6.25, 8.33, 4.17, 4.17]) as price_change_percentage,
  unnest(ARRAY['up', 'up', 'up', 'up', 'up', 'up']) as price_trend,
  unnest(ARRAY['Home Depot', 'ABC Supply', 'Steel Supply Co', 'Insulation Plus', 'Electrical Supply', 'Plumbing Depot']) as supplier,
  unnest(ARRAY['each', 'bag', 'lb', 'sq ft', 'ft', 'ft']) as unit_of_measure
FROM public.companies
LIMIT 1;