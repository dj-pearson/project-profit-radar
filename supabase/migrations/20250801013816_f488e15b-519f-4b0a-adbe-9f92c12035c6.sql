-- Security Fix Migration Part 3: Fix remaining database function security vulnerabilities
-- Continue securing the rest of the functions with SET search_path = ''

-- Additional Management Functions
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

CREATE OR REPLACE FUNCTION public.set_request_due_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.due_date IS NULL THEN
    NEW.due_date := CURRENT_DATE + INTERVAL '7 days';
  END IF;
  RETURN NEW;
END;
$function$;

-- Warranty and Service Functions
CREATE OR REPLACE FUNCTION public.calculate_warranty_end_date()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  NEW.warranty_end_date := NEW.warranty_start_date + (NEW.warranty_duration_months || ' months')::interval;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_warranty_transfer()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.transferred_to IS NOT NULL AND OLD.transferred_to IS NULL THEN
    NEW.transfer_date := now();
    NEW.status := 'transferred';
  END IF;
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.log_service_call_status_change()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.service_call_status_log (service_call_id, old_status, new_status, changed_by, changed_at)
    VALUES (NEW.id, OLD.status, NEW.status, auth.uid(), now());
  END IF;
  RETURN NEW;
END;
$function$;

-- Audit and Permission Functions
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

CREATE OR REPLACE FUNCTION public.log_data_access(p_company_id uuid, p_user_id uuid, p_data_type text, p_data_classification text, p_resource_id text, p_resource_name text DEFAULT NULL::text, p_access_method text DEFAULT 'view'::text, p_access_purpose text DEFAULT NULL::text, p_ip_address inet DEFAULT NULL::inet, p_user_agent text DEFAULT NULL::text, p_session_id text DEFAULT NULL::text, p_lawful_basis text DEFAULT NULL::text)
 RETURNS uuid
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  access_log_id UUID;
BEGIN
  INSERT INTO public.data_access_logs (
    company_id, user_id, data_type, data_classification, resource_id, resource_name,
    access_method, access_purpose, ip_address, user_agent, session_id, lawful_basis
  ) VALUES (
    p_company_id, p_user_id, p_data_type, p_data_classification, p_resource_id, p_resource_name,
    p_access_method, p_access_purpose, p_ip_address, p_user_agent, p_session_id, p_lawful_basis
  ) RETURNING id INTO access_log_id;
  
  RETURN access_log_id;
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_role_permissions(p_role user_role)
 RETURNS jsonb
 LANGUAGE plpgsql
 STABLE
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN CASE p_role
    WHEN 'root_admin' THEN '{"level": 10, "can_manage_all": true, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'admin' THEN '{"level": 9, "can_manage_all": false, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'superintendent' THEN '{"level": 8, "can_manage_all": false, "can_manage_team": true, "can_manage_projects": true, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'project_manager' THEN '{"level": 7, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": true, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": true}'::jsonb
    WHEN 'estimator' THEN '{"level": 6, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'accounting' THEN '{"level": 6, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": true, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'safety_officer' THEN '{"level": 5, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'quality_inspector' THEN '{"level": 5, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": true, "can_dispatch": false}'::jsonb
    WHEN 'foreman' THEN '{"level": 4, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'field_supervisor' THEN '{"level": 4, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'technician' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'equipment_operator' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'journeyman' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'office_staff' THEN '{"level": 3, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": true}'::jsonb
    WHEN 'apprentice' THEN '{"level": 2, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'laborer' THEN '{"level": 1, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    WHEN 'client_portal' THEN '{"level": 0, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
    ELSE '{"level": 0, "can_manage_all": false, "can_manage_team": false, "can_manage_projects": false, "can_manage_finance": false, "can_view_reports": false, "can_dispatch": false}'::jsonb
  END;
END;
$function$;

-- Content and Knowledge Base Functions
CREATE OR REPLACE FUNCTION public.increment_article_view_count(article_id_param uuid, user_id_param uuid DEFAULT NULL::uuid, ip_address_param inet DEFAULT NULL::inet, user_agent_param text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert view record
  INSERT INTO public.knowledge_base_views (article_id, user_id, ip_address, user_agent)
  VALUES (article_id_param, user_id_param, ip_address_param, user_agent_param);
  
  -- Update view count
  UPDATE public.knowledge_base_articles 
  SET view_count = view_count + 1 
  WHERE id = article_id_param;
END;
$function$;

CREATE OR REPLACE FUNCTION public.validate_post_for_platform(p_content text, p_platform social_platform, p_media_urls jsonb DEFAULT '[]'::jsonb)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  platform_config RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors JSONB := '[]';
  warnings JSONB := '[]';
  media_count INTEGER;
BEGIN
  -- Get platform configuration
  SELECT * INTO platform_config
  FROM public.social_platform_configs
  WHERE platform = p_platform AND is_active = true;
  
  IF NOT FOUND THEN
    errors := errors || jsonb_build_array('Platform configuration not found');
    RETURN jsonb_build_object('valid', false, 'errors', errors, 'warnings', warnings);
  END IF;
  
  -- Validate text length
  IF platform_config.max_text_length IS NOT NULL AND LENGTH(p_content) > platform_config.max_text_length THEN
    errors := errors || jsonb_build_array(
      'Content exceeds maximum length of ' || platform_config.max_text_length || ' characters'
    );
  END IF;
  
  -- Validate media requirements
  media_count := jsonb_array_length(p_media_urls);
  
  IF media_count > 0 THEN
    IF NOT platform_config.supports_images AND NOT platform_config.supports_videos THEN
      errors := errors || jsonb_build_array('Platform does not support media uploads');
    END IF;
    
    -- Platform-specific media validation
    IF p_platform = 'instagram' AND media_count = 0 THEN
      warnings := warnings || jsonb_build_array('Instagram posts typically perform better with images');
    END IF;
    
    IF p_platform = 'twitter' AND media_count > 4 THEN
      errors := errors || jsonb_build_array('Twitter supports maximum 4 images per post');
    END IF;
  END IF;
  
  -- Build result
  validation_result := jsonb_build_object(
    'valid', jsonb_array_length(errors) = 0,
    'errors', errors,
    'warnings', warnings,
    'character_count', LENGTH(p_content),
    'max_characters', platform_config.max_text_length,
    'media_count', media_count
  );
  
  RETURN validation_result;
END;
$function$;