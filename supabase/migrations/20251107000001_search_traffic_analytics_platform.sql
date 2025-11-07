-- Search Traffic Analytics Platform - Unified Analytics Integration
-- Adds comprehensive OAuth and data tables for GA4, Bing, Yandex, and unified analytics
-- Version: 1.0.0
-- Date: 2025-11-07

-- =====================================================
-- Analytics Platform Connections Table
-- Central registry for all connected analytics platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS public.analytics_platform_connections (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Platform Info
  platform_name TEXT NOT NULL, -- 'google_analytics', 'google_search_console', 'bing_webmaster', 'yandex_webmaster'
  platform_display_name TEXT NOT NULL,

  -- Connection Status
  is_connected BOOLEAN DEFAULT false,
  is_active BOOLEAN DEFAULT true,
  connection_status TEXT DEFAULT 'disconnected', -- 'disconnected', 'connecting', 'connected', 'error', 'expired'

  -- OAuth Details
  oauth_provider TEXT,
  access_token_encrypted TEXT, -- Encrypted token
  refresh_token_encrypted TEXT, -- Encrypted token
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE,
  scope TEXT,

  -- Account/Property Info
  account_id TEXT,
  account_name TEXT,
  property_id TEXT,
  property_name TEXT,
  property_url TEXT,

  -- Sync Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_hours INTEGER DEFAULT 24,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,
  last_sync_status TEXT, -- 'success', 'partial', 'failed'
  last_sync_error TEXT,

  -- Data Retention
  data_retention_days INTEGER DEFAULT 90,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(company_id, platform_name, property_id)
);

-- =====================================================
-- Google Analytics 4 Properties
-- =====================================================
CREATE TABLE IF NOT EXISTS public.ga4_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.analytics_platform_connections(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Property Details
  property_id TEXT NOT NULL,
  property_name TEXT NOT NULL,
  parent_account_id TEXT,
  parent_account_name TEXT,
  website_url TEXT,
  industry_category TEXT,
  time_zone TEXT,
  currency_code TEXT DEFAULT 'USD',

  -- Settings
  is_primary BOOLEAN DEFAULT false,
  data_stream_ids TEXT[],

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, property_id)
);

-- =====================================================
-- Bing Webmaster Properties
-- =====================================================
CREATE TABLE IF NOT EXISTS public.bing_webmaster_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.analytics_platform_connections(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Site Details
  site_url TEXT NOT NULL,
  is_verified BOOLEAN DEFAULT false,
  verification_method TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,

  -- Crawl Settings
  crawl_rate TEXT,
  last_crawl_date TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, site_url)
);

-- =====================================================
-- Yandex Webmaster Properties
-- =====================================================
CREATE TABLE IF NOT EXISTS public.yandex_webmaster_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  connection_id UUID REFERENCES public.analytics_platform_connections(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Host Details
  host_id TEXT NOT NULL,
  host_url TEXT NOT NULL,
  host_display_name TEXT,

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_type TEXT,
  verification_state TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,

  -- Indexing
  indexed_pages_count INTEGER DEFAULT 0,
  last_index_date TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, host_id)
);

-- =====================================================
-- Unified Traffic Metrics (Daily Aggregation)
-- Combines data from all platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS public.unified_traffic_metrics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Date Range
  date DATE NOT NULL,
  date_range_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'

  -- Source Platform
  platform_name TEXT NOT NULL, -- 'google_analytics', 'google_search_console', 'bing', 'yandex', 'aggregated'
  property_id TEXT,

  -- Traffic Metrics
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INTEGER, -- seconds

  -- Search Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  average_position DECIMAL(5,2),

  -- Engagement Metrics
  engagement_rate DECIMAL(5,2),
  engaged_sessions INTEGER DEFAULT 0,
  events_count INTEGER DEFAULT 0,

  -- Conversion Metrics
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  goal_completions INTEGER DEFAULT 0,

  -- Traffic Sources Breakdown
  organic_traffic INTEGER DEFAULT 0,
  direct_traffic INTEGER DEFAULT 0,
  referral_traffic INTEGER DEFAULT 0,
  social_traffic INTEGER DEFAULT 0,
  paid_traffic INTEGER DEFAULT 0,
  email_traffic INTEGER DEFAULT 0,

  -- Device Breakdown
  desktop_sessions INTEGER DEFAULT 0,
  mobile_sessions INTEGER DEFAULT 0,
  tablet_sessions INTEGER DEFAULT 0,

  -- Geographic Data (Top Location)
  top_country TEXT,
  top_city TEXT,

  -- Metadata
  raw_data JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, platform_name, property_id, date)
);

-- =====================================================
-- Unified Keyword Performance
-- Aggregates keyword data from all search platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS public.unified_keyword_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Keyword Details
  keyword TEXT NOT NULL,
  search_intent TEXT, -- 'informational', 'navigational', 'transactional', 'commercial'

  -- Date
  date DATE NOT NULL,

  -- Platform Source
  platform_name TEXT NOT NULL, -- 'google', 'bing', 'yandex'

  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  position DECIMAL(5,2),

  -- Landing Pages
  top_landing_page TEXT,
  landing_pages JSONB DEFAULT '[]',

  -- Device & Location
  device_type TEXT, -- 'desktop', 'mobile', 'tablet'
  country TEXT,

  -- Trends
  position_change DECIMAL(5,2),
  impressions_change INTEGER,
  clicks_change INTEGER,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, keyword, date, platform_name, device_type)
);

-- =====================================================
-- Page Performance Analytics
-- Unified page-level analytics from all platforms
-- =====================================================
CREATE TABLE IF NOT EXISTS public.unified_page_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Page Details
  page_url TEXT NOT NULL,
  page_title TEXT,
  page_type TEXT, -- 'homepage', 'landing', 'blog', 'product', 'category'

  -- Date
  date DATE NOT NULL,

  -- Platform Source
  platform_name TEXT NOT NULL,

  -- Analytics Metrics (from GA4)
  sessions INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  unique_pageviews INTEGER DEFAULT 0,
  avg_time_on_page INTEGER, -- seconds
  bounce_rate DECIMAL(5,2),
  exit_rate DECIMAL(5,2),

  -- Search Metrics (from GSC/Bing/Yandex)
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  average_position DECIMAL(5,2),

  -- Top Keywords for this Page
  top_keywords JSONB DEFAULT '[]',
  keywords_count INTEGER DEFAULT 0,

  -- Engagement
  scroll_depth DECIMAL(5,2),
  engagement_rate DECIMAL(5,2),

  -- Conversions
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),

  -- Device Breakdown
  desktop_views INTEGER DEFAULT 0,
  mobile_views INTEGER DEFAULT 0,
  tablet_views INTEGER DEFAULT 0,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, page_url, date, platform_name)
);

-- =====================================================
-- SEO Insights & Recommendations
-- AI-powered insights and actionable recommendations
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Insight Details
  insight_type TEXT NOT NULL, -- 'opportunity', 'issue', 'trend', 'achievement'
  category TEXT NOT NULL, -- 'keywords', 'traffic', 'technical', 'content', 'competitors'
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Content
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  impact_estimate TEXT, -- 'low', 'medium', 'high'

  -- Data
  affected_urls TEXT[],
  affected_keywords TEXT[],
  metrics_data JSONB DEFAULT '{}',

  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  action_items JSONB DEFAULT '[]',

  -- Status
  status TEXT DEFAULT 'active', -- 'active', 'acknowledged', 'in_progress', 'resolved', 'dismissed'
  priority INTEGER DEFAULT 50, -- 0-100

  -- Timeline
  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  resolved_at TIMESTAMP WITH TIME ZONE,

  -- User Actions
  acknowledged_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Traffic Source Attribution
-- Detailed source/medium/campaign tracking
-- =====================================================
CREATE TABLE IF NOT EXISTS public.traffic_source_attribution (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Date
  date DATE NOT NULL,

  -- Source Details
  source TEXT NOT NULL, -- 'google', 'bing', 'facebook', 'linkedin', etc.
  medium TEXT NOT NULL, -- 'organic', 'cpc', 'referral', 'social', 'email', 'direct'
  campaign TEXT,

  -- UTM Parameters
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_term TEXT,
  utm_content TEXT,

  -- Metrics
  sessions INTEGER DEFAULT 0,
  users INTEGER DEFAULT 0,
  new_users INTEGER DEFAULT 0,
  pageviews INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_session_duration INTEGER,

  -- Conversions
  conversions INTEGER DEFAULT 0,
  conversion_rate DECIMAL(5,2),
  conversion_value DECIMAL(10,2),

  -- ROI Tracking
  cost DECIMAL(10,2),
  revenue DECIMAL(10,2),
  roas DECIMAL(10,2), -- Return on Ad Spend

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(company_id, date, source, medium, campaign)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_analytics_platform_connections_company_id
  ON public.analytics_platform_connections(company_id);
CREATE INDEX IF NOT EXISTS idx_analytics_platform_connections_platform
  ON public.analytics_platform_connections(platform_name);
CREATE INDEX IF NOT EXISTS idx_ga4_properties_company_id
  ON public.ga4_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_bing_properties_company_id
  ON public.bing_webmaster_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_yandex_properties_company_id
  ON public.yandex_webmaster_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_unified_traffic_metrics_company_date
  ON public.unified_traffic_metrics(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_traffic_metrics_platform
  ON public.unified_traffic_metrics(platform_name, date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_keyword_performance_company_date
  ON public.unified_keyword_performance(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_keyword_performance_keyword
  ON public.unified_keyword_performance(keyword, date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_page_performance_company_date
  ON public.unified_page_performance(company_id, date DESC);
CREATE INDEX IF NOT EXISTS idx_unified_page_performance_url
  ON public.unified_page_performance(page_url, date DESC);
CREATE INDEX IF NOT EXISTS idx_seo_insights_company_id
  ON public.seo_insights(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_insights_status
  ON public.seo_insights(status, severity);
CREATE INDEX IF NOT EXISTS idx_traffic_source_attribution_company_date
  ON public.traffic_source_attribution(company_id, date DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

ALTER TABLE public.analytics_platform_connections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ga4_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bing_webmaster_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yandex_webmaster_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_traffic_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.unified_page_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_insights ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.traffic_source_attribution ENABLE ROW LEVEL SECURITY;

-- Root Admin Policies
CREATE POLICY "Root admins can manage analytics connections"
ON public.analytics_platform_connections FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view GA4 properties"
ON public.ga4_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view Bing properties"
ON public.bing_webmaster_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view Yandex properties"
ON public.yandex_webmaster_properties FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view unified traffic metrics"
ON public.unified_traffic_metrics FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view unified keyword performance"
ON public.unified_keyword_performance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view unified page performance"
ON public.unified_page_performance FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage SEO insights"
ON public.seo_insights FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view traffic source attribution"
ON public.traffic_source_attribution FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

-- =====================================================
-- Triggers
-- =====================================================

CREATE TRIGGER update_analytics_platform_connections_updated_at
BEFORE UPDATE ON public.analytics_platform_connections
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ga4_properties_updated_at
BEFORE UPDATE ON public.ga4_properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_bing_properties_updated_at
BEFORE UPDATE ON public.bing_webmaster_properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_yandex_properties_updated_at
BEFORE UPDATE ON public.yandex_webmaster_properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_insights_updated_at
BEFORE UPDATE ON public.seo_insights
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to update next sync time
CREATE OR REPLACE FUNCTION update_analytics_next_sync_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_synced_at IS NOT NULL AND NEW.sync_frequency_hours IS NOT NULL THEN
    NEW.next_sync_at = NEW.last_synced_at + (NEW.sync_frequency_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_analytics_next_sync_trigger
BEFORE INSERT OR UPDATE ON public.analytics_platform_connections
FOR EACH ROW
EXECUTE FUNCTION update_analytics_next_sync_time();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- Aggregated daily traffic across all platforms
CREATE OR REPLACE VIEW daily_traffic_overview AS
SELECT
  company_id,
  date,
  SUM(sessions) as total_sessions,
  SUM(users) as total_users,
  SUM(pageviews) as total_pageviews,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(average_position) as avg_position,
  SUM(conversions) as total_conversions
FROM public.unified_traffic_metrics
WHERE platform_name != 'aggregated'
GROUP BY company_id, date;

-- Top performing keywords across all platforms
CREATE OR REPLACE VIEW top_keywords_performance AS
SELECT
  company_id,
  keyword,
  platform_name,
  SUM(impressions) as total_impressions,
  SUM(clicks) as total_clicks,
  AVG(ctr) as avg_ctr,
  AVG(position) as avg_position
FROM public.unified_keyword_performance
WHERE date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY company_id, keyword, platform_name
ORDER BY total_clicks DESC, total_impressions DESC;

-- Active SEO insights summary
CREATE OR REPLACE VIEW active_seo_insights_summary AS
SELECT
  company_id,
  insight_type,
  category,
  severity,
  COUNT(*) as insight_count,
  AVG(priority) as avg_priority
FROM public.seo_insights
WHERE status IN ('active', 'in_progress')
GROUP BY company_id, insight_type, category, severity;

-- =====================================================
-- Comments
-- =====================================================

COMMENT ON TABLE public.analytics_platform_connections IS 'Central registry for all connected analytics and webmaster platforms';
COMMENT ON TABLE public.ga4_properties IS 'Google Analytics 4 properties';
COMMENT ON TABLE public.bing_webmaster_properties IS 'Bing Webmaster Tools properties';
COMMENT ON TABLE public.yandex_webmaster_properties IS 'Yandex Webmaster properties';
COMMENT ON TABLE public.unified_traffic_metrics IS 'Unified daily traffic metrics from all platforms';
COMMENT ON TABLE public.unified_keyword_performance IS 'Unified keyword performance across all search engines';
COMMENT ON TABLE public.unified_page_performance IS 'Unified page-level analytics from all platforms';
COMMENT ON TABLE public.seo_insights IS 'AI-powered SEO insights and recommendations';
COMMENT ON TABLE public.traffic_source_attribution IS 'Detailed traffic source and attribution tracking';
