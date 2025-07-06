-- Create vendors/suppliers table
CREATE TABLE public.vendors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT,
  payment_terms TEXT DEFAULT 'Net 30',
  is_active BOOLEAN NOT NULL DEFAULT true,
  notes TEXT,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create purchase orders table
CREATE TABLE public.purchase_orders (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  po_number TEXT NOT NULL,
  vendor_id UUID NOT NULL REFERENCES public.vendors(id),
  project_id UUID REFERENCES public.projects(id),
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'approved', 'received', 'cancelled')),
  
  -- Dates
  po_date DATE NOT NULL DEFAULT CURRENT_DATE,
  delivery_date DATE,
  
  -- Financial
  subtotal NUMERIC(12,2) NOT NULL DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  tax_amount NUMERIC(12,2) DEFAULT 0,
  shipping_cost NUMERIC(12,2) DEFAULT 0,
  total_amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  
  -- Additional info
  delivery_address TEXT,
  notes TEXT,
  terms TEXT,
  
  -- Tracking
  created_by UUID REFERENCES public.user_profiles(id),
  approved_by UUID REFERENCES public.user_profiles(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  sent_at TIMESTAMP WITH TIME ZONE,
  received_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id, po_number)
);

-- Create purchase order line items table
CREATE TABLE public.purchase_order_line_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  purchase_order_id UUID NOT NULL REFERENCES public.purchase_orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL,
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  unit_of_measure TEXT DEFAULT 'each',
  cost_code_id UUID REFERENCES public.cost_codes(id),
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(purchase_order_id, line_number)
);

-- Create sequence for PO numbers
CREATE SEQUENCE public.po_number_seq START 1000;

-- Function to generate PO number
CREATE OR REPLACE FUNCTION public.generate_po_number(company_uuid UUID)
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  po_num TEXT;
BEGIN
  SELECT nextval('public.po_number_seq') INTO next_num;
  po_num := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN po_num;
END;
$$;

-- Trigger to set PO number
CREATE OR REPLACE FUNCTION public.set_po_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.po_number IS NULL OR NEW.po_number = '' THEN
    NEW.po_number := generate_po_number(NEW.company_id);
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_po_number_trigger
  BEFORE INSERT ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.set_po_number();

-- Enable RLS
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.purchase_order_line_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for vendors
CREATE POLICY "Users can view company vendors" 
ON public.vendors 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage company vendors" 
ON public.vendors 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for purchase orders
CREATE POLICY "Users can view company purchase orders" 
ON public.purchase_orders 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage company purchase orders" 
ON public.purchase_orders 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
);

-- RLS Policies for purchase order line items
CREATE POLICY "Users can view purchase order line items" 
ON public.purchase_order_line_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = purchase_order_line_items.purchase_order_id 
    AND po.company_id = get_user_company(auth.uid())
  )
);

CREATE POLICY "Staff can manage purchase order line items" 
ON public.purchase_order_line_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.purchase_orders po 
    WHERE po.id = purchase_order_line_items.purchase_order_id 
    AND po.company_id = get_user_company(auth.uid())
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'project_manager'::user_role, 'office_staff'::user_role, 'root_admin'::user_role])
  )
);

-- Add updated_at triggers
CREATE TRIGGER update_vendors_updated_at
  BEFORE UPDATE ON public.vendors
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_purchase_orders_updated_at
  BEFORE UPDATE ON public.purchase_orders
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();