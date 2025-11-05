-- SEO Management System - Automated Monitoring
-- Adds notification preferences, alert rules, alerts, and monitoring schedules
-- Version: 1.0.0
-- Date: 2025-11-05

-- =====================================================
-- SEO Notification Preferences Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_notification_preferences (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Email Notifications
  enable_email BOOLEAN DEFAULT true,
  email_recipients TEXT[] DEFAULT '{}',
  email_frequency TEXT DEFAULT 'immediate', -- 'immediate', 'hourly', 'daily', 'weekly'

  -- Slack Notifications
  enable_slack BOOLEAN DEFAULT false,
  slack_webhook_url TEXT,
  slack_channel TEXT,

  -- SMS Notifications
  enable_sms BOOLEAN DEFAULT false,
  sms_recipients TEXT[] DEFAULT '{}',

  -- Notification Types
  notify_rank_changes BOOLEAN DEFAULT true,
  notify_traffic_drops BOOLEAN DEFAULT true,
  notify_broken_links BOOLEAN DEFAULT true,
  notify_core_web_vitals BOOLEAN DEFAULT true,
  notify_new_backlinks BOOLEAN DEFAULT false,
  notify_audit_completion BOOLEAN DEFAULT true,
  notify_crawl_errors BOOLEAN DEFAULT true,

  -- Thresholds
  rank_change_threshold INTEGER DEFAULT 3, -- Notify if rank changes by this much
  traffic_drop_threshold INTEGER DEFAULT 20, -- Notify if traffic drops by this percentage

  -- Quiet Hours
  enable_quiet_hours BOOLEAN DEFAULT false,
  quiet_hours_start TIME DEFAULT '22:00:00',
  quiet_hours_end TIME DEFAULT '08:00:00',
  quiet_hours_timezone TEXT DEFAULT 'America/New_York',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id)
);

-- =====================================================
-- SEO Alert Rules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_alert_rules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Rule Details
  rule_name TEXT NOT NULL,
  rule_description TEXT,
  rule_type TEXT NOT NULL, -- 'keyword_position', 'traffic_drop', 'broken_links', 'core_web_vitals', 'backlinks', 'uptime'

  -- Conditions
  metric TEXT NOT NULL, -- 'position', 'clicks', 'impressions', 'page_load_time', 'lcp', 'fid', 'cls'
  operator TEXT NOT NULL, -- 'greater_than', 'less_than', 'equals', 'changes_by', 'drops_by'
  threshold_value DECIMAL(10,2) NOT NULL,
  comparison_period TEXT DEFAULT 'previous_day', -- 'previous_day', 'previous_week', 'previous_month'

  -- Targeting
  target_keywords TEXT[] DEFAULT '{}',
  target_urls TEXT[] DEFAULT '{}',

  -- Alert Settings
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'
  is_active BOOLEAN DEFAULT true,
  trigger_frequency TEXT DEFAULT 'once', -- 'once', 'always', 'daily', 'hourly'

  -- Actions
  auto_create_ticket BOOLEAN DEFAULT false,
  auto_notify_team BOOLEAN DEFAULT true,
  run_auto_fix BOOLEAN DEFAULT false,

  -- Metadata
  times_triggered INTEGER DEFAULT 0,
  last_triggered_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Alerts Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_alerts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  alert_rule_id UUID REFERENCES public.seo_alert_rules(id) ON DELETE SET NULL,

  -- Alert Details
  alert_type TEXT NOT NULL,
  severity TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,

  -- Affected Items
  affected_url TEXT,
  affected_keyword TEXT,
  affected_metric TEXT,

  -- Values
  current_value DECIMAL(10,2),
  previous_value DECIMAL(10,2),
  change_value DECIMAL(10,2),
  change_percentage DECIMAL(5,2),

  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'resolved', 'dismissed'
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_at TIMESTAMP WITH TIME ZONE,
  resolved_by UUID REFERENCES auth.users(id),
  resolution_notes TEXT,

  -- Notifications
  notification_sent BOOLEAN DEFAULT false,
  notification_sent_at TIMESTAMP WITH TIME ZONE,
  notification_methods TEXT[] DEFAULT '{}', -- 'email', 'slack', 'sms'

  -- Related Data
  related_audit_id UUID REFERENCES public.seo_audit_history(id),
  additional_data JSONB DEFAULT '{}',

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Monitoring Schedules Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_monitoring_schedules (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Schedule Details
  schedule_name TEXT NOT NULL,
  schedule_type TEXT NOT NULL, -- 'audit', 'crawl', 'keyword_check', 'backlink_check', 'vitals_check'

  -- Frequency
  is_enabled BOOLEAN DEFAULT true,
  frequency TEXT NOT NULL, -- 'hourly', 'daily', 'weekly', 'monthly', 'custom'
  cron_expression TEXT, -- For custom schedules

  -- Timing
  run_time TIME DEFAULT '02:00:00',
  run_timezone TEXT DEFAULT 'America/New_York',
  last_run_at TIMESTAMP WITH TIME ZONE,
  next_run_at TIMESTAMP WITH TIME ZONE,

  -- Target Configuration
  target_urls TEXT[] DEFAULT '{}',
  target_keywords TEXT[] DEFAULT '{}',
  check_depth INTEGER DEFAULT 1, -- For crawling depth
  max_pages INTEGER DEFAULT 100, -- Max pages to check

  -- Options
  send_notification_on_completion BOOLEAN DEFAULT true,
  send_notification_on_error BOOLEAN DEFAULT true,
  auto_apply_fixes BOOLEAN DEFAULT false,

  -- Status
  status TEXT DEFAULT 'scheduled', -- 'scheduled', 'running', 'completed', 'failed', 'paused'
  run_count INTEGER DEFAULT 0,
  error_count INTEGER DEFAULT 0,
  last_error_message TEXT,

  -- Performance
  average_duration_seconds INTEGER,
  last_duration_seconds INTEGER,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Core Web Vitals Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_core_web_vitals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Page Details
  url TEXT NOT NULL,
  device_type TEXT DEFAULT 'mobile', -- 'mobile', 'desktop'

  -- Core Web Vitals Metrics
  lcp DECIMAL(10,2), -- Largest Contentful Paint (seconds)
  fid DECIMAL(10,2), -- First Input Delay (milliseconds)
  cls DECIMAL(5,3), -- Cumulative Layout Shift

  -- Additional Performance Metrics
  fcp DECIMAL(10,2), -- First Contentful Paint
  ttfb DECIMAL(10,2), -- Time to First Byte
  tti DECIMAL(10,2), -- Time to Interactive
  tbt DECIMAL(10,2), -- Total Blocking Time
  si DECIMAL(10,2), -- Speed Index

  -- Scores (0-100)
  performance_score INTEGER,
  lcp_score INTEGER,
  fid_score INTEGER,
  cls_score INTEGER,

  -- Status Assessment
  lcp_status TEXT, -- 'good', 'needs_improvement', 'poor'
  fid_status TEXT,
  cls_status TEXT,
  overall_status TEXT,

  -- Lab vs Field Data
  data_source TEXT DEFAULT 'lab', -- 'lab', 'field', 'both'
  field_data JSONB,
  lab_data JSONB,

  -- Origin Summary
  origin_summary JSONB,

  -- Opportunities and Diagnostics
  opportunities JSONB DEFAULT '[]',
  diagnostics JSONB DEFAULT '[]',

  -- Metadata
  lighthouse_version TEXT,
  user_agent TEXT,

  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_seo_notification_preferences_company_id ON public.seo_notification_preferences(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_alert_rules_company_id ON public.seo_alert_rules(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_alert_rules_is_active ON public.seo_alert_rules(is_active);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_company_id ON public.seo_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_status ON public.seo_alerts(status);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_severity ON public.seo_alerts(severity);
CREATE INDEX IF NOT EXISTS idx_seo_alerts_created_at ON public.seo_alerts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_schedules_company_id ON public.seo_monitoring_schedules(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_schedules_next_run_at ON public.seo_monitoring_schedules(next_run_at);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_schedules_is_enabled ON public.seo_monitoring_schedules(is_enabled);
CREATE INDEX IF NOT EXISTS idx_seo_core_web_vitals_company_id ON public.seo_core_web_vitals(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_core_web_vitals_url ON public.seo_core_web_vitals(url);
CREATE INDEX IF NOT EXISTS idx_seo_core_web_vitals_checked_at ON public.seo_core_web_vitals(checked_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.seo_notification_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_alert_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_monitoring_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_core_web_vitals ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can manage notification preferences"
ON public.seo_notification_preferences
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage alert rules"
ON public.seo_alert_rules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage alerts"
ON public.seo_alerts
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage monitoring schedules"
ON public.seo_monitoring_schedules
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view core web vitals"
ON public.seo_core_web_vitals
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

-- =====================================================
-- Triggers for updated_at columns
-- =====================================================

CREATE TRIGGER update_seo_notification_preferences_updated_at
BEFORE UPDATE ON public.seo_notification_preferences
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_alert_rules_updated_at
BEFORE UPDATE ON public.seo_alert_rules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_alerts_updated_at
BEFORE UPDATE ON public.seo_alerts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_monitoring_schedules_updated_at
BEFORE UPDATE ON public.seo_monitoring_schedules
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to calculate next run time for monitoring schedules
CREATE OR REPLACE FUNCTION calculate_next_run_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.frequency = 'hourly' THEN
    NEW.next_run_at = CURRENT_TIMESTAMP + INTERVAL '1 hour';
  ELSIF NEW.frequency = 'daily' THEN
    NEW.next_run_at = (CURRENT_DATE + INTERVAL '1 day' + NEW.run_time::TIME)::TIMESTAMP WITH TIME ZONE;
  ELSIF NEW.frequency = 'weekly' THEN
    NEW.next_run_at = (CURRENT_DATE + INTERVAL '7 days' + NEW.run_time::TIME)::TIMESTAMP WITH TIME ZONE;
  ELSIF NEW.frequency = 'monthly' THEN
    NEW.next_run_at = (CURRENT_DATE + INTERVAL '1 month' + NEW.run_time::TIME)::TIMESTAMP WITH TIME ZONE;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_next_run_time_trigger
BEFORE INSERT OR UPDATE ON public.seo_monitoring_schedules
FOR EACH ROW
EXECUTE FUNCTION calculate_next_run_time();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View for open alerts dashboard
CREATE OR REPLACE VIEW seo_alerts_dashboard AS
SELECT
  a.id,
  a.company_id,
  a.alert_type,
  a.severity,
  a.title,
  a.message,
  a.affected_url,
  a.affected_keyword,
  a.status,
  a.created_at,
  EXTRACT(EPOCH FROM (NOW() - a.created_at))/3600 as hours_open,
  ar.rule_name
FROM public.seo_alerts a
LEFT JOIN public.seo_alert_rules ar ON a.alert_rule_id = ar.id
WHERE a.status IN ('open', 'acknowledged')
ORDER BY
  CASE a.severity
    WHEN 'critical' THEN 1
    WHEN 'high' THEN 2
    WHEN 'medium' THEN 3
    WHEN 'low' THEN 4
  END,
  a.created_at DESC;

-- View for Core Web Vitals trends
CREATE OR REPLACE VIEW cwv_trends AS
SELECT
  url,
  device_type,
  DATE_TRUNC('day', checked_at) as check_date,
  AVG(lcp) as avg_lcp,
  AVG(fid) as avg_fid,
  AVG(cls) as avg_cls,
  AVG(performance_score) as avg_performance_score
FROM public.seo_core_web_vitals
WHERE checked_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY url, device_type, DATE_TRUNC('day', checked_at)
ORDER BY check_date DESC;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.seo_notification_preferences IS 'User preferences for SEO monitoring notifications';
COMMENT ON TABLE public.seo_alert_rules IS 'Configurable rules for triggering SEO alerts';
COMMENT ON TABLE public.seo_alerts IS 'Active and historical SEO alerts';
COMMENT ON TABLE public.seo_monitoring_schedules IS 'Automated SEO monitoring schedules';
COMMENT ON TABLE public.seo_core_web_vitals IS 'Core Web Vitals performance metrics from Google';
COMMENT ON VIEW seo_alerts_dashboard IS 'Dashboard view of open SEO alerts';
COMMENT ON VIEW cwv_trends IS 'Core Web Vitals performance trends';
