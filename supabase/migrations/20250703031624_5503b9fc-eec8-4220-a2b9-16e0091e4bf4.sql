-- Create blog posts table
CREATE TABLE public.blog_posts (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  body TEXT NOT NULL,
  excerpt TEXT,
  featured_image_url TEXT,
  seo_title TEXT,
  seo_description TEXT,
  status TEXT NOT NULL DEFAULT 'draft',
  published_at TIMESTAMP WITH TIME ZONE,
  created_by UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create AI settings table for global configuration
CREATE TABLE public.ai_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  provider TEXT NOT NULL, -- 'openai', 'claude', 'gemini'
  api_key_name TEXT NOT NULL, -- name of the secret in supabase
  model TEXT NOT NULL,
  global_instructions TEXT,
  blog_instructions TEXT,
  is_active BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.blog_posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies for blog_posts
CREATE POLICY "Anyone can view published blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (status = 'published');

CREATE POLICY "Root admins can manage all blog posts" 
ON public.blog_posts 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- RLS Policies for ai_settings
CREATE POLICY "Root admins can manage AI settings" 
ON public.ai_settings 
FOR ALL 
USING (get_user_role(auth.uid()) = 'root_admin');

-- Create function to update timestamps
CREATE TRIGGER update_blog_posts_updated_at
BEFORE UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_ai_settings_updated_at
BEFORE UPDATE ON public.ai_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- Insert default AI settings
INSERT INTO public.ai_settings (provider, api_key_name, model, global_instructions, blog_instructions, is_active) VALUES
('openai', 'OPENAI_API_KEY', 'gpt-4o-mini', 'You are a professional content writer for a construction management platform.', 'Write engaging blog articles about construction industry trends, project management best practices, and technology solutions. Keep a professional yet accessible tone.', true),
('claude', 'CLAUDE_API_KEY', 'claude-3-5-haiku-20241022', 'You are a professional content writer for a construction management platform.', 'Write engaging blog articles about construction industry trends, project management best practices, and technology solutions. Keep a professional yet accessible tone.', false),
('gemini', 'GEMINI_API_KEY', 'gemini-pro', 'You are a professional content writer for a construction management platform.', 'Write engaging blog articles about construction industry trends, project management best practices, and technology solutions. Keep a professional yet accessible tone.', false);