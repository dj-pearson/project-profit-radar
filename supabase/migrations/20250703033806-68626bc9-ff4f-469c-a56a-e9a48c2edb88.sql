-- Add security tracking tables
CREATE TABLE IF NOT EXISTS public.user_security (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  failed_login_attempts INTEGER DEFAULT 0,
  last_failed_attempt TIMESTAMP WITH TIME ZONE,
  account_locked_until TIMESTAMP WITH TIME ZONE,
  two_factor_enabled BOOLEAN DEFAULT false,
  two_factor_secret TEXT,
  backup_codes TEXT[],
  last_login_ip INET,
  last_login_user_agent TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

-- Add security audit logs
CREATE TABLE IF NOT EXISTS public.security_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  event_type TEXT NOT NULL, -- login_success, login_failed, 2fa_enabled, account_locked, etc.
  ip_address INET,
  user_agent TEXT,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add CSP violations table
CREATE TABLE IF NOT EXISTS public.csp_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  document_uri TEXT,
  blocked_uri TEXT,
  violated_directive TEXT,
  original_policy TEXT,
  user_agent TEXT,
  source_file TEXT,
  line_number INTEGER,
  column_number INTEGER,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_security ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csp_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_security
CREATE POLICY "Users can view their own security settings" 
ON public.user_security FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own security settings" 
ON public.user_security FOR UPDATE 
USING (auth.uid() = user_id);

CREATE POLICY "Root admins can manage all security settings" 
ON public.user_security FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- RLS Policies for security_logs
CREATE POLICY "Root admins can view all security logs" 
ON public.security_logs FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin');

CREATE POLICY "Users can view their own security logs" 
ON public.security_logs FOR SELECT 
USING (auth.uid() = user_id);

-- RLS Policies for CSP violations (root admin only)
CREATE POLICY "Root admins can manage CSP violations" 
ON public.csp_violations FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- Function to handle security events
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_user_id UUID,
  p_event_type TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.security_logs (
    user_id, event_type, ip_address, user_agent, details
  ) VALUES (
    p_user_id, p_event_type, p_ip_address, p_user_agent, p_details
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$$;

-- Function to handle failed login attempts
CREATE OR REPLACE FUNCTION public.handle_failed_login(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS BOOLEAN -- Returns true if account should be locked
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_attempts INTEGER;
  max_attempts INTEGER := 5;
  lockout_duration INTERVAL := '30 minutes';
BEGIN
  -- Insert or update user security record
  INSERT INTO public.user_security (user_id, failed_login_attempts, last_failed_attempt)
  VALUES (p_user_id, 1, now())
  ON CONFLICT (user_id) DO UPDATE SET
    failed_login_attempts = user_security.failed_login_attempts + 1,
    last_failed_attempt = now();
  
  -- Get current attempt count
  SELECT failed_login_attempts INTO current_attempts
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  -- Log the failed attempt
  PERFORM public.log_security_event(
    p_user_id, 
    'login_failed', 
    p_ip_address, 
    p_user_agent,
    jsonb_build_object('attempt_number', current_attempts)
  );
  
  -- Lock account if too many attempts
  IF current_attempts >= max_attempts THEN
    UPDATE public.user_security 
    SET account_locked_until = now() + lockout_duration
    WHERE user_id = p_user_id;
    
    -- Log account lockout
    PERFORM public.log_security_event(
      p_user_id, 
      'account_locked', 
      p_ip_address, 
      p_user_agent,
      jsonb_build_object('locked_until', now() + lockout_duration)
    );
    
    RETURN true;
  END IF;
  
  RETURN false;
END;
$$;

-- Function to check if account is locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  locked_until TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT account_locked_until INTO locked_until
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  RETURN locked_until IS NOT NULL AND locked_until > now();
END;
$$;

-- Function to reset failed attempts on successful login
CREATE OR REPLACE FUNCTION public.reset_failed_attempts(
  p_user_id UUID,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Reset failed attempts and unlock account
  INSERT INTO public.user_security (user_id, failed_login_attempts, account_locked_until)
  VALUES (p_user_id, 0, NULL)
  ON CONFLICT (user_id) DO UPDATE SET
    failed_login_attempts = 0,
    account_locked_until = NULL,
    last_login_ip = p_ip_address,
    last_login_user_agent = p_user_agent;
  
  -- Log successful login
  PERFORM public.log_security_event(
    p_user_id, 
    'login_success', 
    p_ip_address, 
    p_user_agent
  );
END;
$$;

-- Add triggers for updated_at
CREATE TRIGGER update_user_security_updated_at
  BEFORE UPDATE ON public.user_security
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();