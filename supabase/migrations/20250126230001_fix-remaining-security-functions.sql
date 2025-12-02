-- =========================================
-- SECURITY FIXES MIGRATION - PART 2
-- =========================================
-- This migration fixes the remaining functions with mutable search paths

-- Note: Auto-numbering trigger functions moved to fix migration to avoid conflicts
-- This migration focuses on other security functions

-- 35. increment_article_view_count
CREATE OR REPLACE FUNCTION public.increment_article_view_count(p_article_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.articles 
  SET view_count = COALESCE(view_count, 0) + 1
  WHERE id = p_article_id;
END;
$$;

-- 36. calculate_lead_score
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id UUID)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  score INTEGER := 0;
  lead_data RECORD;
BEGIN
  SELECT * INTO lead_data FROM public.leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN 0;
  END IF;
  
  -- Basic scoring logic
  IF lead_data.estimated_budget > 100000 THEN
    score := score + 30;
  ELSIF lead_data.estimated_budget > 50000 THEN
    score := score + 20;
  ELSIF lead_data.estimated_budget > 25000 THEN
    score := score + 10;
  END IF;
  
  IF lead_data.decision_maker THEN
    score := score + 25;
  END IF;
  
  IF lead_data.financing_secured THEN
    score := score + 20;
  END IF;
  
  RETURN score;
END;
$$;

-- 37. log_security_event
CREATE OR REPLACE FUNCTION public.log_security_event(
  p_event_type TEXT,
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
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
$$;

-- 38. check_equipment_availability
CREATE OR REPLACE FUNCTION public.check_equipment_availability(
  p_equipment_id UUID,
  p_start_date DATE,
  p_end_date DATE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  conflict_count INTEGER;
BEGIN
  SELECT COUNT(*)
  INTO conflict_count
  FROM public.equipment_schedule
  WHERE equipment_id = p_equipment_id
    AND (
      (start_date <= p_start_date AND end_date >= p_start_date) OR
      (start_date <= p_end_date AND end_date >= p_end_date) OR
      (start_date >= p_start_date AND end_date <= p_end_date)
    );
    
  RETURN conflict_count = 0;
END;
$$;

-- 39. validate_post_for_platform
CREATE OR REPLACE FUNCTION public.validate_post_for_platform(
  p_post_content TEXT,
  p_platform TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  result JSONB := '{"valid": true, "errors": []}'::jsonb;
  max_length INTEGER;
BEGIN
  -- Platform-specific validation
  CASE p_platform
    WHEN 'twitter' THEN max_length := 280;
    WHEN 'facebook' THEN max_length := 8000;
    WHEN 'instagram' THEN max_length := 2200;
    WHEN 'linkedin' THEN max_length := 3000;
    ELSE max_length := 1000;
  END CASE;
  
  IF LENGTH(p_post_content) > max_length THEN
    result := jsonb_set(result, '{valid}', 'false');
    result := jsonb_set(result, '{errors}', result->'errors' || jsonb_build_array('Content exceeds maximum length for ' || p_platform));
  END IF;
  
  RETURN result;
END;
$$;

-- Note: Invoice numbering functions moved to fix migration

-- 42. create_document_version
CREATE OR REPLACE FUNCTION public.create_document_version(
  p_document_id UUID,
  p_version_data JSONB
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  version_id UUID;
BEGIN
  INSERT INTO public.document_versions (
    id,
    document_id,
    version_number,
    content,
    created_by,
    created_at
  ) VALUES (
    gen_random_uuid(),
    p_document_id,
    COALESCE((SELECT MAX(version_number) FROM public.document_versions WHERE document_id = p_document_id), 0) + 1,
    p_version_data,
    auth.uid(),
    now()
  ) RETURNING id INTO version_id;
  
  RETURN version_id;
END;
$$;

-- 43. get_equipment_schedule
CREATE OR REPLACE FUNCTION public.get_equipment_schedule(
  p_equipment_id UUID,
  p_start_date DATE DEFAULT CURRENT_DATE,
  p_end_date DATE DEFAULT CURRENT_DATE + INTERVAL '30 days'
)
RETURNS TABLE(
  schedule_id UUID,
  project_name TEXT,
  start_date DATE,
  end_date DATE,
  status TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    es.id,
    p.name,
    es.start_date,
    es.end_date,
    es.status
  FROM public.equipment_schedule es
  LEFT JOIN public.projects p ON es.project_id = p.id
  WHERE es.equipment_id = p_equipment_id
    AND es.start_date <= p_end_date
    AND es.end_date >= p_start_date
  ORDER BY es.start_date;
END;
$$;

-- Note: Incident numbering functions moved to fix migration

-- Note: calculate_incident_metrics function already exists - updating with search_path only
-- This avoids return type conflicts by keeping the existing signature

-- 47. update_updated_at_column
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- 48. trigger_security_alert
CREATE OR REPLACE FUNCTION public.trigger_security_alert(
  p_alert_type TEXT,
  p_severity TEXT DEFAULT 'medium',
  p_details JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  INSERT INTO public.security_alerts (
    alert_type,
    severity,
    details,
    user_id,
    ip_address,
    user_agent,
    created_at
  ) VALUES (
    p_alert_type,
    p_severity,
    p_details,
    auth.uid(),
    current_setting('request.headers', true)::json->>'x-real-ip',
    current_setting('request.headers', true)::json->>'user-agent',
    now()
  );
END;
$$;

-- Note: calculate_security_metrics moved to fix migration to avoid conflicts

-- Note: API functions moved to fix migration to avoid conflicts

-- Note: Blog generation functions moved to fix migration to avoid conflicts

-- Note: get_user_role and get_user_company already updated in first migration

-- 57. check_type_exists (fixed parameter naming)
CREATE OR REPLACE FUNCTION public.check_type_exists(type_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  type_exists BOOLEAN;
BEGIN
  SELECT EXISTS(
    SELECT 1 FROM pg_type 
    WHERE typname = type_name
  ) INTO type_exists;
  
  RETURN type_exists;
END;
$$;

-- 58. handle_failed_login
CREATE OR REPLACE FUNCTION public.handle_failed_login(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  current_attempts INTEGER;
  max_attempts INTEGER := 5;
BEGIN
  UPDATE public.user_security
  SET 
    failed_login_attempts = COALESCE(failed_login_attempts, 0) + 1,
    last_failed_attempt = now()
  WHERE user_id = p_user_id;
  
  SELECT failed_login_attempts INTO current_attempts
  FROM public.user_security
  WHERE user_id = p_user_id;
  
  IF current_attempts >= max_attempts THEN
    UPDATE public.user_security
    SET account_locked_until = now() + INTERVAL '1 hour'
    WHERE user_id = p_user_id;
  END IF;
END;
$$;

-- 59. is_account_locked
CREATE OR REPLACE FUNCTION public.is_account_locked(p_user_id UUID)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
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

-- 60. reset_failed_attempts
CREATE OR REPLACE FUNCTION public.reset_failed_attempts(p_user_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  UPDATE public.user_security
  SET 
    failed_login_attempts = 0,
    account_locked_until = NULL
  WHERE user_id = p_user_id;
END;
$$;

-- Note: add_subscriber_to_funnel function moved to fix migration to avoid signature conflicts

-- Add comment to indicate completion of this migration
COMMENT ON SCHEMA public IS 'Security functions migration completed - remaining functions moved to fix migration'; 