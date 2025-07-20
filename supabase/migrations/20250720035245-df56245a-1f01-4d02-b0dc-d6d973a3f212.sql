-- Add system settings table for DOS protection configuration
CREATE TABLE IF NOT EXISTS public.system_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  setting_key TEXT NOT NULL UNIQUE,
  setting_value JSONB NOT NULL DEFAULT '{}',
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for better performance
CREATE INDEX IF NOT EXISTS idx_system_settings_key ON public.system_settings(setting_key);

-- Add security events table for logging DOS protection events
CREATE TABLE IF NOT EXISTS public.security_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info',
  description TEXT,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Add indexes for security events
CREATE INDEX IF NOT EXISTS idx_security_events_type ON public.security_events(event_type);
CREATE INDEX IF NOT EXISTS idx_security_events_severity ON public.security_events(severity);
CREATE INDEX IF NOT EXISTS idx_security_events_ip ON public.security_events(ip_address);
CREATE INDEX IF NOT EXISTS idx_security_events_created_at ON public.security_events(created_at);

-- Add function to detect rapid fire attacks
CREATE OR REPLACE FUNCTION public.detect_rapid_fire_attacks(
  time_window TIMESTAMP WITH TIME ZONE,
  threshold INTEGER DEFAULT 50
)
RETURNS TABLE(
  ip_address INET,
  attack_count BIGINT,
  first_request TIMESTAMP WITH TIME ZONE,
  last_request TIMESTAMP WITH TIME ZONE
)
LANGUAGE sql
STABLE
AS $$
  SELECT 
    rlv.ip_address,
    COUNT(*) as attack_count,
    MIN(rlv.created_at) as first_request,
    MAX(rlv.created_at) as last_request
  FROM public.rate_limit_violations rlv
  WHERE rlv.created_at >= time_window
  GROUP BY rlv.ip_address
  HAVING COUNT(*) >= threshold
  ORDER BY attack_count DESC;
$$;

-- Add enhanced rate limit violations table columns if they don't exist
DO $$ 
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_limit_violations' AND column_name='attack_type') THEN
    ALTER TABLE public.rate_limit_violations ADD COLUMN attack_type TEXT DEFAULT 'unknown';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_limit_violations' AND column_name='severity') THEN
    ALTER TABLE public.rate_limit_violations ADD COLUMN severity TEXT DEFAULT 'medium';
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_limit_violations' AND column_name='user_agent') THEN
    ALTER TABLE public.rate_limit_violations ADD COLUMN user_agent TEXT;
  END IF;
  
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='rate_limit_violations' AND column_name='geo_location') THEN
    ALTER TABLE public.rate_limit_violations ADD COLUMN geo_location JSONB;
  END IF;
END $$;

-- Insert default DOS protection settings
INSERT INTO public.system_settings (setting_key, setting_value, description)
VALUES (
  'dos_protection',
  '{
    "enabled": true,
    "auto_block_threshold": 100,
    "block_duration_hours": 24,
    "detection_window_minutes": 5,
    "whitelist_enabled": false,
    "geo_blocking_enabled": false,
    "challenge_response_enabled": false
  }',
  'DOS protection configuration settings'
)
ON CONFLICT (setting_key) DO NOTHING;

-- Add RLS policies for security events (admin only)
ALTER TABLE public.security_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view security events" ON public.security_events
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = ANY(ARRAY['admin', 'root_admin'])
    )
  );

CREATE POLICY "System can insert security events" ON public.security_events
  FOR INSERT WITH CHECK (true);

-- Add RLS policies for system settings (admin only)
ALTER TABLE public.system_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can manage system settings" ON public.system_settings
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM user_profiles 
      WHERE id = auth.uid() 
      AND role = ANY(ARRAY['admin', 'root_admin'])
    )
  );

-- Create trigger to update updated_at timestamp
CREATE OR REPLACE TRIGGER update_system_settings_updated_at
  BEFORE UPDATE ON public.system_settings
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();