-- Create API keys table for external integrations
CREATE TABLE IF NOT EXISTS public.api_keys (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  key_name TEXT NOT NULL,
  api_key_hash TEXT NOT NULL UNIQUE,
  api_key_prefix TEXT NOT NULL,
  permissions JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  expires_at TIMESTAMP WITH TIME ZONE,
  last_used_at TIMESTAMP WITH TIME ZONE,
  usage_count INTEGER NOT NULL DEFAULT 0,
  rate_limit_per_hour INTEGER NOT NULL DEFAULT 1000,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook endpoints table
CREATE TABLE IF NOT EXISTS public.webhook_endpoints (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  endpoint_name TEXT NOT NULL,
  url TEXT NOT NULL,
  secret_token TEXT NOT NULL,
  events JSONB NOT NULL DEFAULT '[]',
  is_active BOOLEAN NOT NULL DEFAULT true,
  retry_attempts INTEGER NOT NULL DEFAULT 3,
  timeout_seconds INTEGER NOT NULL DEFAULT 30,
  last_success_at TIMESTAMP WITH TIME ZONE,
  last_failure_at TIMESTAMP WITH TIME ZONE,
  failure_count INTEGER NOT NULL DEFAULT 0,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create API request logs table for audit compliance
CREATE TABLE IF NOT EXISTS public.api_request_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID,
  api_key_id UUID,
  endpoint TEXT NOT NULL,
  method TEXT NOT NULL,
  request_headers JSONB,
  request_body JSONB,
  response_status INTEGER,
  response_headers JSONB,
  response_body JSONB,
  ip_address INET,
  user_agent TEXT,
  processing_time_ms INTEGER,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create webhook delivery logs table
CREATE TABLE IF NOT EXISTS public.webhook_delivery_logs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  webhook_endpoint_id UUID NOT NULL,
  event_type TEXT NOT NULL,
  payload JSONB NOT NULL,
  delivery_status TEXT NOT NULL, -- 'pending', 'success', 'failed', 'cancelled'
  response_status INTEGER,
  response_body TEXT,
  attempt_number INTEGER NOT NULL DEFAULT 1,
  next_retry_at TIMESTAMP WITH TIME ZONE,
  delivered_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create integration configurations table
CREATE TABLE IF NOT EXISTS public.integration_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  integration_type TEXT NOT NULL, -- 'quickbooks', 'procore', 'buildertrend', 'custom'
  integration_name TEXT NOT NULL,
  configuration JSONB NOT NULL DEFAULT '{}',
  credentials_encrypted TEXT,
  is_active BOOLEAN NOT NULL DEFAULT true,
  sync_enabled BOOLEAN NOT NULL DEFAULT false,
  last_sync_at TIMESTAMP WITH TIME ZONE,
  sync_frequency TEXT NOT NULL DEFAULT 'manual', -- 'manual', 'hourly', 'daily', 'weekly'
  error_count INTEGER NOT NULL DEFAULT 0,
  last_error TEXT,
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_api_keys_company_id ON public.api_keys(company_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_hash ON public.api_keys(api_key_hash);
CREATE INDEX IF NOT EXISTS idx_api_keys_prefix ON public.api_keys(api_key_prefix);

CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_company_id ON public.webhook_endpoints(company_id);
CREATE INDEX IF NOT EXISTS idx_webhook_endpoints_active ON public.webhook_endpoints(is_active);

CREATE INDEX IF NOT EXISTS idx_api_request_logs_company_id ON public.api_request_logs(company_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_api_key_id ON public.api_request_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_request_logs_created_at ON public.api_request_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_endpoint_id ON public.webhook_delivery_logs(webhook_endpoint_id);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_status ON public.webhook_delivery_logs(delivery_status);
CREATE INDEX IF NOT EXISTS idx_webhook_delivery_logs_created_at ON public.webhook_delivery_logs(created_at);

CREATE INDEX IF NOT EXISTS idx_integration_configurations_company_id ON public.integration_configurations(company_id);
CREATE INDEX IF NOT EXISTS idx_integration_configurations_type ON public.integration_configurations(integration_type);

-- Create function to generate API key
CREATE OR REPLACE FUNCTION public.generate_api_key()
RETURNS TEXT
LANGUAGE plpgsql
AS $$
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
$$;

-- Create function to validate API permissions
CREATE OR REPLACE FUNCTION public.validate_api_permission(
  p_api_key_hash TEXT,
  p_permission TEXT,
  p_company_id UUID DEFAULT NULL
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to log API usage
CREATE OR REPLACE FUNCTION public.log_api_usage(
  p_api_key_hash TEXT,
  p_endpoint TEXT,
  p_method TEXT,
  p_ip_address INET DEFAULT NULL,
  p_user_agent TEXT DEFAULT NULL,
  p_processing_time_ms INTEGER DEFAULT NULL,
  p_response_status INTEGER DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Add RLS policies
ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_endpoints ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.api_request_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.webhook_delivery_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.integration_configurations ENABLE ROW LEVEL SECURITY;

-- API Keys policies
CREATE POLICY "Admins can manage company API keys" ON public.api_keys
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "Root admins can view all API keys" ON public.api_keys
  FOR SELECT USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Webhook endpoints policies
CREATE POLICY "Admins can manage company webhook endpoints" ON public.webhook_endpoints
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

-- API request logs policies
CREATE POLICY "Admins can view company API logs" ON public.api_request_logs
  FOR SELECT USING (
    company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

CREATE POLICY "System can insert API logs" ON public.api_request_logs
  FOR INSERT WITH CHECK (true);

-- Webhook delivery logs policies
CREATE POLICY "Admins can view webhook delivery logs" ON public.webhook_delivery_logs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.webhook_endpoints we
      WHERE we.id = webhook_delivery_logs.webhook_endpoint_id
        AND we.company_id = get_user_company(auth.uid())
        AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
    )
  );

CREATE POLICY "System can manage webhook delivery logs" ON public.webhook_delivery_logs
  FOR ALL WITH CHECK (true);

-- Integration configurations policies
CREATE POLICY "Admins can manage company integrations" ON public.integration_configurations
  FOR ALL USING (
    company_id = get_user_company(auth.uid()) 
    AND get_user_role(auth.uid()) = ANY(ARRAY['admin'::user_role, 'root_admin'::user_role])
  );

-- Add triggers for updated_at
CREATE TRIGGER update_api_keys_updated_at
  BEFORE UPDATE ON public.api_keys
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_webhook_endpoints_updated_at
  BEFORE UPDATE ON public.webhook_endpoints
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_integration_configurations_updated_at
  BEFORE UPDATE ON public.integration_configurations
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();