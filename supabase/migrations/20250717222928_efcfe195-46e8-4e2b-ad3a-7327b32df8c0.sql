-- Create affiliate programs table to store program settings
CREATE TABLE public.affiliate_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL DEFAULT 'Default Program',
  is_active BOOLEAN NOT NULL DEFAULT true,
  referrer_reward_months INTEGER NOT NULL DEFAULT 1,
  referee_reward_months INTEGER NOT NULL DEFAULT 1,
  min_subscription_duration_months INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  updated_by UUID REFERENCES auth.users(id)
);

-- Create affiliate codes table for tracking referral codes
CREATE TABLE public.affiliate_codes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  affiliate_code TEXT NOT NULL UNIQUE,
  program_id UUID NOT NULL REFERENCES public.affiliate_programs(id),
  is_active BOOLEAN NOT NULL DEFAULT true,
  total_referrals INTEGER NOT NULL DEFAULT 0,
  successful_referrals INTEGER NOT NULL DEFAULT 0,
  total_rewards_earned INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(company_id, program_id)
);

-- Create affiliate referrals table to track individual referrals
CREATE TABLE public.affiliate_referrals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  affiliate_code_id UUID NOT NULL REFERENCES public.affiliate_codes(id),
  referrer_company_id UUID NOT NULL REFERENCES public.companies(id),
  referee_company_id UUID REFERENCES public.companies(id),
  referee_email TEXT NOT NULL,
  referral_status TEXT NOT NULL DEFAULT 'pending' CHECK (referral_status IN ('pending', 'signed_up', 'subscribed', 'rewarded', 'expired')),
  subscription_tier TEXT,
  subscription_duration_months INTEGER,
  referrer_reward_months INTEGER,
  referee_reward_months INTEGER,
  referrer_rewarded_at TIMESTAMPTZ,
  referee_rewarded_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ DEFAULT (now() + INTERVAL '90 days'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}'::jsonb
);

-- Create affiliate rewards table to track actual rewards given
CREATE TABLE public.affiliate_rewards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  referral_id UUID NOT NULL REFERENCES public.affiliate_referrals(id),
  company_id UUID NOT NULL REFERENCES public.companies(id),
  reward_type TEXT NOT NULL CHECK (reward_type IN ('referrer', 'referee')),
  reward_months INTEGER NOT NULL,
  reward_status TEXT NOT NULL DEFAULT 'pending' CHECK (reward_status IN ('pending', 'applied', 'expired')),
  applied_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

-- Enable RLS on all tables
ALTER TABLE public.affiliate_programs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_codes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_referrals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.affiliate_rewards ENABLE ROW LEVEL SECURITY;

-- RLS Policies for affiliate_programs
CREATE POLICY "Root admins can manage affiliate programs" ON public.affiliate_programs
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.user_profiles WHERE id = auth.uid() AND role = 'root_admin')
);

CREATE POLICY "Everyone can view active affiliate programs" ON public.affiliate_programs
FOR SELECT USING (is_active = true);

-- RLS Policies for affiliate_codes
CREATE POLICY "Companies can view their own affiliate codes" ON public.affiliate_codes
FOR SELECT USING (
  company_id = get_user_company(auth.uid()) OR 
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Root admins can manage all affiliate codes" ON public.affiliate_codes
FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can create affiliate codes" ON public.affiliate_codes
FOR INSERT WITH CHECK (true);

CREATE POLICY "System can update affiliate codes" ON public.affiliate_codes
FOR UPDATE USING (true);

-- RLS Policies for affiliate_referrals
CREATE POLICY "Companies can view their referrals" ON public.affiliate_referrals
FOR SELECT USING (
  referrer_company_id = get_user_company(auth.uid()) OR
  referee_company_id = get_user_company(auth.uid()) OR
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Root admins can manage all referrals" ON public.affiliate_referrals
FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can manage referrals" ON public.affiliate_referrals
FOR ALL USING (true);

-- RLS Policies for affiliate_rewards
CREATE POLICY "Companies can view their rewards" ON public.affiliate_rewards
FOR SELECT USING (
  company_id = get_user_company(auth.uid()) OR
  get_user_role(auth.uid()) = 'root_admin'
);

CREATE POLICY "Root admins can manage all rewards" ON public.affiliate_rewards
FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "System can manage rewards" ON public.affiliate_rewards
FOR ALL USING (true);

-- Create function to generate unique affiliate codes
CREATE OR REPLACE FUNCTION public.generate_affiliate_code()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
DECLARE
  code TEXT;
  exists_check INTEGER;
BEGIN
  LOOP
    -- Generate 9-digit code
    code := LPAD(FLOOR(RANDOM() * 1000000000)::TEXT, 9, '0');
    
    -- Check if code already exists
    SELECT COUNT(*) INTO exists_check 
    FROM public.affiliate_codes 
    WHERE affiliate_code = code;
    
    -- Exit loop if code is unique
    EXIT WHEN exists_check = 0;
  END LOOP;
  
  RETURN code;
END;
$$;

-- Create function to create affiliate code for company
CREATE OR REPLACE FUNCTION public.create_company_affiliate_code(p_company_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_code TEXT;
  default_program_id UUID;
BEGIN
  -- Get default program
  SELECT id INTO default_program_id 
  FROM public.affiliate_programs 
  WHERE is_active = true 
  ORDER BY created_at ASC 
  LIMIT 1;
  
  IF default_program_id IS NULL THEN
    RAISE EXCEPTION 'No active affiliate program found';
  END IF;
  
  -- Check if company already has an affiliate code for this program
  SELECT affiliate_code INTO new_code
  FROM public.affiliate_codes
  WHERE company_id = p_company_id AND program_id = default_program_id;
  
  IF new_code IS NOT NULL THEN
    RETURN new_code;
  END IF;
  
  -- Generate new code
  new_code := generate_affiliate_code();
  
  -- Insert new affiliate code
  INSERT INTO public.affiliate_codes (company_id, affiliate_code, program_id)
  VALUES (p_company_id, new_code, default_program_id);
  
  RETURN new_code;
END;
$$;

-- Create default affiliate program
INSERT INTO public.affiliate_programs (name, referrer_reward_months, referee_reward_months)
VALUES ('Default Referral Program', 1, 1);

-- Create updated_at triggers
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_affiliate_programs_updated_at BEFORE UPDATE ON public.affiliate_programs FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_affiliate_codes_updated_at BEFORE UPDATE ON public.affiliate_codes FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_affiliate_referrals_updated_at BEFORE UPDATE ON public.affiliate_referrals FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_affiliate_rewards_updated_at BEFORE UPDATE ON public.affiliate_rewards FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();