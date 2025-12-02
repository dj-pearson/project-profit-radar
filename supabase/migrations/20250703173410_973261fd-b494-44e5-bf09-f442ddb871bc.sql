-- Create invoices table for invoice management
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  invoice_number TEXT NOT NULL UNIQUE,
  client_name TEXT,
  client_email TEXT,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  
  -- Invoice details
  issue_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  
  -- Financial information
  subtotal NUMERIC(10,2) NOT NULL DEFAULT 0,
  tax_amount NUMERIC(10,2) DEFAULT 0,
  tax_rate NUMERIC(5,2) DEFAULT 0,
  discount_amount NUMERIC(10,2) DEFAULT 0,
  total_amount NUMERIC(10,2) NOT NULL,
  
  -- Payment tracking
  amount_paid NUMERIC(10,2) DEFAULT 0,
  amount_due NUMERIC(10,2) GENERATED ALWAYS AS (total_amount - amount_paid) STORED,
  
  -- Status and metadata
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'paid', 'overdue', 'cancelled')),
  notes TEXT,
  terms TEXT,
  
  -- Stripe integration
  stripe_invoice_id TEXT,
  stripe_payment_intent_id TEXT,
  
  -- Audit fields
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  sent_at TIMESTAMPTZ,
  paid_at TIMESTAMPTZ
);

-- Create invoice line items table
CREATE TABLE public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
  
  description TEXT NOT NULL,
  quantity NUMERIC(10,2) NOT NULL DEFAULT 1,
  unit_price NUMERIC(10,2) NOT NULL,
  total_price NUMERIC(10,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
  
  -- Optional references
  cost_code_id UUID REFERENCES cost_codes(id),
  project_phase_id UUID REFERENCES project_phases(id),
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;

-- Create policies for invoices
CREATE POLICY "Users can view company invoices" 
ON public.invoices 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Admins can manage company invoices" 
ON public.invoices 
FOR ALL 
USING (
  (company_id = get_user_company(auth.uid()) AND 
   get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role, 'root_admin'::user_role]))
);

-- Create policies for invoice line items
CREATE POLICY "Users can view invoice line items" 
ON public.invoice_line_items 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND (i.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin'::user_role)
  )
);

CREATE POLICY "Admins can manage invoice line items" 
ON public.invoice_line_items 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM invoices i 
    WHERE i.id = invoice_line_items.invoice_id 
    AND i.company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'accounting'::user_role, 'project_manager'::user_role, 'root_admin'::user_role])
  )
);

-- Create sequence for invoice numbers
CREATE SEQUENCE public.invoice_number_seq START 1000;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION public.generate_invoice_number()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  next_num INTEGER;
  invoice_num TEXT;
BEGIN
  SELECT nextval('public.invoice_number_seq') INTO next_num;
  invoice_num := 'INV-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION public.set_invoice_number()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER set_invoice_number_trigger
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.set_invoice_number();

-- Create trigger for updated_at
CREATE TRIGGER update_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();