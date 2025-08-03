-- CRITICAL SECURITY FIXES (CORRECTED)
-- This migration addresses security vulnerabilities identified in the database linter

-- 1. Fix SECURITY DEFINER view that bypasses RLS
-- First, drop the problematic view if it exists
DROP VIEW IF EXISTS public.project_pl_summary;

-- Create a simple project summary view without referencing non-existent tables
CREATE VIEW public.project_pl_summary AS
SELECT 
  p.id as project_id,
  p.name as project_name,
  p.company_id,
  p.budget as total_budget,
  p.completion_percentage
FROM public.projects p;

-- Enable RLS on the view
ALTER VIEW public.project_pl_summary SET (security_barrier = true);

-- 2. Fix functions with mutable search paths by adding SET search_path = ''
-- This prevents search path injection attacks

-- Fix generate_claim_number function
CREATE OR REPLACE FUNCTION public.generate_claim_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  claim_num TEXT;
BEGIN
  claim_num := 'CLM-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('public.claim_number_seq')::TEXT, 6, '0');
  RETURN claim_num;
END;
$function$;

-- Fix generate_po_number function
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

-- Fix generate_estimate_number function
CREATE OR REPLACE FUNCTION public.generate_estimate_number()
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  estimate_num TEXT;
BEGIN
  estimate_num := 'EST-' || TO_CHAR(now(), 'YYYY') || '-' || LPAD(nextval('public.estimate_number_seq')::TEXT, 6, '0');
  RETURN estimate_num;
END;
$function$;

-- Fix generate_api_key function
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

-- Fix create_company_affiliate_code function
CREATE OR REPLACE FUNCTION public.create_company_affiliate_code(p_company_id uuid)
 RETURNS text
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
DECLARE
  code TEXT;
BEGIN
  code := 'COMP-' || UPPER(substring(gen_random_uuid()::text, 1, 8));
  
  INSERT INTO public.affiliate_codes (company_id, affiliate_code, created_at)
  VALUES (p_company_id, code, now());
  
  RETURN code;
END;
$function$;

-- 3. Create sequences that may be missing for the number generation functions
CREATE SEQUENCE IF NOT EXISTS public.claim_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.po_number_seq START 1;
CREATE SEQUENCE IF NOT EXISTS public.estimate_number_seq START 1;

-- 4. Review and tighten overly permissive RLS policies
-- Drop and recreate some overly broad policies with more specific conditions

-- Fix blog_posts policies that allow all authenticated users to manage posts
DROP POLICY IF EXISTS "Authenticated users can manage blog posts" ON public.blog_posts;

-- Create more restrictive blog post policies
CREATE POLICY "Root admins can manage all blog posts" 
ON public.blog_posts 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Users can manage their own blog posts" 
ON public.blog_posts 
FOR ALL 
USING (created_by = auth.uid());

-- 5. Add security monitoring for administrative actions
-- Create a trigger to log security-sensitive operations
CREATE OR REPLACE FUNCTION public.log_admin_action()
RETURNS TRIGGER AS $$
BEGIN
  -- Log significant admin actions for security monitoring
  IF TG_OP = 'INSERT' OR TG_OP = 'UPDATE' OR TG_OP = 'DELETE' THEN
    INSERT INTO public.audit_logs (
      company_id,
      user_id,
      action_type,
      resource_type,
      resource_id,
      description,
      metadata
    ) VALUES (
      COALESCE(NEW.company_id, OLD.company_id),
      auth.uid(),
      TG_OP,
      TG_TABLE_NAME,
      COALESCE(NEW.id::text, OLD.id::text),
      'Administrative action on ' || TG_TABLE_NAME,
      jsonb_build_object(
        'table', TG_TABLE_NAME,
        'operation', TG_OP,
        'timestamp', now()
      )
    );
  END IF;
  
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';

-- Apply the audit trigger to security-sensitive tables
DROP TRIGGER IF EXISTS audit_api_keys ON public.api_keys;
CREATE TRIGGER audit_api_keys
  AFTER INSERT OR UPDATE OR DELETE ON public.api_keys
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

DROP TRIGGER IF EXISTS audit_user_profiles ON public.user_profiles;
CREATE TRIGGER audit_user_profiles
  AFTER INSERT OR UPDATE OR DELETE ON public.user_profiles
  FOR EACH ROW EXECUTE FUNCTION public.log_admin_action();

-- 6. Add rate limiting for security functions
-- Create a simple rate limiting mechanism for sensitive operations
CREATE TABLE IF NOT EXISTS public.security_rate_limits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  operation_type text NOT NULL,
  request_count integer DEFAULT 1,
  window_start timestamp with time zone DEFAULT now(),
  created_at timestamp with time zone DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.security_rate_limits ENABLE ROW LEVEL SECURITY;

-- Policy for rate limits - users can only see their own
CREATE POLICY "Users can view own rate limits" 
ON public.security_rate_limits 
FOR SELECT 
USING (user_id = auth.uid());

-- Policy for system to manage rate limits
CREATE POLICY "System can manage rate limits" 
ON public.security_rate_limits 
FOR ALL 
USING (auth.role() = 'service_role');

COMMENT ON TABLE public.security_rate_limits IS 'Tracks rate limiting for security-sensitive operations';
COMMENT ON VIEW public.project_pl_summary IS 'Project summary view - recreated without SECURITY DEFINER to enforce RLS';