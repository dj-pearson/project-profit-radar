-- SEO Management System - Core Tables Migration
-- Creates foundational tables for enterprise SEO management
-- Version: 1.0.0
-- Date: 2025-11-03

-- =====================================================
-- SEO Settings Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Basic SEO Configuration
  site_url TEXT NOT NULL,
  site_name TEXT,
  default_title TEXT,
  default_description TEXT,
  default_keywords TEXT[],
  default_og_image TEXT,

  -- Meta Configuration
  robots_txt TEXT,
  sitemap_url TEXT,
  canonical_domain TEXT,

  -- Analytics IDs
  google_analytics_id TEXT,
  google_search_console_id TEXT,
  bing_webmaster_id TEXT,

  -- Social Media
  twitter_handle TEXT,
  facebook_page_id TEXT,
  linkedin_company_id TEXT,

  -- Technical Settings
  enable_schema_markup BOOLEAN DEFAULT true,
  enable_open_graph BOOLEAN DEFAULT true,
  enable_twitter_cards BOOLEAN DEFAULT true,
  enable_amp BOOLEAN DEFAULT false,

  -- Monitoring Settings
  monitor_core_web_vitals BOOLEAN DEFAULT true,
  monitor_keywords BOOLEAN DEFAULT true,
  monitor_backlinks BOOLEAN DEFAULT false,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Audit History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_audit_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Audit Details
  url TEXT NOT NULL,
  audit_type TEXT DEFAULT 'full', -- 'full', 'quick', 'technical', 'content'
  status TEXT DEFAULT 'completed', -- 'pending', 'processing', 'completed', 'failed'

  -- Overall Scores (0-100)
  overall_score INTEGER,
  seo_score INTEGER,
  performance_score INTEGER,
  accessibility_score INTEGER,
  best_practices_score INTEGER,

  -- Issue Breakdown
  critical_issues INTEGER DEFAULT 0,
  warnings INTEGER DEFAULT 0,
  notices INTEGER DEFAULT 0,

  -- Detailed Results
  issues JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',
  metrics JSONB DEFAULT '{}',
  lighthouse_data JSONB,

  -- Metadata
  duration_seconds INTEGER,
  pages_crawled INTEGER,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Fixes Applied Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_fixes_applied (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  audit_id UUID REFERENCES public.seo_audit_history(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Fix Details
  issue_type TEXT NOT NULL,
  issue_severity TEXT, -- 'critical', 'warning', 'notice'
  fix_description TEXT NOT NULL,
  fix_type TEXT, -- 'manual', 'automated', 'suggested'

  -- Status
  status TEXT DEFAULT 'pending', -- 'pending', 'applied', 'verified', 'failed'
  applied_at TIMESTAMP WITH TIME ZONE,
  verified_at TIMESTAMP WITH TIME ZONE,

  -- Before/After
  before_value TEXT,
  after_value TEXT,
  impact_estimate TEXT,

  -- Metadata
  url TEXT,
  applied_by UUID REFERENCES auth.users(id),
  notes TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Keywords Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_keywords (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Keyword Details
  keyword TEXT NOT NULL,
  target_url TEXT,
  keyword_type TEXT DEFAULT 'primary', -- 'primary', 'secondary', 'long-tail', 'branded'

  -- Search Metrics
  search_volume INTEGER,
  competition_level TEXT, -- 'low', 'medium', 'high'
  cpc DECIMAL(10,2),
  difficulty_score INTEGER, -- 0-100

  -- Current Performance
  current_position INTEGER,
  best_position INTEGER,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),

  -- Targeting
  target_position INTEGER DEFAULT 1,
  priority TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Status
  is_tracking BOOLEAN DEFAULT true,
  is_ranking BOOLEAN DEFAULT false,
  last_checked_at TIMESTAMP WITH TIME ZONE,

  -- Metadata
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Keyword History Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_keyword_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID NOT NULL REFERENCES public.seo_keywords(id) ON DELETE CASCADE,

  -- Position Tracking
  position INTEGER,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2),

  -- Additional Metrics
  search_volume INTEGER,
  competition_level TEXT,
  visibility_score DECIMAL(5,2),

  -- Search Engine
  search_engine TEXT DEFAULT 'google', -- 'google', 'bing', 'duckduckgo'
  device_type TEXT DEFAULT 'desktop', -- 'desktop', 'mobile', 'tablet'
  location TEXT,

  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Competitor Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_competitor_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Competitor Details
  competitor_name TEXT NOT NULL,
  competitor_url TEXT NOT NULL,

  -- SEO Metrics
  domain_authority INTEGER,
  page_authority INTEGER,
  backlinks_count INTEGER,
  referring_domains INTEGER,
  organic_keywords INTEGER,
  organic_traffic_estimate INTEGER,

  -- Rankings
  keywords_in_top_3 INTEGER DEFAULT 0,
  keywords_in_top_10 INTEGER DEFAULT 0,
  keywords_in_top_50 INTEGER DEFAULT 0,

  -- Comparison Data
  keyword_overlap JSONB DEFAULT '[]',
  content_gaps JSONB DEFAULT '[]',
  backlink_opportunities JSONB DEFAULT '[]',

  -- Analysis Results
  strengths TEXT[],
  weaknesses TEXT[],
  opportunities TEXT[],
  threats TEXT[],

  -- Metadata
  last_analyzed_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Page Scores Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_page_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Page Details
  url TEXT NOT NULL,
  page_type TEXT, -- 'homepage', 'landing', 'blog', 'product', 'category'
  title TEXT,

  -- SEO Scores (0-100)
  overall_score INTEGER,
  content_score INTEGER,
  technical_score INTEGER,
  user_experience_score INTEGER,

  -- Content Analysis
  word_count INTEGER,
  keyword_density DECIMAL(5,2),
  readability_score DECIMAL(5,2),
  has_h1 BOOLEAN DEFAULT false,
  has_meta_description BOOLEAN DEFAULT false,
  has_alt_text BOOLEAN DEFAULT false,

  -- Technical Checks
  page_load_time INTEGER, -- milliseconds
  mobile_friendly BOOLEAN DEFAULT false,
  https_enabled BOOLEAN DEFAULT false,
  has_schema_markup BOOLEAN DEFAULT false,

  -- Link Analysis
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  broken_links_count INTEGER DEFAULT 0,

  -- Recommendations
  recommendations JSONB DEFAULT '[]',

  -- Metadata
  last_scanned_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Monitoring Log Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_monitoring_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Monitoring Details
  check_type TEXT NOT NULL, -- 'audit', 'keywords', 'backlinks', 'vitals', 'uptime'
  status TEXT DEFAULT 'success', -- 'success', 'warning', 'error', 'failed'

  -- Results
  result_summary TEXT,
  result_data JSONB DEFAULT '{}',

  -- Changes Detected
  changes_detected BOOLEAN DEFAULT false,
  change_details JSONB DEFAULT '[]',

  -- Alerting
  alert_triggered BOOLEAN DEFAULT false,
  alert_type TEXT,
  alert_recipients TEXT[],

  -- Performance
  duration_seconds INTEGER,
  error_message TEXT,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_seo_settings_company_id ON public.seo_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_company_id ON public.seo_audit_history(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_audit_history_created_at ON public.seo_audit_history(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_fixes_applied_audit_id ON public.seo_fixes_applied(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_fixes_applied_company_id ON public.seo_fixes_applied(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_company_id ON public.seo_keywords(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_keywords_keyword ON public.seo_keywords(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_history_keyword_id ON public.seo_keyword_history(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_keyword_history_checked_at ON public.seo_keyword_history(checked_at DESC);
CREATE INDEX IF NOT EXISTS idx_seo_competitor_analysis_company_id ON public.seo_competitor_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_page_scores_company_id ON public.seo_page_scores(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_page_scores_url ON public.seo_page_scores(url);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_log_company_id ON public.seo_monitoring_log(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_monitoring_log_created_at ON public.seo_monitoring_log(created_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.seo_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_audit_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_fixes_applied ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keywords ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_keyword_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_competitor_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_page_scores ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_monitoring_log ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can manage SEO settings"
ON public.seo_settings
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage SEO audit history"
ON public.seo_audit_history
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage SEO fixes"
ON public.seo_fixes_applied
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage SEO keywords"
ON public.seo_keywords
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view SEO keyword history"
ON public.seo_keyword_history
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage competitor analysis"
ON public.seo_competitor_analysis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage page scores"
ON public.seo_page_scores
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view monitoring logs"
ON public.seo_monitoring_log
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

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_seo_settings_updated_at
BEFORE UPDATE ON public.seo_settings
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_fixes_applied_updated_at
BEFORE UPDATE ON public.seo_fixes_applied
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_keywords_updated_at
BEFORE UPDATE ON public.seo_keywords
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_competitor_analysis_updated_at
BEFORE UPDATE ON public.seo_competitor_analysis
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_page_scores_updated_at
BEFORE UPDATE ON public.seo_page_scores
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.seo_settings IS 'Global SEO configuration and settings for the platform';
COMMENT ON TABLE public.seo_audit_history IS 'Historical record of all SEO audits performed';
COMMENT ON TABLE public.seo_fixes_applied IS 'Tracks SEO issues and fixes applied';
COMMENT ON TABLE public.seo_keywords IS 'Target keywords and their tracking data';
COMMENT ON TABLE public.seo_keyword_history IS 'Historical position tracking for keywords';
COMMENT ON TABLE public.seo_competitor_analysis IS 'Competitor SEO analysis and comparison data';
COMMENT ON TABLE public.seo_page_scores IS 'Individual page SEO scores and metrics';
COMMENT ON TABLE public.seo_monitoring_log IS 'Log of automated SEO monitoring checks';
