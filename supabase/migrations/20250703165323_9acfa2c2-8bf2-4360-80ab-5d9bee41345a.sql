-- Create API rate limiting and DDoS protection tables

-- Rate limiting rules table
CREATE TABLE public.rate_limit_rules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rule_name TEXT NOT NULL,
  endpoint_pattern TEXT NOT NULL, -- '/api/*', '/auth/*', specific endpoints
  method TEXT DEFAULT 'ALL', -- 'GET', 'POST', 'PUT', 'DELETE', 'ALL'
  max_requests INTEGER NOT NULL, -- Max requests allowed
  time_window_seconds INTEGER NOT NULL, -- Time window in seconds
  block_duration_seconds INTEGER DEFAULT 300, -- How long to block (5 minutes default)
  rule_type TEXT DEFAULT 'standard', -- 'standard', 'strict', 'custom'
  is_active BOOLEAN DEFAULT true,
  priority INTEGER DEFAULT 1, -- Higher number = higher priority
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limiting state tracking
CREATE TABLE public.rate_limit_state (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL, -- IP address, user ID, or API key
  identifier_type TEXT NOT NULL, -- 'ip', 'user', 'api_key'
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_request TIMESTAMPTZ NOT NULL DEFAULT now(),
  is_blocked BOOLEAN DEFAULT false,
  blocked_until TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- IP blacklist/whitelist management
CREATE TABLE public.ip_access_control (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  ip_address INET NOT NULL,
  ip_range CIDR, -- For subnet blocking
  access_type TEXT NOT NULL, -- 'blacklist', 'whitelist'
  reason TEXT,
  auto_generated BOOLEAN DEFAULT false, -- True if automatically added by DDoS protection
  expires_at TIMESTAMPTZ, -- Optional expiration
  is_active BOOLEAN DEFAULT true,
  created_by UUID REFERENCES public.user_profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- DDoS attack detection logs
CREATE TABLE public.ddos_detection_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  source_ip INET NOT NULL,
  attack_type TEXT NOT NULL, -- 'rate_limit_exceeded', 'suspicious_pattern', 'volumetric', 'application_layer'
  severity TEXT NOT NULL, -- 'low', 'medium', 'high', 'critical'
  request_count INTEGER NOT NULL,
  time_window_seconds INTEGER NOT NULL,
  endpoint_targets TEXT[], -- Endpoints being targeted
  user_agent TEXT,
  request_patterns JSONB, -- Analysis of request patterns
  mitigation_actions JSONB, -- Actions taken (block, throttle, etc.)
  detection_method TEXT NOT NULL, -- 'rate_based', 'pattern_based', 'ml_based'
  confidence_score DECIMAL(3,2), -- 0.00 to 1.00 confidence in detection
  resolved_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Rate limit violations log
CREATE TABLE public.rate_limit_violations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  identifier TEXT NOT NULL,
  identifier_type TEXT NOT NULL,
  ip_address INET,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  rule_id UUID REFERENCES public.rate_limit_rules(id),
  requests_made INTEGER NOT NULL,
  limit_exceeded_by INTEGER NOT NULL,
  time_window_seconds INTEGER NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  action_taken TEXT NOT NULL, -- 'blocked', 'throttled', 'logged_only'
  block_duration_seconds INTEGER,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.rate_limit_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_state ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ip_access_control ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ddos_detection_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_violations ENABLE ROW LEVEL SECURITY;

-- RLS Policies - Only root admins can manage rate limiting
CREATE POLICY "Root admins can manage rate limit rules" 
ON public.rate_limit_rules FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can view rate limit state" 
ON public.rate_limit_state FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can manage IP access control" 
ON public.ip_access_control FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can view DDoS logs" 
ON public.ddos_detection_logs FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can view rate limit violations" 
ON public.rate_limit_violations FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- System can insert into state and violation tables
CREATE POLICY "System can insert rate limit state" 
ON public.rate_limit_state FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can update rate limit state" 
ON public.rate_limit_state FOR UPDATE 
USING (true);

CREATE POLICY "System can insert DDoS logs" 
ON public.ddos_detection_logs FOR INSERT 
WITH CHECK (true);

CREATE POLICY "System can insert violations" 
ON public.rate_limit_violations FOR INSERT 
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX idx_rate_limit_state_identifier ON public.rate_limit_state(identifier, endpoint, method);
CREATE INDEX idx_rate_limit_state_window ON public.rate_limit_state(window_start, identifier);
CREATE INDEX idx_rate_limit_state_blocked ON public.rate_limit_state(is_blocked, blocked_until);
CREATE INDEX idx_ip_access_control_ip ON public.ip_access_control(ip_address) WHERE is_active = true;
CREATE INDEX idx_ip_access_control_range ON public.ip_access_control USING gist(ip_range) WHERE is_active = true;
CREATE INDEX idx_ddos_logs_ip_time ON public.ddos_detection_logs(source_ip, created_at DESC);
CREATE INDEX idx_rate_violations_time ON public.rate_limit_violations(created_at DESC);

-- Create triggers for timestamps
CREATE TRIGGER update_rate_limit_rules_updated_at
  BEFORE UPDATE ON public.rate_limit_rules
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_rate_limit_state_updated_at
  BEFORE UPDATE ON public.rate_limit_state
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ip_access_control_updated_at
  BEFORE UPDATE ON public.ip_access_control
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default rate limiting rules
INSERT INTO public.rate_limit_rules (rule_name, endpoint_pattern, method, max_requests, time_window_seconds, rule_type) VALUES
('Default API Rate Limit', '/api/*', 'ALL', 100, 60, 'standard'),
('Strict Auth Rate Limit', '/auth/*', 'POST', 5, 300, 'strict'),
('File Upload Limit', '/upload/*', 'POST', 10, 60, 'standard'),
('General Web Limit', '/*', 'ALL', 1000, 60, 'standard'),
('Login Protection', '/login', 'POST', 3, 900, 'strict');

-- Function to check rate limit
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_identifier TEXT,
  p_identifier_type TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_ip_address INET DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;