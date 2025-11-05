-- SEO Management System - Google Search Console Integration
-- Adds tables for GSC OAuth, properties, and performance tracking
-- Version: 1.0.0
-- Date: 2025-11-04

-- =====================================================
-- GSC OAuth Credentials Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gsc_oauth_credentials (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- OAuth Details
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  token_type TEXT DEFAULT 'Bearer',
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,

  -- Scope and Permissions
  scope TEXT,
  granted_scopes TEXT[],

  -- User Info
  email TEXT,
  user_id TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  last_refreshed_at TIMESTAMP WITH TIME ZONE,
  refresh_count INTEGER DEFAULT 0,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),

  UNIQUE(company_id)
);

-- =====================================================
-- GSC Properties Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gsc_properties (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  credentials_id UUID REFERENCES public.gsc_oauth_credentials(id) ON DELETE CASCADE,

  -- Property Details
  property_url TEXT NOT NULL,
  property_type TEXT, -- 'URL_PREFIX', 'DOMAIN'
  permission_level TEXT, -- 'OWNER', 'FULL_USER', 'RESTRICTED_USER'

  -- Verification
  is_verified BOOLEAN DEFAULT false,
  verification_method TEXT,

  -- Status
  is_active BOOLEAN DEFAULT true,
  is_primary BOOLEAN DEFAULT false,

  -- Sync Settings
  auto_sync_enabled BOOLEAN DEFAULT true,
  sync_frequency_hours INTEGER DEFAULT 24,
  last_synced_at TIMESTAMP WITH TIME ZONE,
  next_sync_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- GSC Keyword Performance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gsc_keyword_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.gsc_properties(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Query Details
  query TEXT NOT NULL,
  page_url TEXT,

  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  position DECIMAL(5,2),

  -- Device and Location
  device_type TEXT, -- 'DESKTOP', 'MOBILE', 'TABLET'
  country TEXT,
  search_appearance TEXT, -- 'NORMAL', 'VIDEO', 'IMAGE'

  -- Date Range
  date DATE NOT NULL,
  date_range_type TEXT DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'

  -- Comparison Data
  impressions_previous INTEGER,
  clicks_previous INTEGER,
  ctr_previous DECIMAL(5,2),
  position_previous DECIMAL(5,2),

  -- Change Metrics
  impressions_change INTEGER,
  clicks_change INTEGER,
  ctr_change DECIMAL(5,2),
  position_change DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(property_id, query, date, device_type)
);

-- =====================================================
-- GSC Page Performance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.gsc_page_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  property_id UUID NOT NULL REFERENCES public.gsc_properties(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Page Details
  page_url TEXT NOT NULL,
  page_type TEXT, -- 'homepage', 'blog', 'product', 'landing', 'other'

  -- Performance Metrics
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),
  average_position DECIMAL(5,2),

  -- Top Queries for this Page
  top_queries JSONB DEFAULT '[]',
  keywords_count INTEGER DEFAULT 0,

  -- Device Breakdown
  desktop_impressions INTEGER DEFAULT 0,
  mobile_impressions INTEGER DEFAULT 0,
  tablet_impressions INTEGER DEFAULT 0,

  -- Date Range
  date DATE NOT NULL,
  date_range_type TEXT DEFAULT 'daily',

  -- Comparison Data
  impressions_previous INTEGER,
  clicks_previous INTEGER,
  ctr_previous DECIMAL(5,2),
  position_previous DECIMAL(5,2),

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),

  UNIQUE(property_id, page_url, date)
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_gsc_oauth_credentials_company_id ON public.gsc_oauth_credentials(company_id);
CREATE INDEX IF NOT EXISTS idx_gsc_properties_company_id ON public.gsc_properties(company_id);
CREATE INDEX IF NOT EXISTS idx_gsc_properties_credentials_id ON public.gsc_properties(credentials_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword_performance_property_id ON public.gsc_keyword_performance(property_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword_performance_company_id ON public.gsc_keyword_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword_performance_query ON public.gsc_keyword_performance(query);
CREATE INDEX IF NOT EXISTS idx_gsc_keyword_performance_date ON public.gsc_keyword_performance(date DESC);
CREATE INDEX IF NOT EXISTS idx_gsc_page_performance_property_id ON public.gsc_page_performance(property_id);
CREATE INDEX IF NOT EXISTS idx_gsc_page_performance_company_id ON public.gsc_page_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_gsc_page_performance_page_url ON public.gsc_page_performance(page_url);
CREATE INDEX IF NOT EXISTS idx_gsc_page_performance_date ON public.gsc_page_performance(date DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.gsc_oauth_credentials ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_properties ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_keyword_performance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gsc_page_performance ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can manage GSC OAuth credentials"
ON public.gsc_oauth_credentials
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage GSC properties"
ON public.gsc_properties
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view GSC keyword performance"
ON public.gsc_keyword_performance
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view GSC page performance"
ON public.gsc_page_performance
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

CREATE TRIGGER update_gsc_oauth_credentials_updated_at
BEFORE UPDATE ON public.gsc_oauth_credentials
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_gsc_properties_updated_at
BEFORE UPDATE ON public.gsc_properties
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to check if GSC token needs refresh
CREATE OR REPLACE FUNCTION check_gsc_token_expiry()
RETURNS TRIGGER AS $$
BEGIN
  -- If token expires in less than 5 minutes, mark for refresh
  IF NEW.expires_at < (NOW() + INTERVAL '5 minutes') THEN
    NEW.is_active = false;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER check_gsc_token_expiry_trigger
BEFORE INSERT OR UPDATE ON public.gsc_oauth_credentials
FOR EACH ROW
EXECUTE FUNCTION check_gsc_token_expiry();

-- Function to calculate next sync time for properties
CREATE OR REPLACE FUNCTION update_gsc_next_sync_time()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.last_synced_at IS NOT NULL AND NEW.sync_frequency_hours IS NOT NULL THEN
    NEW.next_sync_at = NEW.last_synced_at + (NEW.sync_frequency_hours || ' hours')::INTERVAL;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_gsc_next_sync_time_trigger
BEFORE INSERT OR UPDATE ON public.gsc_properties
FOR EACH ROW
EXECUTE FUNCTION update_gsc_next_sync_time();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View for keyword performance trends
CREATE OR REPLACE VIEW gsc_keyword_trends AS
SELECT
  kp.company_id,
  kp.query,
  kp.date,
  kp.impressions,
  kp.clicks,
  kp.ctr,
  kp.position,
  kp.device_type,
  LAG(kp.position) OVER (PARTITION BY kp.property_id, kp.query ORDER BY kp.date) as previous_position,
  kp.position - LAG(kp.position) OVER (PARTITION BY kp.property_id, kp.query ORDER BY kp.date) as position_change
FROM public.gsc_keyword_performance kp
WHERE kp.date >= CURRENT_DATE - INTERVAL '90 days';

-- View for page performance summary
CREATE OR REPLACE VIEW gsc_page_summary AS
SELECT
  pp.company_id,
  pp.page_url,
  pp.page_type,
  SUM(pp.impressions) as total_impressions,
  SUM(pp.clicks) as total_clicks,
  AVG(pp.ctr) as avg_ctr,
  AVG(pp.average_position) as avg_position,
  COUNT(DISTINCT pp.date) as days_tracked
FROM public.gsc_page_performance pp
WHERE pp.date >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY pp.company_id, pp.page_url, pp.page_type;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.gsc_oauth_credentials IS 'OAuth credentials for Google Search Console API access';
COMMENT ON TABLE public.gsc_properties IS 'GSC properties (websites) being tracked';
COMMENT ON TABLE public.gsc_keyword_performance IS 'Keyword performance data from Google Search Console';
COMMENT ON TABLE public.gsc_page_performance IS 'Page performance data from Google Search Console';
COMMENT ON VIEW gsc_keyword_trends IS 'Keyword ranking trends over time';
COMMENT ON VIEW gsc_page_summary IS 'Summary of page performance metrics';
