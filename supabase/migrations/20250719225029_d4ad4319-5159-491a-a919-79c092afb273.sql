-- Step 5: Security Monitoring & Alerting for SOC Compliance

-- Create security monitoring rules table
CREATE TABLE IF NOT EXISTS public.security_monitoring_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  rule_name TEXT NOT NULL,
  rule_type TEXT NOT NULL CHECK (rule_type IN ('failed_login', 'privilege_escalation', 'data_access', 'system_change', 'network_anomaly', 'custom')),
  description TEXT,
  is_active BOOLEAN DEFAULT true,
  severity TEXT NOT NULL DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  conditions JSONB NOT NULL DEFAULT '{}',
  threshold_value INTEGER,
  threshold_period_minutes INTEGER DEFAULT 60,
  alert_method TEXT[] DEFAULT ARRAY['email'],
  recipients TEXT[],
  auto_respond BOOLEAN DEFAULT false,
  response_actions JSONB DEFAULT '[]',
  created_by UUID,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security alerts table
CREATE TABLE IF NOT EXISTS public.security_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  rule_id UUID,
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'investigating', 'resolved', 'false_positive')),
  triggered_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID,
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID,
  resolution_notes TEXT,
  affected_resources JSONB DEFAULT '[]',
  event_data JSONB DEFAULT '{}',
  impact_assessment TEXT,
  remediation_steps TEXT[],
  false_positive_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create security metrics table
CREATE TABLE IF NOT EXISTS public.security_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  metric_type TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_value NUMERIC NOT NULL,
  metric_unit TEXT,
  measurement_period TEXT NOT NULL DEFAULT 'daily',
  measured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create alert notifications table
CREATE TABLE IF NOT EXISTS public.alert_notifications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  alert_id UUID NOT NULL,
  notification_method TEXT NOT NULL,
  recipient TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'failed', 'delivered')),
  sent_at TIMESTAMP WITH TIME ZONE,
  delivery_confirmed_at TIMESTAMP WITH TIME ZONE,
  failure_reason TEXT,
  retry_count INTEGER DEFAULT 0,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.security_monitoring_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.security_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.alert_notifications ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Admins can manage security monitoring rules"
ON public.security_monitoring_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Security staff can view monitoring rules"
ON public.security_monitoring_rules
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin', 'safety_officer')
  )
);

CREATE POLICY "Admins can manage security alerts"
ON public.security_alerts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "Security staff can view security alerts"
ON public.security_alerts
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin', 'safety_officer')
  )
);

CREATE POLICY "Security staff can update alert status"
ON public.security_alerts
FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin', 'safety_officer')
  )
);

CREATE POLICY "System can create security alerts"
ON public.security_alerts
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view security metrics"
ON public.security_metrics
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "System can create security metrics"
ON public.security_metrics
FOR INSERT
WITH CHECK (true);

CREATE POLICY "Admins can view alert notifications"
ON public.alert_notifications
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.security_alerts sa
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE sa.id = alert_notifications.alert_id
      AND p.role IN ('admin', 'root_admin')
  )
);

CREATE POLICY "System can manage alert notifications"
ON public.alert_notifications
FOR ALL
WITH CHECK (true);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_security_monitoring_rules_company_id ON public.security_monitoring_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_security_monitoring_rules_active ON public.security_monitoring_rules(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_security_alerts_company_id ON public.security_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_security_alerts_status ON public.security_alerts(status);
CREATE INDEX IF NOT EXISTS idx_security_alerts_severity ON public.security_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_security_alerts_triggered_at ON public.security_alerts(triggered_at);
CREATE INDEX IF NOT EXISTS idx_security_metrics_company_id ON public.security_metrics(company_id);
CREATE INDEX IF NOT EXISTS idx_security_metrics_type ON public.security_metrics(metric_type, measured_at);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_alert_id ON public.alert_notifications(alert_id);
CREATE INDEX IF NOT EXISTS idx_alert_notifications_status ON public.alert_notifications(status);

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_security_monitoring_rules_updated_at
BEFORE UPDATE ON public.security_monitoring_rules
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_security_alerts_updated_at
BEFORE UPDATE ON public.security_alerts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create function to trigger security alerts
CREATE OR REPLACE FUNCTION public.trigger_security_alert(
  p_company_id UUID,
  p_alert_type TEXT,
  p_severity TEXT,
  p_title TEXT,
  p_description TEXT DEFAULT NULL,
  p_event_data JSONB DEFAULT '{}',
  p_affected_resources JSONB DEFAULT '[]'
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;

-- Create function to calculate security metrics
CREATE OR REPLACE FUNCTION public.calculate_security_metrics(p_company_id UUID)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
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
$$;