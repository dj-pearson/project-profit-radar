-- Create automated_social_posts_config table if it doesn't exist with all required columns
CREATE TABLE IF NOT EXISTS public.automated_social_posts_config (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID NOT NULL,
  enabled BOOLEAN DEFAULT FALSE,
  auto_schedule BOOLEAN DEFAULT TRUE,
  webhook_url TEXT,
  blog_webhook_url TEXT,
  platforms JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add missing columns if they don't exist
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automated_social_posts_config' AND column_name='blog_webhook_url') THEN
        ALTER TABLE public.automated_social_posts_config ADD COLUMN blog_webhook_url TEXT;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automated_social_posts_config' AND column_name='enabled') THEN
        ALTER TABLE public.automated_social_posts_config ADD COLUMN enabled BOOLEAN DEFAULT FALSE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automated_social_posts_config' AND column_name='auto_schedule') THEN
        ALTER TABLE public.automated_social_posts_config ADD COLUMN auto_schedule BOOLEAN DEFAULT TRUE;
    END IF;
    
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='automated_social_posts_config' AND column_name='platforms') THEN
        ALTER TABLE public.automated_social_posts_config ADD COLUMN platforms JSONB DEFAULT '[]'::jsonb;
    END IF;
END $$;

-- Enable RLS
ALTER TABLE public.automated_social_posts_config ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
DROP POLICY IF EXISTS "Users can view their company config" ON public.automated_social_posts_config;
DROP POLICY IF EXISTS "Users can update their company config" ON public.automated_social_posts_config;
DROP POLICY IF EXISTS "Users can insert their company config" ON public.automated_social_posts_config;

CREATE POLICY "Users can view their company config" 
ON public.automated_social_posts_config 
FOR SELECT 
USING (
  company_id IN (
    SELECT company_id 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update their company config" 
ON public.automated_social_posts_config 
FOR UPDATE 
USING (
  company_id IN (
    SELECT company_id 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert their company config" 
ON public.automated_social_posts_config 
FOR INSERT 
WITH CHECK (
  company_id IN (
    SELECT company_id 
    FROM public.user_profiles 
    WHERE user_id = auth.uid()
  )
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_automated_social_posts_config_company_id 
ON public.automated_social_posts_config(company_id);