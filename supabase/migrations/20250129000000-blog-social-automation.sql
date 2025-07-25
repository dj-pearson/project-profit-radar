-- Blog Social Media Automation Migration
-- Add automation settings and link social posts to blog posts

-- Create social media automation settings table
CREATE TABLE public.social_media_automation_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  is_active BOOLEAN DEFAULT true,
  auto_post_on_publish BOOLEAN DEFAULT false,
  webhook_url TEXT, -- For Make.com or other external automation
  webhook_secret TEXT, -- For webhook security
  ai_content_generation BOOLEAN DEFAULT true,
  platforms_enabled JSONB DEFAULT '["linkedin", "twitter", "facebook", "instagram"]',
  posting_schedule JSONB DEFAULT '{}', -- Platform-specific scheduling rules
  content_templates JSONB DEFAULT '{}', -- Platform-specific content templates
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES auth.users(id),
  UNIQUE(company_id)
);

-- Add blog_post_id to social_media_posts if it doesn't exist
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'social_media_posts' 
    AND column_name = 'blog_post_id'
  ) THEN
    ALTER TABLE public.social_media_posts 
    ADD COLUMN blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE SET NULL;
  END IF;
END $$;

-- Create social media automation logs table
CREATE TABLE public.social_media_automation_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  blog_post_id UUID REFERENCES public.blog_posts(id) ON DELETE CASCADE,
  trigger_type TEXT NOT NULL, -- 'manual', 'auto_publish', 'scheduled'
  platforms_processed JSONB NOT NULL DEFAULT '[]',
  posts_created INTEGER DEFAULT 0,
  webhook_sent BOOLEAN DEFAULT false,
  webhook_response JSONB DEFAULT '{}',
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'processing', 'completed', 'failed'
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.social_media_automation_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.social_media_automation_logs ENABLE ROW LEVEL SECURITY;

-- RLS Policies for social_media_automation_settings
CREATE POLICY "Company members can view automation settings" 
ON public.social_media_automation_settings 
FOR SELECT 
USING (company_id IN (
  SELECT company_id FROM public.user_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "Admins can manage automation settings" 
ON public.social_media_automation_settings 
FOR ALL 
USING (
  company_id IN (
    SELECT company_id FROM public.user_profiles 
    WHERE user_id = auth.uid() 
    AND role IN ('admin', 'owner')
  ) OR get_user_role(auth.uid()) = 'root_admin'
);

-- RLS Policies for social_media_automation_logs
CREATE POLICY "Company members can view automation logs" 
ON public.social_media_automation_logs 
FOR SELECT 
USING (company_id IN (
  SELECT company_id FROM public.user_profiles 
  WHERE user_id = auth.uid()
));

CREATE POLICY "System can insert automation logs" 
ON public.social_media_automation_logs 
FOR INSERT 
WITH CHECK (true);

-- Update triggers
CREATE TRIGGER update_social_media_automation_settings_updated_at
BEFORE UPDATE ON public.social_media_automation_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_social_media_automation_logs_updated_at
BEFORE UPDATE ON public.social_media_automation_logs
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Create index for performance
CREATE INDEX idx_social_automation_settings_company ON public.social_media_automation_settings(company_id);
CREATE INDEX idx_social_automation_logs_blog_post ON public.social_media_automation_logs(blog_post_id);
CREATE INDEX idx_social_posts_blog_post ON public.social_media_posts(blog_post_id) WHERE blog_post_id IS NOT NULL; 