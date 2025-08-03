-- FINAL SECURITY FIXES - Address remaining search path issues
-- This migration fixes the remaining functions that need SET search_path = ''

-- Fix all remaining functions with mutable search paths
-- Based on the database schema, these are the functions that still need fixing:

-- Fix log_security_event function (multiple versions exist)
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

-- Fix calculate_project_completion function
CREATE OR REPLACE FUNCTION public.calculate_project_completion(p_project_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  task_avg numeric := 0;
  task_count integer := 0;
BEGIN
  SELECT 
    COALESCE(AVG(completion_percentage), 0),
    COUNT(*)
  INTO task_avg, task_count
  FROM public.tasks 
  WHERE project_id = p_project_id;
  
  IF task_count = 0 THEN
    RETURN 0;
  END IF;
  
  RETURN ROUND(task_avg, 1);
END;
$function$;

-- Fix check_project_requirements function
CREATE OR REPLACE FUNCTION public.check_project_requirements(p_project_id uuid, p_contract_value numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  bond_threshold NUMERIC := 35000;
  insurance_threshold NUMERIC := 35000;
  result JSONB := '{"bonds_required": false, "insurance_required": false, "requirements": []}'::jsonb;
  requirements JSONB := '[]'::jsonb;
BEGIN
  IF p_contract_value >= bond_threshold THEN
    result := jsonb_set(result, '{bonds_required}', 'true');
    requirements := requirements || '["Performance Bond Required", "Payment Bond Required"]'::jsonb;
  END IF;
  
  IF p_contract_value >= insurance_threshold THEN
    result := jsonb_set(result, '{insurance_required}', 'true');
    requirements := requirements || '["General Liability Insurance Required", "Workers Compensation Required"]'::jsonb;
  END IF;
  
  result := jsonb_set(result, '{requirements}', requirements);
  RETURN result;
END;
$function$;

-- Fix calculate_lead_score function
CREATE OR REPLACE FUNCTION public.calculate_lead_score(p_lead_id uuid)
 RETURNS integer
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

-- Fix log_audit_event function
CREATE OR REPLACE FUNCTION public.log_audit_event(p_company_id uuid, p_user_id uuid, p_action_type text, p_resource_type text, p_resource_id text DEFAULT NULL::text, p_resource_name text DEFAULT NULL::text, p_old_values jsonb DEFAULT NULL::jsonb, p_new_values jsonb DEFAULT NULL::jsonb, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_risk_level text DEFAULT 'low'::text, p_compliance_category text DEFAULT 'general'::text, p_description text DEFAULT NULL::text, p_metadata jsonb DEFAULT '{}'::jsonb)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  log_id UUID;
BEGIN
  INSERT INTO public.audit_logs (
    company_id, user_id, action_type, resource_type, resource_id, resource_name,
    old_values, new_values, ip_address, user_agent, session_id, risk_level,
    compliance_category, description, metadata
  ) VALUES (
    p_company_id, p_user_id, p_action_type, p_resource_type, p_resource_id, p_resource_name,
    p_old_values, p_new_values, p_ip_address, p_user_agent, p_session_id, p_risk_level,
    p_compliance_category, p_description, p_metadata
  ) RETURNING id INTO log_id;
  
  RETURN log_id;
END;
$function$;

-- Fix update_updated_at_column function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;