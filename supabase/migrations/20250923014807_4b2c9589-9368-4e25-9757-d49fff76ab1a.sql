-- Advanced Invoicing System Tables
-- Create invoices table
CREATE TABLE IF NOT EXISTS public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  project_id UUID REFERENCES public.projects(id) ON DELETE SET NULL,
  invoice_number TEXT NOT NULL,
  client_name TEXT NOT NULL,
  client_email TEXT NOT NULL,
  client_address TEXT,
  invoice_date DATE NOT NULL DEFAULT CURRENT_DATE,
  due_date DATE NOT NULL,
  subtotal DECIMAL(15,2) NOT NULL DEFAULT 0,
  tax_rate DECIMAL(5,2) DEFAULT 0,
  tax_amount DECIMAL(15,2) DEFAULT 0,
  discount_amount DECIMAL(15,2) DEFAULT 0,
  total_amount DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_due DECIMAL(15,2) NOT NULL DEFAULT 0,
  amount_paid DECIMAL(15,2) DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'sent', 'viewed', 'partial', 'paid', 'overdue', 'cancelled')),
  invoice_type TEXT NOT NULL DEFAULT 'standard' CHECK (invoice_type IN ('standard', 'progress', 'retention', 'final')),
  
  -- Progress billing fields
  progress_percentage DECIMAL(5,2),
  previous_amount_billed DECIMAL(15,2) DEFAULT 0,
  current_amount_due DECIMAL(15,2),
  
  -- Retention fields
  retention_percentage DECIMAL(5,2) DEFAULT 0,
  retention_amount DECIMAL(15,2) DEFAULT 0,
  retention_due_date DATE,
  
  notes TEXT,
  terms TEXT DEFAULT 'Payment is due within 30 days of invoice date.',
  
  -- Tracking fields
  sent_at TIMESTAMP WITH TIME ZONE,
  viewed_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE,
  
  -- Metadata
  payment_method TEXT,
  reference_number TEXT,
  po_number TEXT,
  
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice line items table
CREATE TABLE IF NOT EXISTS public.invoice_line_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  quantity DECIMAL(10,3) NOT NULL DEFAULT 1,
  unit_price DECIMAL(15,2) NOT NULL,
  line_total DECIMAL(15,2) NOT NULL,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  project_phase_id UUID,
  work_completed_percentage DECIMAL(5,2),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice payments table
CREATE TABLE IF NOT EXISTS public.invoice_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_amount DECIMAL(15,2) NOT NULL,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT NOT NULL DEFAULT 'manual' CHECK (payment_method IN ('manual', 'stripe', 'check', 'wire', 'ach')),
  reference_number TEXT,
  notes TEXT,
  stripe_payment_intent_id TEXT,
  processed_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create invoice templates table
CREATE TABLE IF NOT EXISTS public.invoice_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL DEFAULT 'standard',
  is_default BOOLEAN DEFAULT false,
  header_logo_url TEXT,
  company_info TEXT,
  payment_terms TEXT,
  footer_text TEXT,
  color_scheme JSONB DEFAULT '{"primary": "#FF6B35", "text": "#000000", "background": "#FFFFFF"}',
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create sequences for invoice numbering
CREATE SEQUENCE IF NOT EXISTS invoice_number_seq START 1000;

-- Create function to generate invoice numbers
CREATE OR REPLACE FUNCTION generate_invoice_number()
RETURNS TEXT AS $$
DECLARE
  invoice_num TEXT;
BEGIN
  invoice_num := 'INV-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 4, '0');
  RETURN invoice_num;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger to auto-generate invoice numbers
CREATE OR REPLACE FUNCTION set_invoice_number()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.invoice_number IS NULL OR NEW.invoice_number = '' THEN
    NEW.invoice_number := generate_invoice_number();
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_set_invoice_number
  BEFORE INSERT ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION set_invoice_number();

-- Create function to update invoice totals
CREATE OR REPLACE FUNCTION update_invoice_totals()
RETURNS TRIGGER AS $$
DECLARE
  invoice_record RECORD;
  line_items_total DECIMAL(15,2);
BEGIN
  -- Get invoice record
  SELECT * INTO invoice_record FROM public.invoices WHERE id = COALESCE(NEW.invoice_id, OLD.invoice_id);
  
  -- Calculate line items total
  SELECT COALESCE(SUM(line_total), 0) INTO line_items_total
  FROM public.invoice_line_items 
  WHERE invoice_id = invoice_record.id;
  
  -- Update invoice totals
  UPDATE public.invoices SET
    subtotal = line_items_total,
    tax_amount = line_items_total * (tax_rate / 100),
    total_amount = line_items_total + (line_items_total * (tax_rate / 100)) - discount_amount,
    amount_due = line_items_total + (line_items_total * (tax_rate / 100)) - discount_amount - COALESCE(amount_paid, 0),
    updated_at = now()
  WHERE id = invoice_record.id;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create triggers for invoice total updates
CREATE TRIGGER trigger_update_invoice_totals_on_line_items
  AFTER INSERT OR UPDATE OR DELETE ON public.invoice_line_items
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_totals();

-- Create function to update invoice status based on payments
CREATE OR REPLACE FUNCTION update_invoice_status_on_payment()
RETURNS TRIGGER AS $$
DECLARE
  invoice_record RECORD;
  total_paid DECIMAL(15,2);
BEGIN
  -- Get invoice record
  SELECT * INTO invoice_record FROM public.invoices WHERE id = NEW.invoice_id;
  
  -- Calculate total payments
  SELECT COALESCE(SUM(payment_amount), 0) INTO total_paid
  FROM public.invoice_payments 
  WHERE invoice_id = invoice_record.id;
  
  -- Update invoice with new payment info
  UPDATE public.invoices SET
    amount_paid = total_paid,
    amount_due = total_amount - total_paid,
    status = CASE 
      WHEN total_paid >= total_amount THEN 'paid'
      WHEN total_paid > 0 THEN 'partial'
      ELSE status
    END,
    paid_at = CASE 
      WHEN total_paid >= total_amount AND paid_at IS NULL THEN now()
      ELSE paid_at
    END,
    updated_at = now()
  WHERE id = invoice_record.id;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for payment status updates
CREATE TRIGGER trigger_update_invoice_status_on_payment
  AFTER INSERT ON public.invoice_payments
  FOR EACH ROW
  EXECUTE FUNCTION update_invoice_status_on_payment();

-- Create updated_at triggers
CREATE TRIGGER trigger_invoices_updated_at
  BEFORE UPDATE ON public.invoices
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trigger_invoice_templates_updated_at
  BEFORE UPDATE ON public.invoice_templates
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON public.invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_project_id ON public.invoices(project_id);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_due_date ON public.invoices(due_date);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_number ON public.invoices(invoice_number);
CREATE INDEX IF NOT EXISTS idx_invoice_line_items_invoice_id ON public.invoice_line_items(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_invoice_id ON public.invoice_payments(invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_payments_company_id ON public.invoice_payments(company_id);
CREATE INDEX IF NOT EXISTS idx_invoice_templates_company_id ON public.invoice_templates(company_id);

-- Enable RLS
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_templates ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for invoices
CREATE POLICY "Users can view company invoices" ON public.invoices
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage company invoices" ON public.invoices
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'accounting', 'office_staff', 'root_admin'])
  );

-- Create RLS policies for invoice line items
CREATE POLICY "Users can view invoice line items" ON public.invoice_line_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND invoices.company_id = get_user_company(auth.uid())
    )
  );

CREATE POLICY "Staff can manage invoice line items" ON public.invoice_line_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.invoices 
      WHERE invoices.id = invoice_line_items.invoice_id 
      AND invoices.company_id = get_user_company(auth.uid())
    ) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'accounting', 'office_staff', 'root_admin'])
  );

-- Create RLS policies for invoice payments
CREATE POLICY "Users can view invoice payments" ON public.invoice_payments
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage invoice payments" ON public.invoice_payments
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'accounting', 'office_staff', 'root_admin'])
  );

-- Create RLS policies for invoice templates
CREATE POLICY "Users can view company invoice templates" ON public.invoice_templates
  FOR SELECT USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Staff can manage invoice templates" ON public.invoice_templates
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'accounting', 'office_staff', 'root_admin'])
  );