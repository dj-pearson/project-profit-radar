-- SEO Management System - Content Optimization Features
-- Adds content optimization, semantic analysis, and AI-powered content tools
-- Version: 1.0.0
-- Date: 2025-11-08

-- =====================================================
-- SEO Content Optimization Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_content_optimization (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Content Details
  url TEXT NOT NULL,
  page_title TEXT,
  content_type TEXT, -- 'blog', 'landing_page', 'product', 'category', 'homepage'

  -- Target Keywords
  primary_keyword TEXT NOT NULL,
  secondary_keywords TEXT[] DEFAULT '{}',
  long_tail_keywords TEXT[] DEFAULT '{}',

  -- Content Scores (0-100)
  overall_seo_score INTEGER,
  keyword_optimization_score INTEGER,
  readability_score INTEGER,
  content_quality_score INTEGER,
  engagement_score INTEGER,

  -- Content Metrics
  word_count INTEGER,
  paragraph_count INTEGER,
  sentence_count INTEGER,
  avg_sentence_length DECIMAL(5,2),
  avg_word_length DECIMAL(5,2),

  -- Keyword Analysis
  primary_keyword_count INTEGER,
  primary_keyword_density DECIMAL(5,2),
  keyword_in_title BOOLEAN DEFAULT false,
  keyword_in_h1 BOOLEAN DEFAULT false,
  keyword_in_meta_description BOOLEAN DEFAULT false,
  keyword_in_url BOOLEAN DEFAULT false,
  keyword_in_first_paragraph BOOLEAN DEFAULT false,

  -- Readability
  flesch_reading_ease DECIMAL(5,2),
  flesch_kincaid_grade DECIMAL(5,2),
  gunning_fog_index DECIMAL(5,2),
  smog_index DECIMAL(5,2),

  -- Content Structure
  heading_count JSONB DEFAULT '{"h1": 0, "h2": 0, "h3": 0, "h4": 0, "h5": 0, "h6": 0}',
  has_table_of_contents BOOLEAN DEFAULT false,
  has_images BOOLEAN DEFAULT false,
  images_with_alt_count INTEGER DEFAULT 0,
  has_videos BOOLEAN DEFAULT false,
  has_infographics BOOLEAN DEFAULT false,

  -- SEO Elements
  title_length INTEGER,
  title_optimal BOOLEAN DEFAULT false,
  meta_description_length INTEGER,
  meta_description_optimal BOOLEAN DEFAULT false,
  has_focus_keyphrase_in_seo_title BOOLEAN DEFAULT false,

  -- Content Quality
  unique_content_percentage DECIMAL(5,2),
  thin_content BOOLEAN DEFAULT false,
  duplicate_content_issues INTEGER DEFAULT 0,

  -- Engagement Signals
  estimated_reading_time INTEGER, -- minutes
  content_depth_score INTEGER, -- 0-100

  -- Recommendations
  recommendations JSONB DEFAULT '[]',
  priority_actions TEXT[],

  -- AI Optimization
  ai_optimized BOOLEAN DEFAULT false,
  ai_optimization_suggestions JSONB DEFAULT '[]',
  ai_generated_meta_title TEXT,
  ai_generated_meta_description TEXT,

  -- Status
  optimization_status TEXT DEFAULT 'pending', -- 'pending', 'in_progress', 'optimized', 'needs_review'
  last_optimized_at TIMESTAMP WITH TIME ZONE,
  optimized_by UUID REFERENCES auth.users(id),

  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Semantic Analysis Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_semantic_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,
  content_optimization_id UUID REFERENCES public.seo_content_optimization(id) ON DELETE CASCADE,

  -- Target Keyword
  target_keyword TEXT NOT NULL,
  url TEXT NOT NULL,

  -- Semantic Keywords (LSI Keywords)
  semantic_keywords TEXT[] DEFAULT '{}',
  semantic_keywords_found INTEGER DEFAULT 0,
  semantic_keywords_missing TEXT[] DEFAULT '{}',

  -- Related Topics
  related_topics TEXT[] DEFAULT '{}',
  topic_coverage_score INTEGER, -- 0-100
  topic_gaps TEXT[],

  -- Entity Analysis
  entities_found JSONB DEFAULT '[]',
  entity_relevance_score INTEGER,

  -- Search Intent
  search_intent TEXT, -- 'informational', 'commercial', 'navigational', 'transactional'
  intent_match_score INTEGER, -- 0-100
  intent_alignment BOOLEAN DEFAULT false,

  -- Content Relevance
  topical_authority_score INTEGER, -- 0-100
  semantic_relevance_score INTEGER, -- 0-100

  -- Competitor Content Analysis
  competitor_avg_word_count INTEGER,
  competitor_top_topics TEXT[],
  content_gaps_vs_competitors TEXT[],

  -- TF-IDF Analysis
  tfidf_score DECIMAL(10,6),
  important_terms JSONB DEFAULT '[]',

  -- Recommendations
  semantic_recommendations TEXT[],
  suggested_topics_to_cover TEXT[],
  suggested_semantic_keywords TEXT[],

  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- SEO Content Templates Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_content_templates (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Template Details
  template_name TEXT NOT NULL,
  template_type TEXT NOT NULL, -- 'blog_post', 'landing_page', 'product', 'comparison', 'guide'
  description TEXT,

  -- Template Structure
  template_structure JSONB NOT NULL,
  required_sections TEXT[],
  recommended_word_count INTEGER,

  -- SEO Configuration
  default_meta_title_format TEXT,
  default_meta_description_format TEXT,
  default_slug_format TEXT,

  -- Content Guidelines
  tone TEXT DEFAULT 'professional', -- 'professional', 'casual', 'technical', 'friendly'
  target_audience TEXT,
  content_guidelines TEXT,

  -- Schema Configuration
  default_schema_type TEXT,
  schema_template JSONB,

  -- Status
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  last_used_at TIMESTAMP WITH TIME ZONE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Content Brief Generation Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_content_briefs (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Brief Details
  brief_title TEXT NOT NULL,
  target_keyword TEXT NOT NULL,
  content_type TEXT,
  target_url TEXT,

  -- Research Data
  search_volume INTEGER,
  keyword_difficulty INTEGER,
  search_intent TEXT,

  -- Competitor Analysis
  top_ranking_urls TEXT[],
  competitor_analysis JSONB DEFAULT '[]',
  content_gaps TEXT[],

  -- Content Outline
  outline JSONB NOT NULL,
  target_word_count INTEGER,
  recommended_headings TEXT[],
  recommended_topics TEXT[],

  -- SEO Requirements
  title_suggestions TEXT[],
  meta_description_suggestions TEXT[],
  semantic_keywords TEXT[],
  lsi_keywords TEXT[],

  -- Media Requirements
  recommended_images INTEGER DEFAULT 3,
  recommended_videos INTEGER DEFAULT 0,
  recommended_infographics INTEGER DEFAULT 0,

  -- Internal Linking
  recommended_internal_links TEXT[],
  recommended_external_links TEXT[],

  -- AI Generation
  ai_generated BOOLEAN DEFAULT false,
  ai_model_used TEXT,
  ai_confidence_score DECIMAL(5,2),

  -- Status
  status TEXT DEFAULT 'draft', -- 'draft', 'review', 'approved', 'in_production', 'published'
  assigned_to UUID REFERENCES auth.users(id),
  due_date DATE,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- =====================================================
-- SEO Content Performance Table
-- =====================================================
CREATE TABLE IF NOT EXISTS public.seo_content_performance (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_optimization_id UUID REFERENCES public.seo_content_optimization(id) ON DELETE CASCADE,
  company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE,

  -- Content Reference
  url TEXT NOT NULL,
  title TEXT,

  -- Traffic Metrics
  organic_sessions INTEGER DEFAULT 0,
  organic_pageviews INTEGER DEFAULT 0,
  organic_users INTEGER DEFAULT 0,
  bounce_rate DECIMAL(5,2),
  avg_time_on_page INTEGER, -- seconds

  -- Engagement Metrics
  scroll_depth_avg DECIMAL(5,2), -- percentage
  click_through_rate DECIMAL(5,2),
  conversion_rate DECIMAL(5,2),
  social_shares INTEGER DEFAULT 0,

  -- SEO Metrics
  total_impressions INTEGER DEFAULT 0,
  total_clicks INTEGER DEFAULT 0,
  avg_position DECIMAL(5,2),
  ranking_keywords_count INTEGER DEFAULT 0,

  -- Performance Changes
  sessions_change_percentage DECIMAL(5,2),
  position_change_percentage DECIMAL(5,2),
  impressions_change_percentage DECIMAL(5,2),

  -- Revenue Impact
  estimated_value DECIMAL(10,2),
  conversions INTEGER DEFAULT 0,
  revenue DECIMAL(10,2),

  -- Content Updates
  last_updated_at TIMESTAMP WITH TIME ZONE,
  updates_count INTEGER DEFAULT 0,

  -- Date Range
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,

  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- =====================================================
-- Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_seo_content_optimization_company_id ON public.seo_content_optimization(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_optimization_url ON public.seo_content_optimization(url);
CREATE INDEX IF NOT EXISTS idx_seo_content_optimization_primary_keyword ON public.seo_content_optimization(primary_keyword);
CREATE INDEX IF NOT EXISTS idx_seo_content_optimization_overall_seo_score ON public.seo_content_optimization(overall_seo_score);
CREATE INDEX IF NOT EXISTS idx_seo_content_optimization_status ON public.seo_content_optimization(optimization_status);

CREATE INDEX IF NOT EXISTS idx_seo_semantic_analysis_company_id ON public.seo_semantic_analysis(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_semantic_analysis_target_keyword ON public.seo_semantic_analysis(target_keyword);
CREATE INDEX IF NOT EXISTS idx_seo_semantic_analysis_content_optimization_id ON public.seo_semantic_analysis(content_optimization_id);

CREATE INDEX IF NOT EXISTS idx_seo_content_templates_company_id ON public.seo_content_templates(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_templates_template_type ON public.seo_content_templates(template_type);
CREATE INDEX IF NOT EXISTS idx_seo_content_templates_is_active ON public.seo_content_templates(is_active);

CREATE INDEX IF NOT EXISTS idx_seo_content_briefs_company_id ON public.seo_content_briefs(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_briefs_target_keyword ON public.seo_content_briefs(target_keyword);
CREATE INDEX IF NOT EXISTS idx_seo_content_briefs_status ON public.seo_content_briefs(status);

CREATE INDEX IF NOT EXISTS idx_seo_content_performance_company_id ON public.seo_content_performance(company_id);
CREATE INDEX IF NOT EXISTS idx_seo_content_performance_url ON public.seo_content_performance(url);
CREATE INDEX IF NOT EXISTS idx_seo_content_performance_period_start ON public.seo_content_performance(period_start DESC);

-- =====================================================
-- Row Level Security (RLS) Policies
-- =====================================================

-- Enable RLS on all tables
ALTER TABLE public.seo_content_optimization ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_semantic_analysis ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_content_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_content_briefs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_content_performance ENABLE ROW LEVEL SECURITY;

-- Root Admin Full Access Policies
CREATE POLICY "Root admins can manage content optimization"
ON public.seo_content_optimization
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view semantic analysis"
ON public.seo_semantic_analysis
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage content templates"
ON public.seo_content_templates
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can manage content briefs"
ON public.seo_content_briefs
FOR ALL
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles
    WHERE user_profiles.id = auth.uid()
    AND user_profiles.role = 'root_admin'::user_role
  )
);

CREATE POLICY "Root admins can view content performance"
ON public.seo_content_performance
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

CREATE TRIGGER update_seo_content_optimization_updated_at
BEFORE UPDATE ON public.seo_content_optimization
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_content_templates_updated_at
BEFORE UPDATE ON public.seo_content_templates
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_seo_content_briefs_updated_at
BEFORE UPDATE ON public.seo_content_briefs
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- =====================================================
-- Views for Reporting
-- =====================================================

-- View for low-scoring content that needs optimization
CREATE OR REPLACE VIEW seo_content_needs_optimization AS
SELECT
  co.id,
  co.company_id,
  co.url,
  co.page_title,
  co.primary_keyword,
  co.overall_seo_score,
  co.optimization_status,
  co.priority_actions
FROM public.seo_content_optimization co
WHERE co.overall_seo_score < 70 OR co.optimization_status IN ('pending', 'needs_review')
ORDER BY co.overall_seo_score ASC;

-- View for high-performing content
CREATE OR REPLACE VIEW seo_top_performing_content AS
SELECT
  cp.url,
  cp.title,
  cp.organic_sessions,
  cp.avg_position,
  cp.total_clicks,
  cp.conversion_rate,
  cp.estimated_value,
  cp.period_start,
  cp.period_end
FROM public.seo_content_performance cp
WHERE cp.period_start >= CURRENT_DATE - INTERVAL '30 days'
ORDER BY cp.organic_sessions DESC
LIMIT 50;

-- View for content brief pipeline
CREATE OR REPLACE VIEW seo_content_brief_pipeline AS
SELECT
  cb.id,
  cb.company_id,
  cb.brief_title,
  cb.target_keyword,
  cb.content_type,
  cb.status,
  cb.assigned_to,
  cb.due_date,
  CASE
    WHEN cb.due_date < CURRENT_DATE THEN 'overdue'
    WHEN cb.due_date = CURRENT_DATE THEN 'due_today'
    WHEN cb.due_date <= CURRENT_DATE + INTERVAL '7 days' THEN 'due_soon'
    ELSE 'on_track'
  END as urgency,
  cb.created_at
FROM public.seo_content_briefs cb
WHERE cb.status IN ('draft', 'review', 'approved', 'in_production')
ORDER BY cb.due_date ASC;

-- =====================================================
-- Helper Functions
-- =====================================================

-- Function to calculate estimated reading time
CREATE OR REPLACE FUNCTION calculate_reading_time(word_count INTEGER)
RETURNS INTEGER AS $$
BEGIN
  -- Average reading speed: 200 words per minute
  RETURN CEIL(word_count::DECIMAL / 200);
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Function to determine if content is thin
CREATE OR REPLACE FUNCTION is_thin_content(word_count INTEGER, content_type TEXT)
RETURNS BOOLEAN AS $$
BEGIN
  RETURN CASE content_type
    WHEN 'blog' THEN word_count < 300
    WHEN 'landing_page' THEN word_count < 500
    WHEN 'product' THEN word_count < 200
    WHEN 'category' THEN word_count < 150
    ELSE word_count < 100
  END;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- =====================================================
-- Comments for Documentation
-- =====================================================

COMMENT ON TABLE public.seo_content_optimization IS 'Content optimization analysis and scores';
COMMENT ON TABLE public.seo_semantic_analysis IS 'Semantic keyword and topic analysis for content';
COMMENT ON TABLE public.seo_content_templates IS 'Reusable content templates for consistent SEO';
COMMENT ON TABLE public.seo_content_briefs IS 'Content briefs for new content creation';
COMMENT ON TABLE public.seo_content_performance IS 'Performance tracking for optimized content';
COMMENT ON VIEW seo_content_needs_optimization IS 'Content pages that need SEO optimization';
COMMENT ON VIEW seo_top_performing_content IS 'Top performing content by organic traffic';
COMMENT ON VIEW seo_content_brief_pipeline IS 'Content brief pipeline with urgency status';
