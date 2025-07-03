-- Add expense management tables for financial tracking
CREATE TABLE public.expense_categories (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE public.expenses (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  project_id UUID,
  category_id UUID REFERENCES public.expense_categories(id),
  cost_code_id UUID REFERENCES public.cost_codes(id),
  amount NUMERIC NOT NULL,
  description TEXT NOT NULL,
  expense_date DATE NOT NULL DEFAULT CURRENT_DATE,
  vendor_name TEXT,
  vendor_contact TEXT,
  receipt_file_path TEXT,
  payment_method TEXT DEFAULT 'credit_card',
  payment_status TEXT DEFAULT 'pending',
  is_billable BOOLEAN DEFAULT false,
  tax_amount NUMERIC DEFAULT 0,
  approved_by UUID,
  approved_at TIMESTAMP WITH TIME ZONE,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add contractors table for 1099 management
CREATE TABLE public.contractors (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  business_name TEXT NOT NULL,
  contact_person TEXT,
  email TEXT,
  phone TEXT,
  address TEXT,
  tax_id TEXT, -- EIN or SSN
  tax_id_type TEXT DEFAULT 'ein', -- 'ein' or 'ssn'
  w9_file_path TEXT,
  is_active BOOLEAN DEFAULT true,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add contractor payments for 1099 tracking
CREATE TABLE public.contractor_payments (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id),
  project_id UUID REFERENCES public.projects(id),
  amount NUMERIC NOT NULL,
  description TEXT,
  payment_date DATE NOT NULL DEFAULT CURRENT_DATE,
  payment_method TEXT DEFAULT 'check',
  reference_number TEXT,
  cost_code_id UUID REFERENCES public.cost_codes(id),
  is_1099_reportable BOOLEAN DEFAULT true,
  tax_year INTEGER DEFAULT EXTRACT(year FROM CURRENT_DATE),
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add budget tracking tables
CREATE TABLE public.project_budgets (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID NOT NULL REFERENCES public.projects(id),
  cost_code_id UUID NOT NULL REFERENCES public.cost_codes(id),
  budgeted_amount NUMERIC NOT NULL DEFAULT 0,
  labor_budget NUMERIC DEFAULT 0,
  material_budget NUMERIC DEFAULT 0,
  equipment_budget NUMERIC DEFAULT 0,
  subcontractor_budget NUMERIC DEFAULT 0,
  other_budget NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(project_id, cost_code_id)
);

-- Add cash flow projection table
CREATE TABLE public.cash_flow_projections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  projection_date DATE NOT NULL,
  projected_income NUMERIC DEFAULT 0,
  projected_expenses NUMERIC DEFAULT 0,
  projected_balance NUMERIC DEFAULT 0,
  actual_income NUMERIC DEFAULT 0,
  actual_expenses NUMERIC DEFAULT 0,
  actual_balance NUMERIC DEFAULT 0,
  notes TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(company_id, projection_date)
);

-- Enable RLS
ALTER TABLE public.expense_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contractor_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.project_budgets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cash_flow_projections ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for expense categories
CREATE POLICY "Users can view company expense categories" ON public.expense_categories
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage expense categories" ON public.expense_categories
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'root_admin'])
  );

-- Create RLS policies for expenses
CREATE POLICY "Users can view company expenses" ON public.expenses
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Staff can manage expenses" ON public.expenses
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'project_manager', 'office_staff', 'root_admin'])
  );

-- Create RLS policies for contractors
CREATE POLICY "Users can view company contractors" ON public.contractors
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage contractors" ON public.contractors
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'project_manager', 'root_admin'])
  );

-- Create RLS policies for contractor payments
CREATE POLICY "Users can view company contractor payments" ON public.contractor_payments
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage contractor payments" ON public.contractor_payments
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'project_manager', 'root_admin'])
  );

-- Create RLS policies for project budgets
CREATE POLICY "Users can view project budgets" ON public.project_budgets
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_budgets.project_id 
      AND (p.company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin')
    )
  );

CREATE POLICY "Project managers can manage budgets" ON public.project_budgets
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM projects p 
      WHERE p.id = project_budgets.project_id 
      AND p.company_id = get_user_company(auth.uid()) 
      AND get_user_role(auth.uid()) = ANY(ARRAY['admin', 'project_manager', 'accounting', 'root_admin'])
    )
  );

-- Create RLS policies for cash flow projections
CREATE POLICY "Users can view company cash flow projections" ON public.cash_flow_projections
  FOR SELECT USING (company_id = get_user_company(auth.uid()) OR get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Admins can manage cash flow projections" ON public.cash_flow_projections
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) AND 
    get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'root_admin'])
  );

-- Add foreign key constraints
ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);
ALTER TABLE public.expenses ADD CONSTRAINT fk_expenses_project 
  FOREIGN KEY (project_id) REFERENCES public.projects(id);

ALTER TABLE public.expense_categories ADD CONSTRAINT fk_expense_categories_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.contractors ADD CONSTRAINT fk_contractors_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.contractor_payments ADD CONSTRAINT fk_contractor_payments_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

ALTER TABLE public.cash_flow_projections ADD CONSTRAINT fk_cash_flow_projections_company 
  FOREIGN KEY (company_id) REFERENCES public.companies(id);

-- Add triggers for updated_at columns
CREATE TRIGGER update_expense_categories_updated_at
  BEFORE UPDATE ON public.expense_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_expenses_updated_at
  BEFORE UPDATE ON public.expenses
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractors_updated_at
  BEFORE UPDATE ON public.contractors
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contractor_payments_updated_at
  BEFORE UPDATE ON public.contractor_payments
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_project_budgets_updated_at
  BEFORE UPDATE ON public.project_budgets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_cash_flow_projections_updated_at
  BEFORE UPDATE ON public.cash_flow_projections
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();