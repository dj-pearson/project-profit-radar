-- Create tables for financial components that are still using mock data

-- Labor burden rates table
CREATE TABLE public.labor_burden_rates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  rate_name TEXT NOT NULL,
  base_hourly_rate NUMERIC NOT NULL DEFAULT 0,
  worker_compensation_rate NUMERIC NOT NULL DEFAULT 0,
  general_liability_rate NUMERIC NOT NULL DEFAULT 0,
  unemployment_insurance_rate NUMERIC NOT NULL DEFAULT 0,
  social_security_rate NUMERIC NOT NULL DEFAULT 6.2,
  medicare_rate NUMERIC NOT NULL DEFAULT 1.45,
  federal_unemployment_rate NUMERIC NOT NULL DEFAULT 0.6,
  state_unemployment_rate NUMERIC NOT NULL DEFAULT 0,
  health_insurance_monthly NUMERIC NOT NULL DEFAULT 0,
  retirement_match_percentage NUMERIC NOT NULL DEFAULT 0,
  vacation_sick_percentage NUMERIC NOT NULL DEFAULT 8,
  other_benefits_monthly NUMERIC NOT NULL DEFAULT 0,
  total_burden_percentage NUMERIC GENERATED ALWAYS AS (
    worker_compensation_rate + general_liability_rate + unemployment_insurance_rate +
    social_security_rate + medicare_rate + federal_unemployment_rate + state_unemployment_rate
  ) STORED,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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

-- Collection items for late payments
CREATE TABLE public.collection_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
  client_name TEXT NOT NULL,
  invoice_number TEXT NOT NULL,
  original_amount NUMERIC NOT NULL,
  outstanding_balance NUMERIC NOT NULL,
  due_date DATE NOT NULL,
  days_overdue INTEGER GENERATED ALWAYS AS (CURRENT_DATE - due_date) STORED,
  collection_status TEXT NOT NULL DEFAULT 'pending' CHECK (collection_status IN ('pending', 'contacted', 'payment_plan', 'legal', 'collected', 'written_off')),
  last_contact_date DATE,
  next_action_date DATE,
  notes TEXT,
  collection_agency TEXT,
  payment_plan_amount NUMERIC,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Payment applications table
CREATE TABLE public.payment_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  application_number TEXT NOT NULL,
  billing_period_start DATE NOT NULL,
  billing_period_end DATE NOT NULL,
  work_completed_amount NUMERIC NOT NULL DEFAULT 0,
  materials_stored_amount NUMERIC NOT NULL DEFAULT 0,
  total_completed_and_stored NUMERIC GENERATED ALWAYS AS (work_completed_amount + materials_stored_amount) STORED,
  less_previous_certificates NUMERIC NOT NULL DEFAULT 0,
  current_payment_due NUMERIC GENERATED ALWAYS AS (work_completed_and_stored - less_previous_certificates) STORED,
  less_retention NUMERIC NOT NULL DEFAULT 0,
  net_amount NUMERIC GENERATED ALWAYS AS (current_payment_due - less_retention) STORED,
  change_orders_amount NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'submitted', 'approved', 'paid', 'rejected')),
  submitted_date DATE,
  approved_date DATE,
  paid_date DATE,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
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

-- Subcontractor payments table
CREATE TABLE public.subcontractor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID NOT NULL,
  subcontractor_name TEXT NOT NULL,
  work_description TEXT NOT NULL,
  contract_amount NUMERIC NOT NULL,
  amount_completed NUMERIC NOT NULL DEFAULT 0,
  previous_payments NUMERIC NOT NULL DEFAULT 0,
  current_amount_due NUMERIC GENERATED ALWAYS AS (amount_completed - previous_payments) STORED,
  retention_amount NUMERIC NOT NULL DEFAULT 0,
  net_payment NUMERIC GENERATED ALWAYS AS (current_amount_due - retention_amount) STORED,
  payment_status TEXT NOT NULL DEFAULT 'pending' CHECK (payment_status IN ('pending', 'approved', 'paid', 'on_hold')),
  due_date DATE,
  paid_date DATE,
  payment_method TEXT DEFAULT 'check',
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.labor_burden_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.material_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.collection_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment_applications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.retention_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subcontractor_payments ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can manage company labor burden rates" ON public.labor_burden_rates
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company material items" ON public.material_items
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company suppliers" ON public.suppliers
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company collection items" ON public.collection_items
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company payment applications" ON public.payment_applications
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company retention items" ON public.retention_items
FOR ALL USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Users can manage company subcontractor payments" ON public.subcontractor_payments
FOR ALL USING (company_id = get_user_company(auth.uid()));

-- Add foreign key constraints
ALTER TABLE public.material_items ADD CONSTRAINT fk_material_supplier 
FOREIGN KEY (supplier_id) REFERENCES public.suppliers(id) ON DELETE SET NULL;

-- Add indexes for performance
CREATE INDEX idx_labor_burden_rates_company ON public.labor_burden_rates(company_id);
CREATE INDEX idx_material_items_company ON public.material_items(company_id);
CREATE INDEX idx_suppliers_company ON public.suppliers(company_id);
CREATE INDEX idx_collection_items_company ON public.collection_items(company_id);
CREATE INDEX idx_payment_applications_company ON public.payment_applications(company_id);
CREATE INDEX idx_retention_items_company ON public.retention_items(company_id);
CREATE INDEX idx_subcontractor_payments_company ON public.subcontractor_payments(company_id);

-- Add update triggers
CREATE TRIGGER update_labor_burden_rates_updated_at BEFORE UPDATE ON public.labor_burden_rates
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_material_items_updated_at BEFORE UPDATE ON public.material_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON public.suppliers
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_collection_items_updated_at BEFORE UPDATE ON public.collection_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_payment_applications_updated_at BEFORE UPDATE ON public.payment_applications
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_retention_items_updated_at BEFORE UPDATE ON public.retention_items
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_subcontractor_payments_updated_at BEFORE UPDATE ON public.subcontractor_payments
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();