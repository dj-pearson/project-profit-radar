-- SEO Management System - Enterprise SEO Features
-- Adds structured data, mobile analysis, and performance budgets
-- Version: 1.0.0
-- Date: 2025-11-07

-- =====================================================
-- SEO Structured Data Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_structured_data (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  crawl_id UUID REFERENCES public.seo_crawl_results(id) ON DELETE CASCADE,

  -- Page Details
  url TEXT NOT NULL,

  -- Schema Type
  schema_type TEXT NOT NULL, -- 'Organization', 'LocalBusiness', 'Product', 'Article', 'FAQPage', etc.
  schema_format TEXT DEFAULT 'json-ld', -- 'json-ld', 'microdata', 'rdfa'

  -- Schema Data
  schema_data JSONB NOT NULL,
  schema_raw TEXT,

  -- Validation
  is_valid BOOLEAN DEFAULT false,
  validation_errors JSONB DEFAULT '[]',
  validation_warnings JSONB DEFAULT '[]',

  -- Rich Results Eligibility
  eligible_for_rich_results BOOLEAN DEFAULT false,
  rich_result_types TEXT[], -- 'recipe', 'review', 'event', 'product', 'faq', etc.

  -- Testing Results
  google_test_url TEXT,
  tested_at TIMESTAMP WITH TIME ZONE,
  test_results JSONB,

  -- Implementation Status
  is_implemented_correctly BOOLEAN DEFAULT false,
  implementation_issues TEXT[],
  recommendations TEXT[],

  -- Performance Impact
  impacts_seo BOOLEAN DEFAULT true,
  seo_impact_score INTEGER, -- 0-100

  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_validated_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Mobile Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_mobile_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Page Details
  url TEXT NOT NULL,

  -- Mobile-Friendliness
  is_mobile_friendly BOOLEAN DEFAULT false,
  mobile_friendly_score INTEGER, -- 0-100

  -- Mobile Issues
  has_mobile_issues BOOLEAN DEFAULT false,
  mobile_issues JSONB DEFAULT '[]', -- viewport, text size, tap targets, etc.

  -- Responsive Design
  has_viewport_meta BOOLEAN DEFAULT false,
  viewport_config TEXT,
  is_responsive BOOLEAN DEFAULT false,

  -- Touch Elements
  tap_targets_appropriately_sized BOOLEAN DEFAULT false,
  content_wider_than_screen BOOLEAN DEFAULT false,
  text_too_small BOOLEAN DEFAULT false,

  -- Mobile Performance
  mobile_page_load_time INTEGER, -- milliseconds
  mobile_first_contentful_paint INTEGER,
  mobile_speed_index INTEGER,

  -- Mobile Usability Scores
  mobile_usability_score INTEGER,
  mobile_performance_score INTEGER,
  mobile_seo_score INTEGER,

  -- User Experience
  has_mobile_navigation BOOLEAN DEFAULT false,
  has_mobile_optimized_images BOOLEAN DEFAULT false,
  uses_mobile_friendly_font_sizes BOOLEAN DEFAULT false,

  -- AMP (Accelerated Mobile Pages)
  has_amp_version BOOLEAN DEFAULT false,
  amp_url TEXT,
  amp_valid BOOLEAN DEFAULT false,
  amp_errors JSONB DEFAULT '[]',

  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  priority_fixes TEXT[],

  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Performance Budget Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_performance_budget (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Budget Configuration
  budget_name TEXT NOT NULL,
  page_pattern TEXT, -- URL pattern like '/blog/*' or '/*'
  is_active BOOLEAN DEFAULT true,

  -- Performance Thresholds (milliseconds)
  max_page_load_time INTEGER DEFAULT 3000,
  max_first_contentful_paint INTEGER DEFAULT 1800,
  max_largest_contentful_paint INTEGER DEFAULT 2500,
  max_time_to_interactive INTEGER DEFAULT 3800,
  max_total_blocking_time INTEGER DEFAULT 300,

  -- Size Budgets (kilobytes)
  max_total_page_size INTEGER DEFAULT 1000,
  max_html_size INTEGER DEFAULT 100,
  max_css_size INTEGER DEFAULT 150,
  max_js_size INTEGER DEFAULT 300,
  max_image_size INTEGER DEFAULT 500,
  max_font_size INTEGER DEFAULT 100,

  -- Resource Counts
  max_requests INTEGER DEFAULT 50,
  max_domains INTEGER DEFAULT 5,

  -- Core Web Vitals Thresholds
  lcp_good_threshold DECIMAL(10,2) DEFAULT 2.5,
  lcp_poor_threshold DECIMAL(10,2) DEFAULT 4.0,
  fid_good_threshold DECIMAL(10,2) DEFAULT 100,
  fid_poor_threshold DECIMAL(10,2) DEFAULT 300,
  cls_good_threshold DECIMAL(5,3) DEFAULT 0.1,
  cls_poor_threshold DECIMAL(5,3) DEFAULT 0.25,

  -- Monitoring
  check_frequency_hours INTEGER DEFAULT 24,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  next_check_at TIMESTAMP WITH TIME ZONE,

  -- Alert Settings
  alert_on_budget_exceeded BOOLEAN DEFAULT true,
  alert_threshold_percentage INTEGER DEFAULT 90, -- Alert at 90% of budget

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Performance Budget Violations Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_performance_budget_violations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  budget_id UUID NOT NULL REFERENCES public.seo_performance_budget(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Violation Details
  url TEXT NOT NULL,
  metric_name TEXT NOT NULL,
  metric_category TEXT, -- 'timing', 'size', 'count', 'vitals'

  -- Values
  budget_value DECIMAL(10,2),
  actual_value DECIMAL(10,2),
  exceeded_by DECIMAL(10,2),
  exceeded_percentage DECIMAL(5,2),

  -- Severity
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high', 'critical'

  -- Status
  status TEXT DEFAULT 'open', -- 'open', 'acknowledged', 'fixed', 'accepted'
  acknowledged_at TIMESTAMP WITH TIME ZONE,
  fixed_at TIMESTAMP WITH TIME ZONE,

  -- Impact
  estimated_impact TEXT,
  user_impact_score INTEGER, -- 0-100

  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Backlinks Table (for tracking external backlinks)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_backlinks (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Source Details
  source_url TEXT NOT NULL,
  source_domain TEXT NOT NULL,
  source_title TEXT,

  -- Target Details
  target_url TEXT NOT NULL,
  anchor_text TEXT,

  -- Link Attributes
  is_follow BOOLEAN DEFAULT true,
  is_ugc BOOLEAN DEFAULT false,
  is_sponsored BOOLEAN DEFAULT false,
  rel_attributes TEXT[],

  -- Source Metrics
  source_domain_authority INTEGER,
  source_page_authority INTEGER,
  source_spam_score INTEGER,
  source_traffic_estimate INTEGER,

  -- Link Value
  link_quality_score INTEGER, -- 0-100
  link_type TEXT, -- 'natural', 'guest_post', 'directory', 'forum', 'comment', 'editorial'
  link_status TEXT DEFAULT 'active', -- 'active', 'lost', 'removed', 'redirect'

  -- Discovery
  discovered_via TEXT, -- 'ahrefs', 'moz', 'manual', 'gsc'
  first_seen_at TIMESTAMP WITH TIME ZONE,
  last_seen_at TIMESTAMP WITH TIME ZONE,

  -- Monitoring
  is_monitoring BOOLEAN DEFAULT true,
  last_checked_at TIMESTAMP WITH TIME ZONE,
  check_frequency_days INTEGER DEFAULT 7,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO SERP Positions Table (for SERP tracking)
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_serp_positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  keyword_id UUID REFERENCES public.seo_keywords(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Search Details
  keyword TEXT NOT NULL,
  search_engine TEXT DEFAULT 'google', -- 'google', 'bing', 'duckduckgo'
  location TEXT, -- 'US', 'UK', 'CA', etc. or specific city
  device TEXT DEFAULT 'desktop', -- 'desktop', 'mobile'
  language TEXT DEFAULT 'en',

  -- SERP Data
  position INTEGER,
  url TEXT,
  title TEXT,
  description TEXT,

  -- SERP Features
  has_featured_snippet BOOLEAN DEFAULT false,
  featured_snippet_type TEXT, -- 'paragraph', 'list', 'table', 'video'
  has_knowledge_panel BOOLEAN DEFAULT false,
  has_people_also_ask BOOLEAN DEFAULT false,
  has_image_pack BOOLEAN DEFAULT false,
  has_video_carousel BOOLEAN DEFAULT false,
  has_local_pack BOOLEAN DEFAULT false,

  -- Competitor Analysis
  competitors JSONB DEFAULT '[]', -- Top 10 URLs with their positions

  -- Metrics
  estimated_traffic INTEGER,
  estimated_value DECIMAL(10,2),

  -- Tracking
  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_seo_structured_data_company_id ON public.seo_structured_data(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_structured_data_url ON public.seo_structured_data(url);
CREATE INDEX IF NOT EXISTS idx_seo_structured_data_schema_type ON public.seo_structured_data(schema_type);
CREATE INDEX IF NOT EXISTS idx_seo_structured_data_is_valid ON public.seo_structured_data(is_valid);

CREATE INDEX IF NOT EXISTS idx_seo_mobile_analysis_company_id ON public.seo_mobile_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_mobile_analysis_url ON public.seo_mobile_analysis(url);
CREATE INDEX IF NOT EXISTS idx_seo_mobile_analysis_is_mobile_friendly ON public.seo_mobile_analysis(is_mobile_friendly);

CREATE INDEX IF NOT EXISTS idx_seo_performance_budget_company_id ON public.seo_performance_budget(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance_budget_is_active ON public.seo_performance_budget(is_active);

CREATE INDEX IF NOT EXISTS idx_seo_performance_budget_violations_budget_id ON public.seo_performance_budget_violations(budget_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance_budget_violations_company_id ON public.seo_performance_budget_violations(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_performance_budget_violations_status ON public.seo_performance_budget_violations(status);

CREATE INDEX IF NOT EXISTS idx_seo_backlinks_company_id ON public.seo_backlinks(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_target_url ON public.seo_backlinks(target_url);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_source_domain ON public.seo_backlinks(source_domain);
CREATE INDEX IF NOT EXISTS idx_seo_backlinks_link_status ON public.seo_backlinks(link_status);

CREATE INDEX IF NOT EXISTS idx_seo_serp_positions_keyword_id ON public.seo_serp_positions(keyword_id);
CREATE INDEX IF NOT EXISTS idx_seo_serp_positions_company_id ON public.seo_serp_positions(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_serp_positions_keyword ON public.seo_serp_positions(keyword);
CREATE INDEX IF NOT EXISTS idx_seo_serp_positions_checked_at ON public.seo_serp_positions(checked_at DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.seo_structured_data ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_mobile_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_performance_budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_performance_budget_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_backlinks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_serp_positions ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can view structured data"
ON public.seo_structured_data
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view mobile analysis"
ON public.seo_mobile_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage performance budgets"
ON public.seo_performance_budget
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view budget violations"
ON public.seo_performance_budget_violations
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view backlinks"
ON public.seo_backlinks
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view SERP positions"
ON public.seo_serp_positions
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

CREATE TRIGGER update_seo_performance_budget_updated_at
BEFORE UPDATE ON public.seo_performance_budget
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_backlinks_updated_at
BEFORE UPDATE ON public.seo_backlinks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View for invalid structured data
CREATE OR REPLACE VIEW seo_invalid_structured_data AS
SELECT
  sd.id,
  sd.company_id,
  sd.url,
  sd.schema_type,
  sd.validation_errors,
  sd.last_validated_at
FROM public.seo_structured_data sd
WHERE sd.is_valid = false
ORDER BY sd.last_validated_at DESC;

-- View for mobile-unfriendly pages
CREATE OR REPLACE VIEW seo_mobile_unfriendly_pages AS
SELECT
  ma.id,
  ma.company_id,
  ma.url,
  ma.mobile_friendly_score,
  ma.mobile_issues,
  ma.recommendations
FROM public.seo_mobile_analysis ma
WHERE ma.is_mobile_friendly = false OR ma.mobile_friendly_score < 70
ORDER BY ma.mobile_friendly_score ASC;

-- View for backlink quality
CREATE OR REPLACE VIEW seo_quality_backlinks AS
SELECT
  bl.id,
  bl.company_id,
  bl.source_domain,
  bl.target_url,
  bl.anchor_text,
  bl.link_quality_score,
  bl.source_domain_authority,
  bl.link_type,
  bl.link_status
FROM public.seo_backlinks bl
WHERE bl.link_quality_score >= 70 AND bl.link_status = 'active'
ORDER BY bl.link_quality_score DESC;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.seo_structured_data IS 'Structured data (Schema.org) validation and tracking';
COMMENT ON TABLE public.seo_mobile_analysis IS 'Mobile-friendliness and mobile usability analysis';
COMMENT ON TABLE public.seo_performance_budget IS 'Performance budget configuration and thresholds';
COMMENT ON TABLE public.seo_performance_budget_violations IS 'Tracking of performance budget violations';
COMMENT ON TABLE public.seo_backlinks IS 'External backlinks to the website';
COMMENT ON TABLE public.seo_serp_positions IS 'Search engine results page position tracking';
COMMENT ON VIEW seo_invalid_structured_data IS 'Pages with invalid structured data';
COMMENT ON VIEW seo_mobile_unfriendly_pages IS 'Pages that are not mobile-friendly';
COMMENT ON VIEW seo_quality_backlinks IS 'High-quality active backlinks';
