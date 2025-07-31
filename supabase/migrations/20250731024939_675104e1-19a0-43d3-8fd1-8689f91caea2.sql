-- Security Fix Migration: Fix database function security vulnerabilities
-- This migration addresses the critical security issues identified by the Supabase linter

-- Fix 1: Secure all functions by adding SET search_path = '' to prevent search path injection attacks
-- This prevents malicious users from manipulating the search path to execute unauthorized code

-- Core Security Functions
CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.user_profiles (id, email, first_name, last_name, role)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data ->> 'first_name', ''),
    COALESCE(NEW.raw_user_meta_data ->> 'last_name', ''),
    COALESCE((NEW.raw_user_meta_data ->> 'role')::public.user_role, 'admin'::public.user_role)
  );
  RETURN NEW;
EXCEPTION
  WHEN OTHERS THEN
    -- Log the error but don't block user creation
    RAISE WARNING 'Failed to create user profile for user %: %', NEW.id, SQLERRM;
    RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_role(user_id uuid)
 RETURNS user_role
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT role FROM public.user_profiles WHERE id = user_id;
$function$;

CREATE OR REPLACE FUNCTION public.get_user_company(user_id uuid)
 RETURNS uuid
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT company_id FROM public.user_profiles WHERE id = user_id;
$function$;

CREATE OR REPLACE FUNCTION public.grant_root_admin_complimentary(p_user_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  UPDATE public.user_profiles 
  SET subscription_status = 'complimentary'
  WHERE id = p_user_id AND role = 'root_admin';
END;
$function$;

-- Audit and Security Logging Functions
CREATE OR REPLACE FUNCTION public.log_security_event(p_event_type text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  INSERT INTO public.security_logs (
    user_id,
    event_type,
    ip_address,
    user_agent,
    details,
    created_at
  ) VALUES (
    auth.uid(),
    p_event_type,
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent',
    p_details,
    now()
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_details jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.log_security_event(p_user_id uuid, p_event_type text, p_severity text DEFAULT 'info'::text, p_description text DEFAULT ''::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_location text DEFAULT NULL::text, p_metadata jsonb DEFAULT NULL::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  event_id UUID;
BEGIN
  INSERT INTO public.security_events (
    user_id, event_type, severity, description, 
    ip_address, user_agent, location, metadata
  ) VALUES (
    p_user_id, p_event_type, p_severity, p_description,
    p_ip_address, p_user_agent, p_location, p_metadata
  ) RETURNING id INTO event_id;
  
  RETURN event_id;
END;
$function$;

-- Authentication Security Functions  
CREATE OR REPLACE FUNCTION public.handle_failed_login(p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.reset_failed_attempts(p_user_id uuid, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Rate Limiting and API Security Functions
CREATE OR REPLACE FUNCTION public.check_rate_limit(p_identifier text, p_identifier_type text, p_endpoint text, p_method text, p_ip_address inet DEFAULT NULL::inet)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  rule_record RECORD;
  state_record RECORD;
  current_time TIMESTAMPTZ := now();
  window_start TIMESTAMPTZ;
  is_blocked BOOLEAN := false;
  block_reason TEXT := '';
  requests_allowed INTEGER := 0;
  remaining_requests INTEGER := 0;
  reset_time TIMESTAMPTZ;
BEGIN
  -- Check IP blacklist first
  IF p_ip_address IS NOT NULL THEN
    SELECT COUNT(*) INTO is_blocked
    FROM public.ip_access_control 
    WHERE is_active = true 
      AND access_type = 'blacklist'
      AND (ip_address = p_ip_address OR p_ip_address << ip_range)
      AND (expires_at IS NULL OR expires_at > current_time);
    
    IF is_blocked > 0 THEN
      RETURN jsonb_build_object(
        'allowed', false,
        'blocked', true,
        'reason', 'IP blacklisted',
        'retry_after', null
      );
    END IF;
  END IF;

  -- Find applicable rate limit rule (highest priority first)
  SELECT * INTO rule_record
  FROM public.rate_limit_rules
  WHERE is_active = true
    AND (method = 'ALL' OR method = p_method)
    AND p_endpoint LIKE endpoint_pattern
  ORDER BY priority DESC, id
  LIMIT 1;

  IF NOT FOUND THEN
    -- No rate limit rule found, allow request
    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'requests_remaining', -1,
      'reset_time', null
    );
  END IF;

  -- Calculate window start time
  window_start := current_time - (rule_record.time_window_seconds || ' seconds')::interval;

  -- Get or create rate limit state
  SELECT * INTO state_record
  FROM public.rate_limit_state
  WHERE identifier = p_identifier
    AND endpoint = p_endpoint
    AND method = p_method;

  IF NOT FOUND THEN
    -- Create new state record
    INSERT INTO public.rate_limit_state 
    (identifier, identifier_type, endpoint, method, request_count, window_start, last_request)
    VALUES (p_identifier, p_identifier_type, p_endpoint, p_method, 1, current_time, current_time);
    
    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'requests_remaining', rule_record.max_requests - 1,
      'reset_time', current_time + (rule_record.time_window_seconds || ' seconds')::interval
    );
  END IF;

  -- Check if currently blocked
  IF state_record.is_blocked AND state_record.blocked_until > current_time THEN
    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'reason', 'Rate limit exceeded',
      'retry_after', EXTRACT(EPOCH FROM (state_record.blocked_until - current_time))
    );
  END IF;

  -- Reset window if needed
  IF state_record.window_start < window_start THEN
    UPDATE public.rate_limit_state
    SET request_count = 1,
        window_start = current_time,
        last_request = current_time,
        is_blocked = false,
        blocked_until = null
    WHERE id = state_record.id;
    
    RETURN jsonb_build_object(
      'allowed', true,
      'blocked', false,
      'requests_remaining', rule_record.max_requests - 1,
      'reset_time', current_time + (rule_record.time_window_seconds || ' seconds')::interval
    );
  END IF;

  -- Check if limit exceeded
  IF state_record.request_count >= rule_record.max_requests THEN
    -- Block the identifier
    UPDATE public.rate_limit_state
    SET is_blocked = true,
        blocked_until = current_time + (rule_record.block_duration_seconds || ' seconds')::interval,
        last_request = current_time
    WHERE id = state_record.id;

    -- Log the violation
    INSERT INTO public.rate_limit_violations 
    (identifier, identifier_type, ip_address, endpoint, method, rule_id, 
     requests_made, limit_exceeded_by, time_window_seconds, action_taken, block_duration_seconds)
    VALUES (p_identifier, p_identifier_type, p_ip_address, p_endpoint, p_method, rule_record.id,
            state_record.request_count, state_record.request_count - rule_record.max_requests,
            rule_record.time_window_seconds, 'blocked', rule_record.block_duration_seconds);

    RETURN jsonb_build_object(
      'allowed', false,
      'blocked', true,
      'reason', 'Rate limit exceeded',
      'retry_after', rule_record.block_duration_seconds
    );
  END IF;

  -- Increment request count
  UPDATE public.rate_limit_state
  SET request_count = request_count + 1,
      last_request = current_time
  WHERE id = state_record.id;

  RETURN jsonb_build_object(
    'allowed', true,
    'blocked', false,
    'requests_remaining', rule_record.max_requests - (state_record.request_count + 1),
    'reset_time', state_record.window_start + (rule_record.time_window_seconds || ' seconds')::interval
  );
END;
$function$;

-- Fix 2: Add sequences that may be missing and are referenced by functions
CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq;
CREATE SEQUENCE IF NOT EXISTS public.estimate_number_seq;  
CREATE SEQUENCE IF NOT EXISTS public.work_order_number_seq;