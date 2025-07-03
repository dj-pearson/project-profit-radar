-- Create SEO management tables
CREATE TABLE public.seo_configurations (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  site_name TEXT NOT NULL,
  site_description TEXT,
  site_keywords TEXT[],
  default_og_image TEXT,
  google_analytics_id TEXT,
  google_search_console_id TEXT,
  bing_webmaster_id TEXT,
  yandex_webmaster_id TEXT,
  google_ads_id TEXT,
  facebook_pixel_id TEXT,
  twitter_site TEXT,
  canonical_domain TEXT,
  robots_txt TEXT,
  sitemap_enabled BOOLEAN DEFAULT true,
  schema_org_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create meta tags table for page-specific SEO
CREATE TABLE public.seo_meta_tags (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  page_path TEXT NOT NULL,
  title TEXT,
  description TEXT,
  keywords TEXT[],
  og_title TEXT,
  og_description TEXT,
  og_image TEXT,
  og_type TEXT DEFAULT 'website',
  twitter_title TEXT,
  twitter_description TEXT,
  twitter_image TEXT,
  canonical_url TEXT,
  no_index BOOLEAN DEFAULT false,
  no_follow BOOLEAN DEFAULT false,
  schema_markup JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(page_path)
);

-- Create search engine submissions tracking
CREATE TABLE public.seo_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_engine TEXT NOT NULL,
  submission_type TEXT NOT NULL, -- 'sitemap', 'url', 'verification'
  url TEXT,
  status TEXT NOT NULL DEFAULT 'pending', -- 'pending', 'submitted', 'indexed', 'error'
  response_data JSONB,
  submitted_at TIMESTAMP WITH TIME ZONE,
  last_checked TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create SEO analytics table
CREATE TABLE public.seo_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  search_engine TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  average_position DECIMAL,
  ctr DECIMAL,
  top_queries JSONB,
  top_pages JSONB,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, search_engine)
);

-- Enable RLS
ALTER TABLE public.seo_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_meta_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.seo_analytics ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for root admin only access
CREATE POLICY "Root admins can manage SEO configurations" 
ON public.seo_configurations 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can manage meta tags" 
ON public.seo_meta_tags 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can manage submissions" 
ON public.seo_submissions 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

CREATE POLICY "Root admins can view analytics" 
ON public.seo_analytics 
FOR SELECT 
USING (get_user_role(auth.uid()) = 'root_admin'::user_role);

-- Create updated_at triggers
CREATE TRIGGER update_seo_configurations_updated_at
BEFORE UPDATE ON public.seo_configurations
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_meta_tags_updated_at
BEFORE UPDATE ON public.seo_meta_tags
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_seo_submissions_updated_at
BEFORE UPDATE ON public.seo_submissions
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();