-- Social Media Automation Database Schema (Fixed)
-- Create enum for social media platforms
CREATE TYPE public.social_platform AS ENUM (
  'linkedin',
  'facebook', 
  'instagram',
  'twitter',
  'threads',
  'buffer',
  'hootsuite'
);

-- Create enum for post status
CREATE TYPE public.post_status AS ENUM (
  'draft',
  'scheduled',
  'published',
  'failed',
  'cancelled'
);

-- Create enum for content type
CREATE TYPE public.content_type AS ENUM (
  'text',
  'image',
  'video',
  'carousel',
  'article'
);

-- Social media accounts table
CREATE TABLE public.social_media_accounts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  account_name TEXT NOT NULL,
  account_id TEXT, -- Platform-specific account ID
  access_token TEXT, -- Encrypted access token
  refresh_token TEXT, -- Encrypted refresh token
  token_expires_at TIMESTAMPTZ,
  is_active BOOLEAN DEFAULT true,
  account_metadata JSONB DEFAULT '{}', -- Platform-specific settings
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id, platform, account_id)
);

-- Social media posts table
CREATE TABLE public.social_media_posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  content_type public.content_type DEFAULT 'text',
  media_urls JSONB DEFAULT '[]', -- Array of media file URLs
  platforms JSONB NOT NULL DEFAULT '[]', -- Array of platform configurations
  scheduled_for TIMESTAMPTZ,
  published_at TIMESTAMPTZ,
  status public.post_status DEFAULT 'draft',
  post_metadata JSONB DEFAULT '{}', -- Platform-specific IDs, analytics, etc.
  template_id UUID, -- Reference to content template
  project_id UUID REFERENCES public.projects(id), -- Optional project association
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Platform-specific post results
CREATE TABLE public.social_media_post_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES public.social_media_posts(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  platform_post_id TEXT, -- Platform's unique post ID
  status public.post_status NOT NULL,
  error_message TEXT,
  engagement_data JSONB DEFAULT '{}', -- Likes, shares, comments, etc.
  published_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Content templates for reusable posts
CREATE TABLE public.social_media_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  content TEXT NOT NULL,
  content_type public.content_type DEFAULT 'text',
  default_platforms JSONB DEFAULT '[]', -- Default platforms for this template
  template_variables JSONB DEFAULT '[]', -- Variables to be replaced (e.g., {project_name})
  category TEXT, -- e.g., "project_completion", "company_update", "industry_news"
  is_active BOOLEAN DEFAULT true,
  usage_count INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id)
);

-- Platform configuration and constraints
CREATE TABLE public.social_platform_configs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform public.social_platform NOT NULL UNIQUE,
  max_text_length INTEGER,
  supports_images BOOLEAN DEFAULT false,
  supports_videos BOOLEAN DEFAULT false,
  supports_scheduling BOOLEAN DEFAULT false,
  image_requirements JSONB DEFAULT '{}', -- Size, format constraints
  video_requirements JSONB DEFAULT '{}', -- Size, duration, format constraints
  api_endpoints JSONB DEFAULT '{}', -- API configuration
  rate_limits JSONB DEFAULT '{}', -- Rate limiting info
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Social media analytics (fixed primary key issue)
CREATE TABLE public.social_media_analytics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  platform public.social_platform NOT NULL,
  account_id UUID NOT NULL REFERENCES public.social_media_accounts(id) ON DELETE CASCADE,
  metric_date DATE NOT NULL,
  followers_count INTEGER DEFAULT 0,
  posts_count INTEGER DEFAULT 0,
  total_engagement INTEGER DEFAULT 0,
  total_reach INTEGER DEFAULT 0,
  total_impressions INTEGER DEFAULT 0,
  metrics_data JSONB DEFAULT '{}', -- Additional platform-specific metrics
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(account_id, metric_date)
);

-- Enable RLS on all tables
ALTER TABLE public.social_media_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_post_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_platform_configs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_analytics ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_accounts
CREATE POLICY "Users can view their company's social media accounts"
ON public.social_media_accounts FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage their company's social media accounts"
ON public.social_media_accounts FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'root_admin')
  )
);

-- RLS Policies for social_media_posts
CREATE POLICY "Users can view their company's social media posts"
ON public.social_media_posts FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Users can manage their company's social media posts"
ON public.social_media_posts FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'root_admin', 'project_manager')
  )
);

-- RLS Policies for social_media_post_results
CREATE POLICY "Users can view their company's post results"
ON public.social_media_post_results FOR SELECT
TO authenticated
USING (
  post_id IN (
    SELECT id FROM public.social_media_posts 
    WHERE company_id IN (
      SELECT company_id FROM public.user_profiles 
      WHERE id = auth.uid()
    )
  )
);

-- RLS Policies for social_media_templates
CREATE POLICY "Users can view their company's templates"
ON public.social_media_templates FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

CREATE POLICY "Admins can manage their company's templates"
ON public.social_media_templates FOR ALL
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role IN ('admin', 'root_admin')
  )
);

-- RLS Policies for social_platform_configs (global read access)
CREATE POLICY "All authenticated users can view platform configs"
ON public.social_platform_configs FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Only root admins can manage platform configs"
ON public.social_platform_configs FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() AND role = 'root_admin'
  )
);

-- RLS Policies for social_media_analytics
CREATE POLICY "Users can view their company's analytics"
ON public.social_media_analytics FOR SELECT
TO authenticated
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE id = auth.uid()
  )
);

-- Insert default platform configurations
INSERT INTO public.social_platform_configs (
  platform, max_text_length, supports_images, supports_videos, supports_scheduling,
  image_requirements, video_requirements, rate_limits
) VALUES
(
  'linkedin', 3000, true, true, true,
  '{"max_size_mb": 100, "formats": ["JPG", "PNG", "GIF"], "max_width": 7680, "max_height": 4320}',
  '{"max_size_mb": 5120, "max_duration_seconds": 600, "formats": ["MP4", "MOV", "AVI"]}',
  '{"posts_per_day": 25, "requests_per_hour": 500}'
),
(
  'facebook', 63206, true, true, true,
  '{"max_size_mb": 4, "formats": ["JPG", "PNG", "GIF", "BMP", "TIFF"], "min_width": 600}',
  '{"max_size_mb": 10240, "max_duration_seconds": 240, "formats": ["MP4", "MOV"]}',
  '{"posts_per_hour": 25, "requests_per_hour": 600}'
),
(
  'instagram', 2200, true, true, true,
  '{"max_size_mb": 30, "formats": ["JPG", "PNG"], "aspect_ratios": ["1:1", "4:5", "16:9"]}',
  '{"max_size_mb": 100, "max_duration_seconds": 60, "formats": ["MP4", "MOV"]}',
  '{"posts_per_hour": 25, "requests_per_hour": 200}'
),
(
  'twitter', 280, true, true, true,
  '{"max_size_mb": 5, "formats": ["JPG", "PNG", "GIF", "WEBP"], "max_photos": 4}',
  '{"max_size_mb": 512, "max_duration_seconds": 140, "formats": ["MP4", "MOV"]}',
  '{"posts_per_15min": 50, "requests_per_hour": 1500}'
),
(
  'buffer', null, true, true, true,
  '{}', '{}', '{"requests_per_minute": 60}'
);

-- Create updated_at triggers
CREATE TRIGGER update_social_media_accounts_updated_at
  BEFORE UPDATE ON public.social_media_accounts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_posts_updated_at
  BEFORE UPDATE ON public.social_media_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_post_results_updated_at
  BEFORE UPDATE ON public.social_media_post_results
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_templates_updated_at
  BEFORE UPDATE ON public.social_media_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_platform_configs_updated_at
  BEFORE UPDATE ON public.social_platform_configs
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for performance
CREATE INDEX idx_social_media_accounts_company_platform ON public.social_media_accounts(company_id, platform);
CREATE INDEX idx_social_media_posts_company_status ON public.social_media_posts(company_id, status);
CREATE INDEX idx_social_media_posts_scheduled ON public.social_media_posts(scheduled_for) WHERE status = 'scheduled';
CREATE INDEX idx_social_media_post_results_post_platform ON public.social_media_post_results(post_id, platform);
CREATE INDEX idx_social_media_templates_company_category ON public.social_media_templates(company_id, category);
CREATE INDEX idx_social_media_analytics_account_date ON public.social_media_analytics(account_id, metric_date);

-- Function to validate post content for platform constraints
CREATE OR REPLACE FUNCTION public.validate_post_for_platform(
  p_content TEXT,
  p_platform public.social_platform,
  p_media_urls JSONB DEFAULT '[]'
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  platform_config RECORD;
  validation_result JSONB := '{"valid": true, "errors": [], "warnings": []}';
  errors JSONB := '[]';
  warnings JSONB := '[]';
  media_count INTEGER;
BEGIN
  -- Get platform configuration
  SELECT * INTO platform_config
  FROM public.social_platform_configs
  WHERE platform = p_platform AND is_active = true;
  
  IF NOT FOUND THEN
    errors := errors || jsonb_build_array('Platform configuration not found');
    RETURN jsonb_build_object('valid', false, 'errors', errors, 'warnings', warnings);
  END IF;
  
  -- Validate text length
  IF platform_config.max_text_length IS NOT NULL AND LENGTH(p_content) > platform_config.max_text_length THEN
    errors := errors || jsonb_build_array(
      'Content exceeds maximum length of ' || platform_config.max_text_length || ' characters'
    );
  END IF;
  
  -- Validate media requirements
  media_count := jsonb_array_length(p_media_urls);
  
  IF media_count > 0 THEN
    IF NOT platform_config.supports_images AND NOT platform_config.supports_videos THEN
      errors := errors || jsonb_build_array('Platform does not support media uploads');
    END IF;
    
    -- Platform-specific media validation
    IF p_platform = 'instagram' AND media_count = 0 THEN
      warnings := warnings || jsonb_build_array('Instagram posts typically perform better with images');
    END IF;
    
    IF p_platform = 'twitter' AND media_count > 4 THEN
      errors := errors || jsonb_build_array('Twitter supports maximum 4 images per post');
    END IF;
  END IF;
  
  -- Build result
  validation_result := jsonb_build_object(
    'valid', jsonb_array_length(errors) = 0,
    'errors', errors,
    'warnings', warnings,
    'character_count', LENGTH(p_content),
    'max_characters', platform_config.max_text_length,
    'media_count', media_count
  );
  
  RETURN validation_result;
END;
$$;