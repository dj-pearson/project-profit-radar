-- Create forms_1099 table for storing generated 1099 forms
CREATE TABLE IF NOT EXISTS public.forms_1099 (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  contractor_id UUID NOT NULL REFERENCES public.contractors(id) ON DELETE CASCADE,
  tax_year INTEGER NOT NULL,
  contractor_name TEXT NOT NULL,
  contractor_tax_id TEXT NOT NULL,
  contractor_address TEXT NOT NULL,
  box1_nonemployee_compensation NUMERIC NOT NULL DEFAULT 0,
  box2_payer_made_direct_sales NUMERIC NOT NULL DEFAULT 0,
  box4_federal_income_tax_withheld NUMERIC NOT NULL DEFAULT 0,
  box5_state_tax_withheld NUMERIC NOT NULL DEFAULT 0,
  box6_state_payers_state_no TEXT,
  box7_state_income NUMERIC NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'draft',
  generated_date TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  generated_by UUID REFERENCES public.user_profiles(id),
  filed_date TIMESTAMP WITH TIME ZONE,
  filed_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(contractor_id, tax_year)
);

-- Enable RLS
ALTER TABLE public.forms_1099 ENABLE ROW LEVEL SECURITY;

-- Create policies for forms_1099
CREATE POLICY "Users can view company 1099 forms"
ON public.forms_1099 FOR SELECT
USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Admins can manage 1099 forms"
ON public.forms_1099 FOR ALL
USING (
  company_id = get_user_company(auth.uid()) AND 
  get_user_role(auth.uid()) = ANY(ARRAY['admin', 'accounting', 'root_admin']::user_role[])
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_forms_1099_company_id ON public.forms_1099(company_id);
CREATE INDEX IF NOT EXISTS idx_forms_1099_contractor_id ON public.forms_1099(contractor_id);
CREATE INDEX IF NOT EXISTS idx_forms_1099_tax_year ON public.forms_1099(tax_year);
CREATE INDEX IF NOT EXISTS idx_forms_1099_status ON public.forms_1099(status);

-- Add trigger for updated_at
CREATE TRIGGER update_forms_1099_updated_at
  BEFORE UPDATE ON public.forms_1099
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Add comments
COMMENT ON TABLE public.forms_1099 IS '1099-NEC forms for contractor payments';