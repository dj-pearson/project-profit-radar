-- Create estimates table
CREATE TABLE public.estimates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  project_id UUID REFERENCES public.projects(id),
  estimate_number TEXT NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  client_name TEXT,
  client_email TEXT,
  client_phone TEXT,
  site_address TEXT,
  
  -- Estimate details
  status TEXT NOT NULL DEFAULT 'draft',
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  markup_percentage NUMERIC(5,2) DEFAULT 20.00,
  tax_percentage NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(12,2) DEFAULT 0,
  
  -- Versioning
  version_number INTEGER NOT NULL DEFAULT 1,
  parent_estimate_id UUID REFERENCES public.estimates(id),
  is_current_version BOOLEAN DEFAULT true,
  
  -- Dates
  estimate_date DATE NOT NULL DEFAULT CURRENT_DATE,
  valid_until DATE,
  sent_date DATE,
  accepted_date DATE,
  
  -- Additional fields
  notes TEXT,
  terms_and_conditions TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, estimate_number)
);

-- Create estimate line items table
CREATE TABLE public.estimate_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  
  -- Item details
  item_name TEXT NOT NULL,
  description TEXT,
  category TEXT,
  
  -- Quantities and costs
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit TEXT NOT NULL DEFAULT 'each',
  unit_cost NUMERIC(10,2) NOT NULL DEFAULT 0,
  total_cost NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_cost) STORED,
  
  -- Labor details
  labor_hours NUMERIC(8,2),
  labor_rate NUMERIC(8,2),
  labor_cost NUMERIC(10,2),
  
  -- Material details
  material_cost NUMERIC(10,2),
  equipment_cost NUMERIC(10,2),
  
  -- Ordering
  sort_order INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Create estimate communications table for tracking sent estimates
CREATE TABLE public.estimate_communications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  estimate_id UUID NOT NULL REFERENCES public.estimates(id) ON DELETE CASCADE,
  
  communication_type TEXT NOT NULL, -- 'sent', 'viewed', 'accepted', 'rejected', 'follow_up'
  recipient_email TEXT,
  subject TEXT,
  message TEXT,
  
  sent_at TIMESTAMPTZ DEFAULT now(),
  viewed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.estimates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.estimate_communications ENABLE ROW LEVEL SECURITY;

-- RLS Policies for estimates
CREATE POLICY "Users can view company estimates" ON public.estimates
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) OR 
    get_user_role(auth.uid()) = 'root_admin'
  );

CREATE POLICY "Staff can manage estimates" ON public.estimates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
  );

-- RLS Policies for estimate line items
CREATE POLICY "Users can view company estimate line items" ON public.estimate_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estimates e 
      WHERE e.id = estimate_line_items.estimate_id 
      AND (e.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Staff can manage estimate line items" ON public.estimate_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.estimates e 
      WHERE e.id = estimate_line_items.estimate_id 
      AND e.company_id = get_user_company(auth.uid())
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
    )
  );

-- RLS Policies for estimate communications
CREATE POLICY "Users can view company estimate communications" ON public.estimate_communications
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.estimates e 
      WHERE e.id = estimate_communications.estimate_id 
      AND (e.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Staff can manage estimate communications" ON public.estimate_communications
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.estimates e 
      WHERE e.id = estimate_communications.estimate_id 
      AND e.company_id = get_user_company(auth.uid())
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'office_staff', 'root_admin']::user_role[])
    )
  );

-- Create function to generate estimate numbers
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  estimate_num TEXT;
BEGIN
  SELECT nextval('public.estimate_number_seq') INTO next_num;
  estimate_num := 'EST-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN estimate_num;
END;
$$;

-- Create sequence for estimate numbers
CREATE SEQUENCE IF NOT EXISTS public.estimate_number_seq START 1;

-- Create trigger to set estimate number
CREATE OR REPLACE FUNCTION public.set_estimate_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.estimate_number IS NULL OR NEW.estimate_number = '' THEN
    NEW.estimate_number := generate_estimate_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_estimate_number_trigger
  BEFORE INSERT ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.set_estimate_number();

-- Add updated_at triggers
CREATE TRIGGER update_estimates_updated_at
  BEFORE UPDATE ON public.estimates
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_estimate_line_items_updated_at
  BEFORE UPDATE ON public.estimate_line_items
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();