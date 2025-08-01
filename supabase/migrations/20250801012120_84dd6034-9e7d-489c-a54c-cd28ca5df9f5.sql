-- Security Fix Migration Part 2: Fix remaining database function security vulnerabilities
-- Continue securing all remaining functions with SET search_path = ''

-- Project and Task Management Functions
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

CREATE OR REPLACE FUNCTION public.update_project_completion()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  target_project_id uuid;
  new_completion numeric;
BEGIN
  IF TG_OP = 'DELETE' THEN
    target_project_id := OLD.project_id;
  ELSE
    target_project_id := NEW.project_id;
  END IF;
  
  SELECT public.calculate_project_completion(target_project_id)
  INTO new_completion;
  
  UPDATE public.projects 
  SET 
    completion_percentage = new_completion,
    updated_at = now()
  WHERE id = target_project_id;
  
  RETURN COALESCE(NEW, OLD);
END;
$function$;

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

-- Number Generation Functions
CREATE OR REPLACE FUNCTION public.generate_claim_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  claim_num TEXT;
BEGIN
  claim_num := 'CLM-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('claim_number_seq')::TEXT, 6, '0');
  RETURN claim_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_estimate_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  estimate_num TEXT;
BEGIN
  estimate_num := 'EST-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('estimate_number_seq')::TEXT, 6, '0');
  RETURN estimate_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.generate_po_number(company_uuid uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  next_num INTEGER;
  po_num TEXT;
BEGIN
  SELECT nextval('public.po_number_seq') INTO next_num;
  po_num := 'PO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN po_num;
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_work_order_number_trigger()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  IF NEW.work_order_number IS NULL THEN
    NEW.work_order_number := 'WO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('work_order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$function$;

-- Lead Management Functions
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

CREATE OR REPLACE FUNCTION public.calculate_enhanced_lead_score(p_lead_id uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  lead_data RECORD;
  behavioral_data RECORD;
  score JSONB := '{}';
  overall_score INTEGER := 0;
  demographic_score INTEGER := 0;
  behavioral_score INTEGER := 0;
  engagement_score INTEGER := 0;
  fit_score INTEGER := 0;
  intent_score INTEGER := 0;
  timing_score INTEGER := 0;
BEGIN
  -- Get lead data
  SELECT * INTO lead_data FROM leads WHERE id = p_lead_id;
  
  IF NOT FOUND THEN
    RETURN jsonb_build_object('error', 'Lead not found');
  END IF;
  
  -- Get behavioral data
  SELECT * INTO behavioral_data FROM lead_behavioral_data WHERE lead_id = p_lead_id;
  
  -- Calculate demographic score (0-100)
  demographic_score := 0;
  
  -- Budget qualification
  IF lead_data.estimated_budget > 100000 THEN
    demographic_score := demographic_score + 40;
  ELSIF lead_data.estimated_budget > 50000 THEN
    demographic_score := demographic_score + 25;
  ELSIF lead_data.estimated_budget > 25000 THEN
    demographic_score := demographic_score + 15;
  END IF;
  
  -- Decision maker status
  IF lead_data.decision_maker THEN
    demographic_score := demographic_score + 25;
  END IF;
  
  -- Company size (if available)
  IF lead_data.company_name IS NOT NULL AND length(lead_data.company_name) > 0 THEN
    demographic_score := demographic_score + 15;
  END IF;
  
  -- Location fit
  IF lead_data.location IS NOT NULL THEN
    demographic_score := demographic_score + 10;
  END IF;
  
  -- Financing secured
  IF lead_data.financing_secured THEN
    demographic_score := demographic_score + 10;
  END IF;
  
  demographic_score := LEAST(demographic_score, 100);
  
  -- Calculate behavioral score if data exists
  IF behavioral_data IS NOT NULL THEN
    behavioral_score := 0;
    
    -- Email engagement
    IF behavioral_data.email_opens > 5 THEN
      behavioral_score := behavioral_score + 20;
    ELSIF behavioral_data.email_opens > 2 THEN
      behavioral_score := behavioral_score + 10;
    END IF;
    
    -- Website engagement
    IF behavioral_data.website_visits > 10 THEN
      behavioral_score := behavioral_score + 25;
    ELSIF behavioral_data.website_visits > 5 THEN
      behavioral_score := behavioral_score + 15;
    ELSIF behavioral_data.website_visits > 0 THEN
      behavioral_score := behavioral_score + 5;
    END IF;
    
    -- Content downloads
    behavioral_score := behavioral_score + LEAST(behavioral_data.document_downloads * 10, 30);
    
    -- Form submissions
    behavioral_score := behavioral_score + LEAST(behavioral_data.form_submissions * 15, 25);
    
    behavioral_score := LEAST(behavioral_score, 100);
  END IF;
  
  -- Calculate engagement score
  engagement_score := COALESCE(behavioral_data.engagement_score, 0);
  
  -- Calculate fit score based on industry, size, location
  fit_score := demographic_score; -- Use demographic as base fit for now
  
  -- Calculate intent score based on recent activities
  IF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '7 days') THEN
    intent_score := 80;
  ELSIF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '30 days') THEN
    intent_score := 60;
  ELSIF behavioral_data IS NOT NULL AND behavioral_data.last_activity_at > (now() - INTERVAL '90 days') THEN
    intent_score := 30;
  ELSE
    intent_score := 10;
  END IF;
  
  -- Calculate timing score
  IF lead_data.project_timeline = 'immediate' THEN
    timing_score := 90;
  ELSIF lead_data.project_timeline = '1-3 months' THEN
    timing_score := 75;
  ELSIF lead_data.project_timeline = '3-6 months' THEN
    timing_score := 50;
  ELSIF lead_data.project_timeline = '6-12 months' THEN
    timing_score := 25;
  ELSE
    timing_score := 10;
  END IF;
  
  -- Calculate weighted overall score
  overall_score := ROUND((
    demographic_score * 0.25 +
    behavioral_score * 0.20 +
    engagement_score * 0.15 +
    fit_score * 0.15 +
    intent_score * 0.15 +
    timing_score * 0.10
  ));
  
  -- Build response
  score := jsonb_build_object(
    'overall_score', overall_score,
    'demographic_score', demographic_score,
    'behavioral_score', behavioral_score,
    'engagement_score', engagement_score,
    'fit_score', fit_score,
    'intent_score', intent_score,
    'timing_score', timing_score,
    'calculated_at', now()
  );
  
  RETURN score;
END;
$function$;

-- Equipment and Resource Management Functions
CREATE OR REPLACE FUNCTION public.check_equipment_availability(p_equipment_id uuid, p_start_date date, p_end_date date, p_requested_quantity integer DEFAULT 1, p_exclude_assignment_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  total_quantity INTEGER := 0;
  assigned_quantity INTEGER := 0;
  available_quantity INTEGER := 0;
  overlapping_assignments JSONB := '[]'::JSONB;
  assignment_record RECORD;
BEGIN
  -- Get total equipment quantity (defaulting to 1 for now)
  total_quantity := 1;
  
  -- Calculate assigned quantity during the requested period
  SELECT COALESCE(SUM(ea.assigned_quantity), 0)
  INTO assigned_quantity
  FROM public.equipment_assignments ea
  WHERE ea.equipment_id = p_equipment_id
    AND ea.assignment_status IN ('planned', 'active')
    AND ea.start_date <= p_end_date
    AND ea.end_date >= p_start_date
    AND (p_exclude_assignment_id IS NULL OR ea.id != p_exclude_assignment_id);
  
  -- Calculate available quantity
  available_quantity := total_quantity - assigned_quantity;
  
  -- Get overlapping assignments for detailed view
  FOR assignment_record IN
    SELECT 
      ea.id,
      ea.project_id,
      p.name as project_name,
      ea.assigned_quantity,
      ea.start_date,
      ea.end_date,
      ea.assignment_status
    FROM public.equipment_assignments ea
    JOIN public.projects p ON p.id = ea.project_id
    WHERE ea.equipment_id = p_equipment_id
      AND ea.assignment_status IN ('planned', 'active')
      AND ea.start_date <= p_end_date
      AND ea.end_date >= p_start_date
      AND (p_exclude_assignment_id IS NULL OR ea.id != p_exclude_assignment_id)
  LOOP
    overlapping_assignments := overlapping_assignments || jsonb_build_object(
      'assignment_id', assignment_record.id,
      'project_id', assignment_record.project_id,
      'project_name', assignment_record.project_name,
      'quantity', assignment_record.assigned_quantity,
      'start_date', assignment_record.start_date,
      'end_date', assignment_record.end_date,
      'status', assignment_record.assignment_status
    );
  END LOOP;
  
  RETURN jsonb_build_object(
    'total_quantity', total_quantity,
    'assigned_quantity', assigned_quantity,
    'available_quantity', available_quantity,
    'is_available', available_quantity >= p_requested_quantity,
    'overlapping_assignments', overlapping_assignments
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.get_equipment_schedule(p_company_id uuid, p_equipment_id uuid DEFAULT NULL::uuid, p_start_date date DEFAULT NULL::date, p_end_date date DEFAULT NULL::date)
 RETURNS TABLE(equipment_id uuid, equipment_name text, assignment_id uuid, project_id uuid, project_name text, assigned_quantity integer, start_date date, end_date date, assignment_status text, days_duration integer)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  RETURN QUERY
  SELECT 
    ea.equipment_id,
    'Equipment Item' as equipment_name, -- We'll update this when we have equipment names
    ea.id as assignment_id,
    ea.project_id,
    p.name as project_name,
    ea.assigned_quantity,
    ea.start_date,
    ea.end_date,
    ea.assignment_status,
    (ea.end_date - ea.start_date + 1) as days_duration
  FROM public.equipment_assignments ea
  JOIN public.projects p ON p.id = ea.project_id
  WHERE ea.company_id = p_company_id
    AND (p_equipment_id IS NULL OR ea.equipment_id = p_equipment_id)
    AND (p_start_date IS NULL OR ea.end_date >= p_start_date)
    AND (p_end_date IS NULL OR ea.start_date <= p_end_date)
    AND ea.assignment_status IN ('planned', 'active', 'completed')
  ORDER BY ea.equipment_id, ea.start_date;
END;
$function$;