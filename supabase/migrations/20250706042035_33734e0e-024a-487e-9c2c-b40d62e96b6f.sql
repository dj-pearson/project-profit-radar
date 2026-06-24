-- Create payment processor settings table
CREATE TABLE public.company_payment_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  processor_type TEXT NOT NULL CHECK (processor_type IN ('pearson_stripe', 'own_stripe')),
  is_active BOOLEAN NOT NULL DEFAULT true,
  
  -- Pearson Stripe settings
  processing_fee_percentage NUMERIC(5,2) DEFAULT 2.9, -- Default 2.9% fee
  chargeback_fee NUMERIC(10,2) DEFAULT 15.00, -- Default $15 chargeback fee
  
  -- Own Stripe settings (encrypted)
  stripe_publishable_key TEXT,
  stripe_secret_key_encrypted TEXT,
  stripe_webhook_secret_encrypted TEXT,
  
  -- Metadata
  configured_by UUID,
  configured_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  
  UNIQUE(company_id)
);

-- Create chargeback fees table for tracking
CREATE TABLE public.chargeback_fees (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  payment_intent_id TEXT NOT NULL,
  chargeback_amount NUMERIC(10,2) NOT NULL,
  fee_amount NUMERIC(10,2) NOT NULL,
  reason TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'charged', 'disputed', 'waived')),
  charged_by UUID REFERENCES public.user_profiles(id),
  charged_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.company_payment_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chargeback_fees ENABLE ROW LEVEL SECURITY;

-- RLS Policies for company_payment_settings
CREATE POLICY "Companies can view their payment settings" 
ON public.company_payment_settings 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Admins can manage their company payment settings" 
ON public.company_payment_settings 
FOR ALL 
USING (
  company_id = get_user_company(auth.uid()) 
  AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
);

CREATE POLICY "Root admins can manage all payment settings" 
ON public.company_payment_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- RLS Policies for chargeback_fees
CREATE POLICY "Companies can view their chargeback fees" 
ON public.chargeback_fees 
FOR SELECT 
USING (company_id = get_user_company(auth.uid()));

CREATE POLICY "Root admins can manage all chargeback fees" 
ON public.chargeback_fees 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Add updated_at trigger
CREATE TRIGGER update_company_payment_settings_updated_at
  BEFORE UPDATE ON public.company_payment_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_chargeback_fees_updated_at
  BEFORE UPDATE ON public.chargeback_fees
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();