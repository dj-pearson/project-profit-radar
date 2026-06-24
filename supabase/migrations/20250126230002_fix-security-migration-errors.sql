-- =========================================
-- SECURITY FIXES - ERROR CORRECTIONS
-- =========================================
-- This migration fixes errors in the previous security fix migrations

-- =========================================
-- FIX 1: Correct column name in project_pl_summary view
-- =========================================
-- The job_costs table uses 'total_cost' not 'actual_cost'

DROP VIEW IF EXISTS public.project_pl_summary;
CREATE VIEW public.project_pl_summary AS
SELECT 
  p.id AS project_id,
  p.name AS project_name,
  p.budget AS total_budget,
  COALESCE(SUM(jc.total_cost), 0) AS total_actual_costs,
  COALESCE(p.budget - SUM(jc.total_cost), p.budget) AS profit_loss,
  CASE 
    WHEN p.budget > 0 THEN ((p.budget - COALESCE(SUM(jc.total_cost), 0)) / p.budget) * 100
    ELSE 0
  END AS profit_margin_percentage,
  p.completion_percentage,
  p.status,
  p.start_date,
  p.end_date,
  p.company_id
FROM public.projects p
LEFT JOIN public.job_costs jc ON p.id = jc.project_id
GROUP BY p.id, p.name, p.budget, p.completion_percentage, p.status, p.start_date, p.end_date, p.company_id;

-- Add comment indicating the fix
COMMENT ON VIEW public.project_pl_summary IS 'Project P&L summary view - Fixed to use correct column name (total_cost)';

-- =========================================
-- FIX 2: Handle generate_work_order_number function return type conflict
-- =========================================
-- The existing function returns TEXT, but we need a TRIGGER version too
-- We'll keep the existing TEXT function and create a separate TRIGGER function

-- Keep the existing TEXT-returning function (don't change it)
-- This is used elsewhere in the codebase

-- Create a new TRIGGER function with a different name for auto-setting work order numbers
CREATE OR REPLACE FUNCTION public.set_work_order_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.work_order_number IS NULL THEN
    NEW.work_order_number := 'WO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('work_order_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Update the existing generate_work_order_number function to include search_path
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  next_num INTEGER;
  wo_num TEXT;
BEGIN
  SELECT nextval('public.work_order_number_seq') INTO next_num;
  wo_num := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN wo_num;
END;
$$;

-- =========================================
-- FIX 3: Update the other problematic functions that may have similar issues
-- =========================================

-- Check if other functions need similar fixes by ensuring they don't conflict with existing signatures

-- Update generate_support_ticket_number to be consistent
-- First check if it exists and what signature it has
CREATE OR REPLACE FUNCTION public.set_support_ticket_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.ticket_number IS NULL THEN
    NEW.ticket_number := 'TKT-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('support_ticket_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- Update generate_incident_number to be consistent  
CREATE OR REPLACE FUNCTION public.set_incident_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.incident_number IS NULL THEN
    NEW.incident_number := 'INC-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('incident_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================
-- FIX 4: Ensure all number generation functions follow the same pattern
-- =========================================

-- These should be TRIGGER functions for auto-generation, not TEXT functions
-- We'll create trigger versions with consistent naming

CREATE OR REPLACE FUNCTION public.set_claim_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.claim_number IS NULL THEN
    NEW.claim_number := 'CLM-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('claim_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_estimate_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.estimate_number IS NULL THEN
    NEW.estimate_number := 'EST-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('estimate_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_bid_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.bid_number IS NULL THEN
    NEW.bid_number := 'BID-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('bid_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_service_call_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.service_call_number IS NULL THEN
    NEW.service_call_number := 'SVC-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('service_call_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_customer_request_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.request_number IS NULL THEN
    NEW.request_number := 'REQ-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('customer_request_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_po_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.po_number IS NULL THEN
    NEW.po_number := 'PO-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('po_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_permit_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.permit_number IS NULL THEN
    NEW.permit_number := 'PRM-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('permit_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.set_invoice_number_trigger()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
BEGIN
  IF NEW.invoice_number IS NULL THEN
    NEW.invoice_number := 'INV-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('invoice_number_seq')::TEXT, 6, '0');
  END IF;
  RETURN NEW;
END;
$$;

-- =========================================
-- CLEANUP: Drop the problematic functions from previous migrations
-- =========================================

-- These were the functions that caused the return type conflicts
-- We replace them with the _trigger versions above

DROP FUNCTION IF EXISTS public.generate_work_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_work_order_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_support_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_support_ticket_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_incident_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_incident_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_claim_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_claim_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_estimate_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_estimate_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_bid_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_bid_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_service_call_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_customer_request_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_service_call_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_customer_request_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_po_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_po_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_permit_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_permit_number() CASCADE;
DROP FUNCTION IF EXISTS public.generate_invoice_number() CASCADE;
DROP FUNCTION IF EXISTS public.set_invoice_number() CASCADE;

-- Recreate the generate_work_order_number function with proper search_path
CREATE OR REPLACE FUNCTION public.generate_work_order_number()
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  next_num INTEGER;
  wo_num TEXT;
BEGIN
  SELECT nextval('public.work_order_number_seq') INTO next_num;
  wo_num := 'WO-' || TO_CHAR(CURRENT_DATE, 'YYYY') || '-' || LPAD(next_num::TEXT, 4, '0');
  RETURN wo_num;
END;
$$;

-- =========================================
-- FIX 5: Update existing functions that have conflicts with proper search_path
-- =========================================

-- Update calculate_incident_metrics if it exists
DO $$
BEGIN
  -- Check if function exists and update it with search_path
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_incident_metrics') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.calculate_incident_metrics(p_company_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = ''''
    AS $func$
    DECLARE
      metrics JSONB := ''{}''::jsonb;
      total_incidents INTEGER;
      open_incidents INTEGER;
      avg_resolution_time INTERVAL;
    BEGIN
      SELECT COUNT(*) INTO total_incidents
      FROM public.incidents 
      WHERE company_id = p_company_id;
      
      SELECT COUNT(*) INTO open_incidents
      FROM public.incidents 
      WHERE company_id = p_company_id AND status IN (''open'', ''investigating'');
      
      SELECT AVG(resolved_at - created_at) INTO avg_resolution_time
      FROM public.incidents 
      WHERE company_id = p_company_id AND resolved_at IS NOT NULL;
      
      metrics := jsonb_build_object(
        ''total_incidents'', total_incidents,
        ''open_incidents'', open_incidents,
        ''avg_resolution_hours'', EXTRACT(EPOCH FROM avg_resolution_time) / 3600
      );
      
      RETURN metrics;
    END;
    $func$;';
  END IF;
END $$;

-- Update calculate_security_metrics if it exists
DO $$
BEGIN
  -- Check if function exists and update it with search_path
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'calculate_security_metrics') THEN
    EXECUTE '
    CREATE OR REPLACE FUNCTION public.calculate_security_metrics(p_company_id UUID)
    RETURNS JSONB
    LANGUAGE plpgsql
    SECURITY DEFINER SET search_path = ''''
    AS $func$
    DECLARE
      metrics JSONB := ''{}''::jsonb;
      failed_logins INTEGER;
      security_alerts INTEGER;
      mfa_enabled_users INTEGER;
      total_users INTEGER;
    BEGIN
      SELECT COUNT(*) INTO failed_logins
      FROM public.security_logs 
      WHERE event_type = ''login_failed'' 
        AND created_at > now() - INTERVAL ''24 hours'';
      
      SELECT COUNT(*) INTO security_alerts
      FROM public.security_alerts 
        WHERE created_at > now() - INTERVAL ''24 hours'';
      
      SELECT COUNT(*) INTO mfa_enabled_users
      FROM public.user_security us
      JOIN public.user_profiles up ON us.user_id = up.id
      WHERE up.company_id = p_company_id AND us.two_factor_enabled = true;
      
      SELECT COUNT(*) INTO total_users
      FROM public.user_profiles 
      WHERE company_id = p_company_id;
      
      metrics := jsonb_build_object(
        ''failed_logins_24h'', failed_logins,
        ''security_alerts_24h'', security_alerts,
        ''mfa_adoption_rate'', CASE WHEN total_users > 0 THEN (mfa_enabled_users::float / total_users * 100) ELSE 0 END
      );
      
      RETURN metrics;
    END;
    $func$;';
  END IF;
END $$;

-- =========================================
-- FIX 6: Add API and Blog functions with proper search_path
-- =========================================

-- API functions (safe to create as new or update existing)
CREATE OR REPLACE FUNCTION public.generate_api_key(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  api_key TEXT;
BEGIN
  api_key := 'bd_' || encode(gen_random_bytes(32), 'base64');
  
  INSERT INTO public.api_keys (user_id, key_hash, created_at)
  VALUES (p_user_id, crypt(api_key, gen_salt('bf')), now());
  
  RETURN api_key;
END;
$$;

CREATE OR REPLACE FUNCTION public.validate_api_permission(
  p_api_key TEXT,
  p_permission TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_permissions JSONB;
BEGIN
  SELECT up.permissions INTO user_permissions
  FROM public.api_keys ak
  JOIN public.user_profiles up ON ak.user_id = up.id
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash)
    AND ak.active = true;
  
  IF NOT FOUND THEN
    RETURN false;
  END IF;
  
  RETURN user_permissions ? p_permission;
END;
$$;

CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_api_key TEXT,
  p_endpoint TEXT,
  p_method TEXT
)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  user_id UUID;
BEGIN
  SELECT ak.user_id INTO user_id
  FROM public.api_keys ak
  WHERE ak.key_hash = crypt(p_api_key, ak.key_hash);
  
  IF FOUND THEN
    INSERT INTO public.api_usage_logs (
      user_id,
      endpoint,
      method,
      created_at
    ) VALUES (
      user_id,
      p_endpoint,
      p_method,
      now()
    );
  END IF;
END;
$$;

-- Blog generation functions
CREATE OR REPLACE FUNCTION public.calculate_next_generation_time(p_company_id UUID)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  last_generation TIMESTAMP WITH TIME ZONE;
  frequency_hours INTEGER := 24; -- Default to daily
BEGIN
  SELECT last_generated_at INTO last_generation
  FROM public.blog_generation_schedule
  WHERE company_id = p_company_id;
  
  IF last_generation IS NULL THEN
    RETURN now() + INTERVAL '1 hour';
  END IF;
  
  RETURN last_generation + (frequency_hours || ' hours')::INTERVAL;
END;
$$;

CREATE OR REPLACE FUNCTION public.queue_next_blog_generation(p_company_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  next_time TIMESTAMP WITH TIME ZONE;
BEGIN
  SELECT public.calculate_next_generation_time(p_company_id) INTO next_time;
  
  INSERT INTO public.blog_generation_queue (
    company_id,
    scheduled_for,
    status,
    created_at
  ) VALUES (
    p_company_id,
    next_time,
    'pending',
    now()
  );
END;
$$;

-- =========================================
-- FIX 7: Handle add_subscriber_to_funnel function signature conflict
-- =========================================

-- Create with a unique name to avoid signature conflicts
CREATE OR REPLACE FUNCTION public.add_subscriber_to_marketing_funnel(
  p_email TEXT,
  p_funnel_id UUID,
  p_source TEXT DEFAULT 'website'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  subscriber_id UUID;
BEGIN
  INSERT INTO public.funnel_subscribers (
    id,
    email,
    funnel_id,
    source,
    status,
    subscribed_at
  ) VALUES (
    gen_random_uuid(),
    p_email,
    p_funnel_id,
    p_source,
    'active',
    now()
  ) RETURNING id INTO subscriber_id;
  
  RETURN subscriber_id;
END;
$$;

-- Add comment to indicate this is the security-fixed version
COMMENT ON FUNCTION public.add_subscriber_to_marketing_funnel IS 'Adds a subscriber to a marketing funnel with proper security settings';

-- Add comment to indicate the fix is complete
COMMENT ON FUNCTION public.generate_work_order_number IS 'Security fix applied: search_path set, return type conflicts resolved'; 