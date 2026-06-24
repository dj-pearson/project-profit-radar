-- Create table for storing SEO OAuth tokens
CREATE TABLE IF NOT EXISTS public.seo_oauth_tokens (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL UNIQUE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.seo_oauth_tokens ENABLE ROW LEVEL SECURITY;

-- Create policies for SEO OAuth tokens
CREATE POLICY "Root admins can manage SEO OAuth tokens" 
ON public.seo_oauth_tokens 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 FROM public.user_profiles 
    WHERE id = auth.uid() 
    AND role = 'root_admin'
  )
);

-- Add updated_at trigger
CREATE TRIGGER update_seo_oauth_tokens_updated_at
  BEFORE UPDATE ON public.seo_oauth_tokens
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();