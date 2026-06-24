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