-- SEO Management System - Advanced SEO Features
-- Adds crawling, link analysis, redirects, duplicate content, and security analysis
-- Version: 1.0.0
-- Date: 2025-11-06

-- =====================================================
-- SEO Crawl Results Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_crawl_results (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  audit_id UUID REFERENCES public.seo_audit_history(id) ON DELETE SET NULL,

  -- Page Details
  url TEXT NOT NULL,
  canonical_url TEXT,
  status_code INTEGER,
  page_title TEXT,
  meta_description TEXT,
  h1_tags TEXT[],

  -- Content Analysis
  word_count INTEGER,
  content_hash TEXT,
  language TEXT,
  has_robots_meta BOOLEAN DEFAULT false,
  robots_directives TEXT[],

  -- Load Performance
  load_time_ms INTEGER,
  page_size_bytes INTEGER,
  resource_count INTEGER,

  -- SEO Elements
  has_title BOOLEAN DEFAULT false,
  has_meta_description BOOLEAN DEFAULT false,
  has_h1 BOOLEAN DEFAULT false,
  has_canonical BOOLEAN DEFAULT false,
  has_schema_markup BOOLEAN DEFAULT false,

  -- Links Found
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  images_count INTEGER DEFAULT 0,
  scripts_count INTEGER DEFAULT 0,
  stylesheets_count INTEGER DEFAULT 0,

  -- Issues
  is_indexable BOOLEAN DEFAULT true,
  is_crawlable BOOLEAN DEFAULT true,
  has_errors BOOLEAN DEFAULT false,
  error_type TEXT,
  error_message TEXT,

  -- Depth and Discovery
  crawl_depth INTEGER DEFAULT 0,
  parent_url TEXT,
  discovered_via TEXT, -- 'sitemap', 'link', 'direct'

  crawled_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Link Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_link_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  crawl_id UUID REFERENCES public.seo_crawl_results(id) ON DELETE CASCADE,

  -- Source and Target
  source_url TEXT NOT NULL,
  target_url TEXT NOT NULL,
  anchor_text TEXT,

  -- Link Attributes
  link_type TEXT, -- 'internal', 'external', 'image', 'javascript'
  is_follow BOOLEAN DEFAULT true,
  is_broken BOOLEAN DEFAULT false,
  rel_attributes TEXT[],

  -- Status
  target_status_code INTEGER,
  is_redirect BOOLEAN DEFAULT false,
  redirect_chain TEXT[],

  -- Context
  link_position TEXT, -- 'navigation', 'content', 'footer', 'sidebar'
  surrounding_text TEXT,

  -- Metrics
  link_equity_score DECIMAL(5,2),
  page_authority INTEGER,

  found_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Image Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_image_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  crawl_id UUID REFERENCES public.seo_crawl_results(id) ON DELETE CASCADE,

  -- Image Details
  image_url TEXT NOT NULL,
  source_page_url TEXT NOT NULL,
  image_alt TEXT,
  image_title TEXT,

  -- Technical Details
  file_size_bytes INTEGER,
  file_type TEXT,
  dimensions_width INTEGER,
  dimensions_height INTEGER,
  format TEXT, -- 'jpg', 'png', 'webp', 'svg', 'gif'

  -- SEO Issues
  has_alt_text BOOLEAN DEFAULT false,
  is_optimized BOOLEAN DEFAULT false,
  is_lazy_loaded BOOLEAN DEFAULT false,
  is_responsive BOOLEAN DEFAULT false,

  -- Optimization Opportunities
  potential_savings_bytes INTEGER,
  recommended_format TEXT,
  compression_quality INTEGER,

  -- Loading Performance
  load_time_ms INTEGER,
  is_above_fold BOOLEAN DEFAULT false,

  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Redirect Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_redirect_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Redirect Details
  source_url TEXT NOT NULL,
  destination_url TEXT NOT NULL,
  redirect_type INTEGER, -- 301, 302, 307, 308, meta refresh, javascript
  redirect_chain TEXT[],
  chain_length INTEGER,

  -- Issues
  has_issues BOOLEAN DEFAULT false,
  issue_type TEXT, -- 'chain', 'loop', 'broken', 'slow', 'incorrect_type'
  issue_description TEXT,

  -- Performance
  redirect_time_ms INTEGER,
  total_time_ms INTEGER,

  -- Recommendations
  recommendation TEXT,
  priority TEXT DEFAULT 'low', -- 'low', 'medium', 'high'

  -- Status
  is_resolved BOOLEAN DEFAULT false,
  resolved_at TIMESTAMP WITH TIME ZONE,

  found_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Duplicate Content Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_duplicate_content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Primary URL
  url_1 TEXT NOT NULL,
  url_2 TEXT NOT NULL,

  -- Similarity Analysis
  similarity_score DECIMAL(5,2), -- 0-100
  content_hash_1 TEXT,
  content_hash_2 TEXT,

  -- Duplicate Type
  duplicate_type TEXT, -- 'exact', 'near', 'thin', 'boilerplate'
  duplicate_scope TEXT, -- 'full_page', 'section', 'paragraph'

  -- Canonical Information
  canonical_url_1 TEXT,
  canonical_url_2 TEXT,
  has_canonical_conflict BOOLEAN DEFAULT false,

  -- Indexing Status
  is_indexed_1 BOOLEAN,
  is_indexed_2 BOOLEAN,

  -- Impact Assessment
  severity TEXT DEFAULT 'medium', -- 'low', 'medium', 'high'
  estimated_impact TEXT,

  -- Resolution
  recommended_action TEXT, -- 'add_canonical', 'noindex', 'merge', '301_redirect', 'rewrite'
  is_resolved BOOLEAN DEFAULT false,
  resolution_method TEXT,
  resolved_at TIMESTAMP WITH TIME ZONE,

  detected_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  last_checked_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Security Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_security_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Target URL
  url TEXT NOT NULL,

  -- HTTPS
  has_https BOOLEAN DEFAULT false,
  ssl_certificate_valid BOOLEAN DEFAULT false,
  ssl_issuer TEXT,
  ssl_expiry_date DATE,

  -- Security Headers
  has_hsts BOOLEAN DEFAULT false,
  hsts_max_age INTEGER,
  has_csp BOOLEAN DEFAULT false,
  csp_policy TEXT,
  has_x_frame_options BOOLEAN DEFAULT false,
  x_frame_options_value TEXT,
  has_x_content_type_options BOOLEAN DEFAULT false,
  has_referrer_policy BOOLEAN DEFAULT false,
  referrer_policy_value TEXT,

  -- Mixed Content
  has_mixed_content BOOLEAN DEFAULT false,
  mixed_content_urls TEXT[],

  -- Security Score
  security_score INTEGER, -- 0-100
  security_grade TEXT, -- 'A+', 'A', 'B', 'C', 'D', 'F'

  -- Issues Found
  security_issues JSONB DEFAULT '[]',
  warnings JSONB DEFAULT '[]',
  recommendations JSONB DEFAULT '[]',

  -- SEO Impact
  impacts_seo BOOLEAN DEFAULT false,
  seo_impact_description TEXT,

  checked_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_seo_crawl_results_company_id ON public.seo_crawl_results(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_results_audit_id ON public.seo_crawl_results(audit_id);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_results_url ON public.seo_crawl_results(url);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_results_status_code ON public.seo_crawl_results(status_code);
CREATE INDEX IF NOT EXISTS idx_seo_crawl_results_crawled_at ON public.seo_crawl_results(crawled_at DESC);

CREATE INDEX IF NOT EXISTS idx_seo_link_analysis_company_id ON public.seo_link_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_link_analysis_source_url ON public.seo_link_analysis(source_url);
CREATE INDEX IF NOT EXISTS idx_seo_link_analysis_target_url ON public.seo_link_analysis(target_url);
CREATE INDEX IF NOT EXISTS idx_seo_link_analysis_is_broken ON public.seo_link_analysis(is_broken);

CREATE INDEX IF NOT EXISTS idx_seo_image_analysis_company_id ON public.seo_image_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_image_analysis_source_page_url ON public.seo_image_analysis(source_page_url);
CREATE INDEX IF NOT EXISTS idx_seo_image_analysis_has_alt_text ON public.seo_image_analysis(has_alt_text);

CREATE INDEX IF NOT EXISTS idx_seo_redirect_analysis_company_id ON public.seo_redirect_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_redirect_analysis_source_url ON public.seo_redirect_analysis(source_url);
CREATE INDEX IF NOT EXISTS idx_seo_redirect_analysis_has_issues ON public.seo_redirect_analysis(has_issues);

CREATE INDEX IF NOT EXISTS idx_seo_duplicate_content_company_id ON public.seo_duplicate_content(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_duplicate_content_url_1 ON public.seo_duplicate_content(url_1);
CREATE INDEX IF NOT EXISTS idx_seo_duplicate_content_similarity_score ON public.seo_duplicate_content(similarity_score);

CREATE INDEX IF NOT EXISTS idx_seo_security_analysis_company_id ON public.seo_security_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_security_analysis_url ON public.seo_security_analysis(url);
CREATE INDEX IF NOT EXISTS idx_seo_security_analysis_security_score ON public.seo_security_analysis(security_score);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.seo_crawl_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_link_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_image_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_redirect_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_duplicate_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_security_analysis ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can view crawl results"
ON public.seo_crawl_results
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view link analysis"
ON public.seo_link_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view image analysis"
ON public.seo_image_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage redirect analysis"
ON public.seo_redirect_analysis
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage duplicate content"
ON public.seo_duplicate_content
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view security analysis"
ON public.seo_security_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View for broken links
CREATE OR REPLACE VIEW seo_broken_links AS
SELECT
  la.id,
  la.company_id,
  la.source_url,
  la.target_url,
  la.anchor_text,
  la.target_status_code,
  la.last_checked_at
FROM public.seo_link_analysis la
WHERE la.is_broken = true
ORDER BY la.last_checked_at DESC;

-- View for unoptimized images
CREATE OR REPLACE VIEW seo_unoptimized_images AS
SELECT
  ia.id,
  ia.company_id,
  ia.source_page_url,
  ia.image_url,
  ia.has_alt_text,
  ia.file_size_bytes,
  ia.potential_savings_bytes,
  ia.recommended_format
FROM public.seo_image_analysis ia
WHERE ia.is_optimized = false OR ia.has_alt_text = false
ORDER BY ia.potential_savings_bytes DESC;

-- View for redirect chains
CREATE OR REPLACE VIEW seo_redirect_chains AS
SELECT
  ra.id,
  ra.company_id,
  ra.source_url,
  ra.destination_url,
  ra.chain_length,
  ra.redirect_type,
  ra.issue_description,
  ra.priority
FROM public.seo_redirect_analysis ra
WHERE ra.chain_length > 1
ORDER BY ra.chain_length DESC, ra.priority DESC;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.seo_crawl_results IS 'Results from site crawling operations';
COMMENT ON TABLE public.seo_link_analysis IS 'Analysis of internal and external links';
COMMENT ON TABLE public.seo_image_analysis IS 'SEO analysis of images including alt text and optimization';
COMMENT ON TABLE public.seo_redirect_analysis IS 'Analysis of redirects, chains, and loops';
COMMENT ON TABLE public.seo_duplicate_content IS 'Detection and tracking of duplicate content issues';
COMMENT ON TABLE public.seo_security_analysis IS 'Security headers and HTTPS analysis for SEO';
COMMENT ON VIEW seo_broken_links IS 'List of all broken links found during crawls';
COMMENT ON VIEW seo_unoptimized_images IS 'Images that need optimization or alt text';
COMMENT ON VIEW seo_redirect_chains IS 'Redirect chains that need fixing';
