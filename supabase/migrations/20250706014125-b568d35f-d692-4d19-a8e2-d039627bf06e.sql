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
CREATE INDEX idx_forms_1099_company_id ON public.forms_1099(company_id);
CREATE INDEX idx_forms_1099_contractor_id ON public.forms_1099(contractor_id);
CREATE INDEX idx_forms_1099_tax_year ON public.forms_1099(tax_year);
CREATE INDEX idx_forms_1099_status ON public.forms_1099(status);

-- Add trigger for updated_at
CREATE TRIGGER update_forms_1099_updated_at
  BEFORE UPDATE ON public.forms_1099
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create webhook_events table for Stripe webhooks (if not exists)
CREATE TABLE IF NOT EXISTS public.webhook_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  stripe_event_id TEXT UNIQUE NOT NULL,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  processed BOOLEAN NOT NULL DEFAULT false,
  processing_attempts INTEGER NOT NULL DEFAULT 0,
  last_processing_error TEXT,
  processed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for webhook_events
ALTER TABLE public.webhook_events ENABLE ROW LEVEL SECURITY;

-- Create policies for webhook_events (system only)
CREATE POLICY "System can manage webhook events"
ON public.webhook_events FOR ALL
USING (true);

-- Create payment_failures table for Stripe payment failure tracking (if not exists)
CREATE TABLE IF NOT EXISTS public.payment_failures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  subscriber_id UUID REFERENCES public.user_profiles(id),
  stripe_invoice_id TEXT NOT NULL,
  failure_reason TEXT,
  attempt_count INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  dunning_status TEXT NOT NULL DEFAULT 'active',
  resolved_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS for payment_failures
ALTER TABLE public.payment_failures ENABLE ROW LEVEL SECURITY;

-- Create policies for payment_failures
CREATE POLICY "Users can view their own payment failures"
ON public.payment_failures FOR SELECT
USING (subscriber_id = auth.uid());

CREATE POLICY "System can manage payment failures"
ON public.payment_failures FOR ALL
USING (true);

-- Add comments
COMMENT ON TABLE public.forms_1099 IS '1099-NEC forms for contractor payments';
COMMENT ON TABLE public.webhook_events IS 'Stripe webhook event tracking';
COMMENT ON TABLE public.payment_failures IS 'Payment failure tracking and dunning management';