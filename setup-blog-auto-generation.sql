-- ========================================
-- AI Blog Auto-Generation System Setup
-- ========================================
-- Run this in your Supabase SQL Editor
-- Dashboard → SQL Editor → New Query → Paste and Run

-- Create blog auto-generation settings table
CREATE TABLE IF NOT EXISTS public.blog_auto_generation_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Generation schedule
  is_enabled BOOLEAN NOT NULL DEFAULT false,
  generation_frequency TEXT NOT NULL DEFAULT 'weekly',
  generation_time TIME NOT NULL DEFAULT '09:00:00',
  generation_timezone TEXT NOT NULL DEFAULT 'America/New_York',
  last_generation_at TIMESTAMP WITH TIME ZONE,
  next_generation_at TIMESTAMP WITH TIME ZONE,
  
  -- AI Model settings
  preferred_ai_provider TEXT NOT NULL DEFAULT 'claude',
  preferred_model TEXT NOT NULL DEFAULT 'claude-3-5-sonnet-20241022',
  fallback_model TEXT DEFAULT 'claude-3-5-haiku-20241022',
  model_temperature DECIMAL(3,2) DEFAULT 0.7,
  
  -- Content settings
  target_word_count INTEGER DEFAULT 1200,
  content_style TEXT DEFAULT 'professional',
  industry_focus TEXT[] DEFAULT '{"construction", "project management", "technology"}',
  target_keywords TEXT[] DEFAULT '{}',
  
  -- SEO settings
  optimize_for_geographic BOOLEAN DEFAULT false,
  target_locations TEXT[] DEFAULT '{}',
  seo_focus TEXT DEFAULT 'balanced',
  geo_optimization BOOLEAN DEFAULT true,
  perplexity_optimization BOOLEAN DEFAULT true,
  ai_search_optimization BOOLEAN DEFAULT true,
  
  -- Content diversity settings
  topic_diversity_enabled BOOLEAN DEFAULT true,
  minimum_topic_gap_days INTEGER DEFAULT 30,
  content_analysis_depth TEXT DEFAULT 'excerpt',
  
  -- Publishing settings
  auto_publish BOOLEAN DEFAULT false,
  publish_as_draft BOOLEAN DEFAULT true,
  require_review BOOLEAN DEFAULT true,
  notify_on_generation BOOLEAN DEFAULT true,
  notification_emails TEXT[] DEFAULT '{}',
  
  -- Template and instructions
  content_template TEXT,
  custom_instructions TEXT,
  brand_voice_guidelines TEXT,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  
  UNIQUE(company_id)
);

-- Create blog topic history for diversity tracking
CREATE TABLE IF NOT EXISTS public.blog_topic_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  
  -- Topic analysis
  primary_topic TEXT NOT NULL,
  secondary_topics TEXT[] DEFAULT '{}',
  keywords_used TEXT[] DEFAULT '{}',
  topic_category TEXT,
  content_type TEXT DEFAULT 'article',
  
  -- SEO tracking
  target_keywords TEXT[] DEFAULT '{}',
  geo_targets TEXT[] DEFAULT '{}',
  seo_score DECIMAL(3,2),
  readability_score DECIMAL(3,2),
  
  -- Performance tracking
  generation_model TEXT,
  generation_time_seconds INTEGER,
  ai_confidence_score DECIMAL(3,2),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog generation queue for scheduling
CREATE TABLE IF NOT EXISTS public.blog_generation_queue (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  
  -- Queue details
  scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority INTEGER DEFAULT 5,
  
  -- Generation parameters
  suggested_topic TEXT,
  target_keywords TEXT[] DEFAULT '{}',
  content_parameters JSONB DEFAULT '{}',
  ai_provider TEXT,
  ai_model TEXT,
  
  -- Results
  generated_blog_id UUID REFERENCES public.blog_posts(id),
  processing_started_at TIMESTAMP WITH TIME ZONE,
  processing_completed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INTEGER DEFAULT 0,
  max_retries INTEGER DEFAULT 3,
  
  -- Metadata
  generation_type TEXT DEFAULT 'scheduled',
  requested_by UUID REFERENCES auth.users(id),
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create available AI models configuration
CREATE TABLE IF NOT EXISTS public.ai_model_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  
  -- Model details
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL,
  model_display_name TEXT NOT NULL,
  model_family TEXT,
  
  -- Capabilities
  max_tokens INTEGER,
  supports_vision BOOLEAN DEFAULT false,
  supports_function_calling BOOLEAN DEFAULT false,
  context_window INTEGER,
  
  -- Performance characteristics
  speed_rating INTEGER,
  quality_rating INTEGER,
  cost_rating INTEGER,
  
  -- Blog generation suitability
  recommended_for_blog BOOLEAN DEFAULT true,
  good_for_seo BOOLEAN DEFAULT true,
  good_for_long_form BOOLEAN DEFAULT true,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  requires_api_key TEXT,
  
  -- Metadata
  description TEXT,
  release_date DATE,
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create blog content analysis for improved generation
CREATE TABLE IF NOT EXISTS public.blog_content_analysis (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  blog_post_id UUID NOT NULL REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  
  -- Content metrics
  word_count INTEGER,
  readability_score DECIMAL(3,2),
  sentiment_score DECIMAL(3,2),
  seo_score DECIMAL(3,2),
  
  -- Topic analysis
  extracted_topics TEXT[] DEFAULT '{}',
  key_phrases TEXT[] DEFAULT '{}',
  named_entities JSONB DEFAULT '{}',
  topic_coherence_score DECIMAL(3,2),
  
  -- SEO analysis
  keyword_density JSONB DEFAULT '{}',
  heading_structure JSONB DEFAULT '{}',
  meta_optimization_score DECIMAL(3,2),
  internal_links_count INTEGER DEFAULT 0,
  external_links_count INTEGER DEFAULT 0,
  
  -- AI generation metadata
  generation_prompt TEXT,
  generation_model TEXT,
  generation_temperature DECIMAL(3,2),
  ai_confidence DECIMAL(3,2),
  
  -- Performance tracking
  view_count INTEGER DEFAULT 0,
  engagement_score DECIMAL(3,2),
  search_impressions INTEGER DEFAULT 0,
  search_clicks INTEGER DEFAULT 0,
  
  analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blog_auto_generation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_topic_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_generation_queue ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_model_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_content_analysis ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_auto_generation_settings
DROP POLICY IF EXISTS "Root admins can manage auto-generation settings" ON public.blog_auto_generation_settings;
CREATE POLICY "Root admins can manage auto-generation settings" 
ON public.blog_auto_generation_settings 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- RLS Policies for blog_topic_history
DROP POLICY IF EXISTS "Root admins can view topic history" ON public.blog_topic_history;
CREATE POLICY "Root admins can view topic history" 
ON public.blog_topic_history 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- RLS Policies for blog_generation_queue
DROP POLICY IF EXISTS "Root admins can manage generation queue" ON public.blog_generation_queue;
CREATE POLICY "Root admins can manage generation queue" 
ON public.blog_generation_queue 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- RLS Policies for ai_model_configurations
DROP POLICY IF EXISTS "Root admins can manage AI model configurations" ON public.ai_model_configurations;
CREATE POLICY "Root admins can manage AI model configurations" 
ON public.ai_model_configurations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- RLS Policies for blog_content_analysis
DROP POLICY IF EXISTS "Root admins can view content analysis" ON public.blog_content_analysis;
CREATE POLICY "Root admins can view content analysis" 
ON public.blog_content_analysis 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_blog_auto_gen_settings_company ON public.blog_auto_generation_settings(company_id);
CREATE INDEX IF NOT EXISTS idx_blog_topic_history_company ON public.blog_topic_history(company_id);
CREATE INDEX IF NOT EXISTS idx_blog_topic_history_created_at ON public.blog_topic_history(created_at);
CREATE INDEX IF NOT EXISTS idx_blog_generation_queue_scheduled_for ON public.blog_generation_queue(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_blog_generation_queue_status ON public.blog_generation_queue(status);
CREATE INDEX IF NOT EXISTS idx_blog_generation_queue_company ON public.blog_generation_queue(company_id);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_provider ON public.ai_model_configurations(provider);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_active ON public.ai_model_configurations(is_active);
CREATE INDEX IF NOT EXISTS idx_blog_content_analysis_blog_post ON public.blog_content_analysis(blog_post_id);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for timestamp updates
DROP TRIGGER IF EXISTS update_blog_auto_generation_settings_updated_at ON public.blog_auto_generation_settings;
CREATE TRIGGER update_blog_auto_generation_settings_updated_at
BEFORE UPDATE ON public.blog_auto_generation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_blog_generation_queue_updated_at ON public.blog_generation_queue;
CREATE TRIGGER update_blog_generation_queue_updated_at
BEFORE UPDATE ON public.blog_generation_queue
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_ai_model_configurations_updated_at ON public.ai_model_configurations;
CREATE TRIGGER update_ai_model_configurations_updated_at
BEFORE UPDATE ON public.ai_model_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI model configurations
INSERT INTO public.ai_model_configurations (provider, model_name, model_display_name, model_family, max_tokens, context_window, speed_rating, quality_rating, cost_rating, recommended_for_blog, good_for_seo, good_for_long_form, is_active, is_default, requires_api_key, description) 
VALUES
-- Claude models
('claude', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'claude-3', 8192, 200000, 7, 10, 8, true, true, true, true, true, 'CLAUDE_API_KEY', 'Most capable model for complex reasoning and writing'),
('claude', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'claude-3', 8192, 200000, 10, 8, 3, true, true, true, true, false, 'CLAUDE_API_KEY', 'Fast and efficient for routine content generation'),
('claude', 'claude-3-opus-20240229', 'Claude 3 Opus', 'claude-3', 4096, 200000, 5, 10, 10, true, true, true, true, false, 'CLAUDE_API_KEY', 'Most powerful model for highest quality content'),

-- OpenAI models
('openai', 'gpt-4o', 'GPT-4o', 'gpt-4', 4096, 128000, 8, 9, 7, true, true, true, true, false, 'OPENAI_API_KEY', 'Latest multimodal GPT-4 model'),
('openai', 'gpt-4o-mini', 'GPT-4o Mini', 'gpt-4', 16384, 128000, 10, 7, 2, true, true, true, true, false, 'OPENAI_API_KEY', 'Efficient and cost-effective for content generation'),
('openai', 'gpt-4-turbo', 'GPT-4 Turbo', 'gpt-4', 4096, 128000, 7, 9, 6, true, true, true, true, false, 'OPENAI_API_KEY', 'Enhanced GPT-4 with improved performance'),

-- Gemini models  
('gemini', 'gemini-1.5-pro', 'Gemini 1.5 Pro', 'gemini-1.5', 8192, 1000000, 6, 8, 5, true, true, true, true, false, 'GEMINI_API_KEY', 'Google''s most capable model with massive context'),
('gemini', 'gemini-1.5-flash', 'Gemini 1.5 Flash', 'gemini-1.5', 8192, 1000000, 9, 7, 3, true, true, true, true, false, 'GEMINI_API_KEY', 'Fast and efficient Gemini model')
ON CONFLICT DO NOTHING;

-- Create function to calculate next generation time
CREATE OR REPLACE FUNCTION public.calculate_next_generation_time(
  frequency TEXT,
  generation_time TIME,
  timezone TEXT DEFAULT 'America/New_York'
)
RETURNS TIMESTAMP WITH TIME ZONE
LANGUAGE plpgsql
AS $$
DECLARE
  next_time TIMESTAMP WITH TIME ZONE;
  current_time_tz TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get current time in specified timezone
  current_time_tz := now() AT TIME ZONE timezone;
  
  -- Calculate next generation time based on frequency
  CASE frequency
    WHEN 'daily' THEN
      next_time := (date_trunc('day', current_time_tz) + interval '1 day' + generation_time) AT TIME ZONE timezone;
    WHEN 'weekly' THEN
      next_time := (date_trunc('week', current_time_tz) + interval '1 week' + generation_time) AT TIME ZONE timezone;
    WHEN 'biweekly' THEN
      next_time := (date_trunc('week', current_time_tz) + interval '2 weeks' + generation_time) AT TIME ZONE timezone;
    WHEN 'monthly' THEN
      next_time := (date_trunc('month', current_time_tz) + interval '1 month' + generation_time) AT TIME ZONE timezone;
    ELSE
      next_time := (date_trunc('day', current_time_tz) + interval '1 week' + generation_time) AT TIME ZONE timezone;
  END CASE;
  
  -- If the calculated time is in the past, add another interval
  IF next_time <= current_time_tz THEN
    CASE frequency
      WHEN 'daily' THEN
        next_time := next_time + interval '1 day';
      WHEN 'weekly' THEN
        next_time := next_time + interval '1 week';
      WHEN 'biweekly' THEN
        next_time := next_time + interval '2 weeks';
      WHEN 'monthly' THEN
        next_time := next_time + interval '1 month';
    END CASE;
  END IF;
  
  RETURN next_time;
END;
$$;

-- Create function to queue next generation
CREATE OR REPLACE FUNCTION public.queue_next_blog_generation(company_id_param UUID)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  settings_record RECORD;
  next_generation_time TIMESTAMP WITH TIME ZONE;
BEGIN
  -- Get auto-generation settings
  SELECT * INTO settings_record
  FROM public.blog_auto_generation_settings
  WHERE company_id = company_id_param AND is_enabled = true;
  
  IF settings_record IS NOT NULL THEN
    -- Calculate next generation time
    next_generation_time := public.calculate_next_generation_time(
      settings_record.generation_frequency,
      settings_record.generation_time,
      settings_record.generation_timezone
    );
    
    -- Update settings with next generation time
    UPDATE public.blog_auto_generation_settings
    SET next_generation_at = next_generation_time,
        updated_at = now()
    WHERE id = settings_record.id;
    
    -- Add to generation queue
    INSERT INTO public.blog_generation_queue (
      company_id,
      scheduled_for,
      ai_provider,
      ai_model,
      generation_type
    ) VALUES (
      company_id_param,
      next_generation_time,
      settings_record.preferred_ai_provider,
      settings_record.preferred_model,
      'scheduled'
    );
  END IF;
END;
$$;

-- Success message
SELECT 'AI Blog Auto-Generation System setup completed successfully!' as setup_status; 