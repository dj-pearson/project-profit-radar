-- Create missing financial tables

-- Suppliers table
CREATE TABLE public.suppliers (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  is_preferred BOOLEAN DEFAULT false,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Material items table
CREATE TABLE public.material_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  unit TEXT NOT NULL DEFAULT 'each',
  current_cost NUMERIC NOT NULL DEFAULT 0,
  supplier_id UUID,
  sku TEXT,
  description TEXT,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Retention items table
CREATE TABLE public.retention_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  retention_type TEXT NOT NULL CHECK (retention_type IN ('contract', 'warranty', 'performance')),
  original_amount NUMERIC NOT NULL,
  current_amount NUMERIC NOT NULL,
  release_conditions TEXT,
  scheduled_release_date DATE,
  actual_release_date DATE,
  status TEXT NOT NULL DEFAULT 'held' CHECK (status IN ('held', 'eligible', 'requested', 'released')),
  release_percentage NUMERIC DEFAULT 100,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_items ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage company suppliers" ON public.suppliers
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company material items" ON public.material_items
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company retention items" ON public.retention_items
FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Add foreign key constraints
ALTER TABLE public.material_items ADD CONSTRAINT fk_material_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_material_items_company ON public.material_items(company_id);
CREATE INDEX idx_retention_items_company ON public.retention_items(company_id);

-- Add update triggers
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_items_updated_at BEFORE UPDATE ON public.material_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_retention_items_updated_at BEFORE UPDATE ON public.retention_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();