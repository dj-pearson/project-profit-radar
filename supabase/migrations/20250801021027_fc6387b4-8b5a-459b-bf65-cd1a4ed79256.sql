-- Security Fix Migration Part 4: Fix remaining database function security vulnerabilities
-- Complete the security hardening by adding SET search_path = '' to all remaining functions

-- Blog and Content Management Functions
CREATE OR REPLACE FUNCTION public.calculate_next_generation_time(frequency text, generation_time time without time zone, timezone text DEFAULT 'America/New_York'::text)
 RETURNS timestamp with time zone
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  next_time TIMESTAMP WITH TIME ZONE;
  current_time_tz TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current time in specified timezone
  current_time_tz := now() AT TIME ZONE timezone;
  
  -- Calculate next generation time based on frequency
  CASE frequency
    WHEN 'daily' THEN
      next_time := (date_trunc('day', current_time_tz) + interval '1 day' + generation_time) AT TIME ZONE timezone;
    WHEN 'weekly' THEN
      next_time := (date_trunc('week', current_time_tz) + interval '1 week' + generation_time) AT TIME ZONE timezone;
    WHEN 'biweekly' THEN
      next_time := (date_trunc('week', current_time_tz) + interval '2 weeks' + generation_time) AT TIME ZONE timezone;
    WHEN 'monthly' THEN
      next_time := (date_trunc('month', current_time_tz) + interval '1 month' + generation_time) AT TIME ZONE timezone;
    ELSE
      next_time := (date_trunc('day', current_time_tz) + interval '1 week' + generation_time) AT TIME ZONE timezone;
  END CASE;
  
  -- If the calculated time is in the past, add another interval
  IF next_time <= current_time_tz THEN
    CASE frequency
      WHEN 'daily' THEN
        next_time := next_time + interval '1 day';
      WHEN 'weekly' THEN
        next_time := next_time + interval '1 week';
      WHEN 'biweekly' THEN
        next_time := next_time + interval '2 weeks';
      WHEN 'monthly' THEN
        next_time := next_time + interval '1 month';
    END CASE;
  END IF;
  
  RETURN next_time;
END;
$function$;

CREATE OR REPLACE FUNCTION public.queue_next_blog_generation(company_id_param uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  settings_record RECORD;
  next_generation_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get auto-generation settings
  SELECT * INTO settings_record
  FROM public.blog_auto_generation_settings
  WHERE company_id = company_id_param AND is_enabled = true;
  
  IF settings_record IS NOT NULL THEN
    -- Calculate next generation time
    next_generation_time := public.calculate_next_generation_time(
      settings_record.generation_frequency,
      settings_record.generation_time,
      settings_record.generation_timezone
    );
    
    -- Update settings with next generation time
    UPDATE public.blog_auto_generation_settings
    SET next_generation_at = next_generation_time,
        updated_at = now()
    WHERE id = settings_record.id;
    
    -- Add to generation queue
    INSERT INTO public.blog_generation_queue (
      company_id,
      scheduled_for,
      ai_provider,
      ai_model,
      generation_type
    ) VALUES (
      company_id_param,
      next_generation_time,
      settings_record.preferred_ai_provider,
      settings_record.preferred_model,
      'scheduled'
    );
  END IF;
END;
$function$;

-- API Management Functions
CREATE OR REPLACE FUNCTION public.generate_api_key()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  key_prefix TEXT;
  key_suffix TEXT;
  full_key TEXT;
BEGIN
  -- Generate prefix (bdesk for BuildDesk)
  key_prefix := 'bdesk_';
  
  -- Generate random suffix (32 characters)
  key_suffix := encode(gen_random_bytes(24), 'base64');
  key_suffix := replace(key_suffix, '/', '_');
  key_suffix := replace(key_suffix, '+', '-');
  key_suffix := replace(key_suffix, '=', '');
  
  full_key := key_prefix || key_suffix;
  
  RETURN full_key;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_api_permission(p_api_key_hash text, p_permission text, p_company_id uuid DEFAULT NULL::uuid)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  key_record RECORD;
BEGIN
  -- Get API key record
  SELECT ak.*, c.id as company_id
  INTO key_record
  FROM public.api_keys ak
  JOIN public.companies c ON c.id = ak.company_id
  WHERE ak.api_key_hash = p_api_key_hash
    AND ak.is_active = true
    AND (ak.expires_at IS NULL OR ak.expires_at > now());
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  -- Check company match if specified
  IF p_company_id IS NOT NULL AND key_record.company_id != p_company_id THEN
    RETURN false;
  END IF;
  
  -- Check if permission exists in the key's permissions array
  RETURN (p_permission = ANY(SELECT jsonb_array_elements_text(key_record.permissions)));
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_api_usage(p_api_key_hash text, p_endpoint text, p_method text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_processing_time_ms integer DEFAULT NULL::integer, p_response_status integer DEFAULT NULL::integer)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  key_record RECORD;
  log_id UUID;
BEGIN
  -- Get API key record
  SELECT ak.id, ak.company_id
  INTO key_record
  FROM public.api_keys ak
  WHERE ak.api_key_hash = p_api_key_hash;
  
  -- Update usage count and last used
  UPDATE public.api_keys
  SET 
    usage_count = usage_count + 1,
    last_used_at = now()
  WHERE api_key_hash = p_api_key_hash;
  
  -- Insert log record
  INSERT INTO public.api_request_logs (
    company_id,
    api_key_id,
    endpoint,
    method,
    ip_address,
    user_agent,
    processing_time_ms,
    response_status
  ) VALUES (
    key_record.company_id,
    key_record.id,
    p_endpoint,
    p_method,
    p_ip_address,
    p_user_agent,
    p_processing_time_ms,
    p_response_status
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- Security Monitoring Functions
CREATE OR REPLACE FUNCTION public.trigger_security_alert(p_company_id uuid, p_alert_type text, p_severity text, p_title text, p_description text DEFAULT NULL::text, p_event_data jsonb DEFAULT '{}'::jsonb, p_affected_resources jsonb DEFAULT '[]'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  alert_id UUID;
  rule_record RECORD;
BEGIN
  -- Create the alert
  INSERT INTO public.security_alerts (
    company_id, alert_type, severity, title, description, event_data, affected_resources
  ) VALUES (
    p_company_id, p_alert_type, p_severity, p_title, p_description, p_event_data, p_affected_resources
  ) RETURNING id INTO alert_id;
  
  -- Check for matching monitoring rules and create notifications
  FOR rule_record IN
    SELECT * FROM public.security_monitoring_rules
    WHERE company_id = p_company_id
      AND rule_type = p_alert_type
      AND is_active = true
  LOOP
    -- Create notifications for each recipient
    IF rule_record.recipients IS NOT NULL THEN
      INSERT INTO public.alert_notifications (alert_id, notification_method, recipient)
      SELECT alert_id, unnest(rule_record.alert_method), unnest(rule_record.recipients);
    END IF;
  END LOOP;
  
  RETURN alert_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_security_metrics(p_company_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  metrics JSONB := '{}';
  total_alerts INTEGER;
  critical_alerts INTEGER;
  resolved_alerts INTEGER;
  avg_resolution_time NUMERIC;
  failed_logins INTEGER;
BEGIN
  -- Count total alerts in last 30 days
  SELECT COUNT(*) INTO total_alerts
  FROM public.security_alerts
  WHERE company_id = p_company_id
    AND triggered_at >= now() - INTERVAL '30 days';
  
  -- Count critical alerts in last 30 days
  SELECT COUNT(*) INTO critical_alerts
  FROM public.security_alerts
  WHERE company_id = p_company_id
    AND severity = 'critical'
    AND triggered_at >= now() - INTERVAL '30 days';
  
  -- Count resolved alerts in last 30 days
  SELECT COUNT(*) INTO resolved_alerts
  FROM public.security_alerts
  WHERE company_id = p_company_id
    AND status = 'resolved'
    AND triggered_at >= now() - INTERVAL '30 days';
  
  -- Calculate average resolution time (in hours)
  SELECT AVG(EXTRACT(EPOCH FROM (resolved_at - triggered_at)) / 3600) INTO avg_resolution_time
  FROM public.security_alerts
  WHERE company_id = p_company_id
    AND status = 'resolved'
    AND resolved_at IS NOT NULL
    AND triggered_at >= now() - INTERVAL '30 days';
  
  -- Count failed login attempts in last 24 hours
  SELECT COUNT(*) INTO failed_logins
  FROM public.security_logs
  WHERE event_type = 'login_failed'
    AND created_at >= now() - INTERVAL '24 hours';
  
  -- Build metrics object
  metrics := jsonb_build_object(
    'total_alerts', COALESCE(total_alerts, 0),
    'critical_alerts', COALESCE(critical_alerts, 0),
    'resolved_alerts', COALESCE(resolved_alerts, 0),
    'resolution_rate', CASE 
      WHEN total_alerts > 0 THEN ROUND((resolved_alerts::NUMERIC / total_alerts::NUMERIC) * 100, 1)
      ELSE 0
    END,
    'avg_resolution_time_hours', ROUND(COALESCE(avg_resolution_time, 0), 1),
    'failed_logins_24h', COALESCE(failed_logins, 0),
    'calculated_at', now()
  );
  
  RETURN metrics;
END;
$function$;

CREATE OR REPLACE FUNCTION public.calculate_incident_metrics(p_incident_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  incident_record RECORD;
  detection_time INTEGER := 0;
  acknowledgment_time INTEGER;
  response_time INTEGER;
  resolution_time INTEGER;
BEGIN
  SELECT * INTO incident_record 
  FROM public.security_incidents 
  WHERE id = p_incident_id;
  
  IF NOT FOUND THEN
    RETURN;
  END IF;
  
  IF incident_record.acknowledged_at IS NOT NULL THEN
    acknowledgment_time := EXTRACT(EPOCH FROM (incident_record.acknowledged_at - incident_record.detected_at)) / 60;
  END IF;
  
  IF incident_record.reported_at IS NOT NULL THEN
    response_time := EXTRACT(EPOCH FROM (incident_record.reported_at - incident_record.detected_at)) / 60;
  END IF;
  
  IF incident_record.resolved_at IS NOT NULL THEN
    resolution_time := EXTRACT(EPOCH FROM (incident_record.resolved_at - incident_record.detected_at)) / 60;
  END IF;
  
  INSERT INTO public.incident_metrics (
    company_id, incident_id, detection_time_minutes, 
    acknowledgment_time_minutes, response_time_minutes, resolution_time_minutes
  ) VALUES (
    incident_record.company_id, p_incident_id, detection_time,
    acknowledgment_time, response_time, resolution_time
  ) ON CONFLICT (incident_id) DO UPDATE SET
    acknowledgment_time_minutes = EXCLUDED.acknowledgment_time_minutes,
    response_time_minutes = EXCLUDED.response_time_minutes,
    resolution_time_minutes = EXCLUDED.resolution_time_minutes;
    
END;
$function$;