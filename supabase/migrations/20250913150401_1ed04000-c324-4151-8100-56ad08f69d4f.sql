-- Create security incidents table
CREATE TABLE public.security_incidents (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  title TEXT NOT NULL,
  description TEXT,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'closed')),
  incident_type TEXT NOT NULL DEFAULT 'general',
  reported_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  resolved_at TIMESTAMP WITH TIME ZONE,
  assigned_to TEXT,
  assigned_user_id UUID,
  response_actions JSONB DEFAULT '[]'::JSONB,
  affected_systems JSONB DEFAULT '[]'::JSONB,
  evidence JSONB DEFAULT '[]'::JSONB,
  resolution_notes TEXT,
  priority INTEGER DEFAULT 3,
  source TEXT,
  reporter_id UUID,
  tags JSONB DEFAULT '[]'::JSONB,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.security_incidents ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company security incidents" 
ON public.security_incidents 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Security staff can manage incidents" 
ON public.security_incidents 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'safety_officer'::user_role, 'root_admin'::user_role])));

-- Create monitoring metrics table
CREATE TABLE public.system_monitoring_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  metric_name TEXT NOT NULL,
  metric_type TEXT NOT NULL,
  current_value NUMERIC NOT NULL,
  unit TEXT,
  status TEXT NOT NULL DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical')),
  threshold_warning NUMERIC,
  threshold_critical NUMERIC,
  data_points JSONB DEFAULT '[]'::JSONB,
  last_updated TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  collection_interval_minutes INTEGER DEFAULT 60,
  is_active BOOLEAN DEFAULT true,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_monitoring_metrics ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company monitoring metrics" 
ON public.system_monitoring_metrics 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Admins can manage monitoring metrics" 
ON public.system_monitoring_metrics 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])));

-- Create system alerts table
CREATE TABLE public.system_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL DEFAULT 'info' CHECK (severity IN ('info', 'warning', 'error', 'critical')),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved')),
  source_metric_id UUID,
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  metadata JSONB DEFAULT '{}'::JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.system_alerts ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view company system alerts" 
ON public.system_alerts 
FOR SELECT 
USING ((company_id = get_user_company(auth.uid())) OR (get_user_role(auth.uid()) = 'root_admin'::user_role));

CREATE POLICY "Admins can manage system alerts" 
ON public.system_alerts 
FOR ALL 
USING ((company_id = get_user_company(auth.uid())) AND (get_user_role(auth.uid()) = ANY (ARRAY['admin'::user_role, 'root_admin'::user_role])));

-- Add indexes for performance
CREATE INDEX idx_security_incidents_company_id ON public.security_incidents(company_id);
CREATE INDEX idx_security_incidents_status ON public.security_incidents(status);
CREATE INDEX idx_security_incidents_severity ON public.security_incidents(severity);
CREATE INDEX idx_system_monitoring_metrics_company_id ON public.system_monitoring_metrics(company_id);
CREATE INDEX idx_system_monitoring_metrics_metric_type ON public.system_monitoring_metrics(metric_type);
CREATE INDEX idx_system_alerts_company_id ON public.system_alerts(company_id);
CREATE INDEX idx_system_alerts_status ON public.system_alerts(status);

-- Add updated_at triggers
CREATE TRIGGER update_security_incidents_updated_at
  BEFORE UPDATE ON public.security_incidents
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_monitoring_metrics_updated_at
  BEFORE UPDATE ON public.system_monitoring_metrics
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_system_alerts_updated_at
  BEFORE UPDATE ON public.system_alerts
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();