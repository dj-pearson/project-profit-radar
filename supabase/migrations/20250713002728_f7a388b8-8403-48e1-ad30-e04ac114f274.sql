-- Create SEO analytics tables if they don't exist
CREATE TABLE IF NOT EXISTS public.seo_analytics (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  search_engine TEXT NOT NULL,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  ctr DECIMAL(5,2) DEFAULT 0,
  average_position DECIMAL(5,2) DEFAULT 0,
  top_queries JSONB DEFAULT '[]'::jsonb,
  top_pages JSONB DEFAULT '[]'::jsonb,
  device_breakdown JSONB DEFAULT '{}'::jsonb,
  country_breakdown JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, search_engine)
);

CREATE TABLE IF NOT EXISTS public.seo_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  search_engine TEXT NOT NULL,
  submission_type TEXT NOT NULL,
  url TEXT NOT NULL,
  status TEXT DEFAULT 'pending',
  submitted_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  last_checked TIMESTAMP WITH TIME ZONE,
  response_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.seo_ai_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  analysis_date DATE NOT NULL,
  insights JSONB NOT NULL,
  recommendations JSONB NOT NULL,
  traffic_analysis JSONB DEFAULT '{}'::jsonb,
  competitor_analysis JSONB DEFAULT '{}'::jsonb,
  action_plan JSONB DEFAULT '{}'::jsonb,
  generated_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on new tables
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seo_analytics' AND policyname = 'Root admins can manage SEO analytics') THEN
    ALTER TABLE public.seo_analytics ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Root admins can manage SEO analytics" ON public.seo_analytics
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles 
          WHERE id = auth.uid() AND role = 'root_admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seo_submissions' AND policyname = 'Root admins can manage SEO submissions') THEN
    ALTER TABLE public.seo_submissions ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Root admins can manage SEO submissions" ON public.seo_submissions
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles 
          WHERE id = auth.uid() AND role = 'root_admin'
        )
      );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'seo_ai_insights' AND policyname = 'Root admins can manage SEO AI insights') THEN
    ALTER TABLE public.seo_ai_insights ENABLE ROW LEVEL SECURITY;
    CREATE POLICY "Root admins can manage SEO AI insights" ON public.seo_ai_insights
      FOR ALL USING (
        EXISTS (
          SELECT 1 FROM public.user_profiles 
          WHERE id = auth.uid() AND role = 'root_admin'
        )
      );
  END IF;
END $$;