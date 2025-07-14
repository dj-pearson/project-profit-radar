-- Create knowledge base tables for articles, guides, and checklists

-- Knowledge base categories table
CREATE TABLE public.knowledge_base_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  slug TEXT UNIQUE NOT NULL,
  icon TEXT, -- lucide icon name
  sort_order INTEGER DEFAULT 0,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge base articles table
CREATE TABLE public.knowledge_base_articles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  content TEXT NOT NULL,
  excerpt TEXT,
  article_type TEXT NOT NULL DEFAULT 'article', -- 'article', 'how_to', 'checklist', 'video'
  category_id UUID REFERENCES public.knowledge_base_categories(id) ON DELETE SET NULL,
  author_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  featured_image_url TEXT,
  difficulty_level TEXT DEFAULT 'beginner', -- 'beginner', 'intermediate', 'advanced'
  estimated_read_time INTEGER, -- in minutes
  view_count INTEGER DEFAULT 0,
  is_published BOOLEAN DEFAULT false,
  is_featured BOOLEAN DEFAULT false,
  tags TEXT[] DEFAULT '{}',
  meta_title TEXT,
  meta_description TEXT,
  sort_order INTEGER DEFAULT 0,
  published_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge base search index for full-text search
CREATE INDEX idx_kb_articles_search ON public.knowledge_base_articles 
USING gin(to_tsvector('english', title || ' ' || content || ' ' || COALESCE(excerpt, '')));

-- Knowledge base article views tracking
CREATE TABLE public.knowledge_base_views (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.knowledge_base_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  ip_address INET,
  user_agent TEXT,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Knowledge base feedback/ratings
CREATE TABLE public.knowledge_base_feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  article_id UUID NOT NULL REFERENCES public.knowledge_base_articles(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
  rating INTEGER CHECK (rating >= 1 AND rating <= 5),
  feedback_text TEXT,
  is_helpful BOOLEAN,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create updated_at triggers
CREATE TRIGGER update_kb_categories_updated_at
  BEFORE UPDATE ON public.knowledge_base_categories
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_articles_updated_at
  BEFORE UPDATE ON public.knowledge_base_articles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_kb_feedback_updated_at
  BEFORE UPDATE ON public.knowledge_base_feedback
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- RLS Policies for knowledge base
ALTER TABLE public.knowledge_base_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_base_feedback ENABLE ROW LEVEL SECURITY;

-- Categories policies
CREATE POLICY "Anyone can view active categories" ON public.knowledge_base_categories
  FOR SELECT USING (is_active = true);

CREATE POLICY "Root admins can manage categories" ON public.knowledge_base_categories
  FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

-- Articles policies  
CREATE POLICY "Anyone can view published articles" ON public.knowledge_base_articles
  FOR SELECT USING (is_published = true);

CREATE POLICY "Root admins can manage all articles" ON public.knowledge_base_articles
  FOR ALL USING (get_user_role(auth.uid()) = 'root_admin');

-- Views policies
CREATE POLICY "Anyone can insert article views" ON public.knowledge_base_views
  FOR INSERT WITH CHECK (true);

CREATE POLICY "Users can view their own article views" ON public.knowledge_base_views
  FOR SELECT USING (user_id = auth.uid() OR user_id IS NULL);

CREATE POLICY "Root admins can view all article views" ON public.knowledge_base_views
  FOR SELECT USING (get_user_role(auth.uid()) = 'root_admin');

-- Feedback policies
CREATE POLICY "Authenticated users can manage their own feedback" ON public.knowledge_base_feedback
  FOR ALL USING (auth.uid() IS NOT NULL AND (user_id = auth.uid() OR user_id IS NULL));

CREATE POLICY "Root admins can view all feedback" ON public.knowledge_base_feedback
  FOR SELECT USING (get_user_role(auth.uid()) = 'root_admin');

-- Insert default categories
INSERT INTO public.knowledge_base_categories (name, description, slug, icon, sort_order) VALUES
('Getting Started', 'Essential guides for new users', 'getting-started', 'Rocket', 1),
('Project Management', 'Learn how to manage construction projects effectively', 'project-management', 'FolderKanban', 2),
('Financial Management', 'Understanding budgets, costs, and financial tracking', 'financial-management', 'DollarSign', 3),
('Safety & Compliance', 'Safety protocols and regulatory compliance', 'safety-compliance', 'Shield', 4),
('Mobile App', 'Using the mobile application in the field', 'mobile-app', 'Smartphone', 5),
('Integrations', 'Connect with QuickBooks, calendars, and other tools', 'integrations', 'Plug', 6),
('Troubleshooting', 'Common issues and solutions', 'troubleshooting', 'AlertCircle', 7),
('Best Practices', 'Industry tips and recommended workflows', 'best-practices', 'Star', 8);

-- Function to increment view count
CREATE OR REPLACE FUNCTION public.increment_article_view_count(article_id_param UUID, user_id_param UUID DEFAULT NULL, ip_address_param INET DEFAULT NULL, user_agent_param TEXT DEFAULT NULL)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Insert view record
  INSERT INTO public.knowledge_base_views (article_id, user_id, ip_address, user_agent)
  VALUES (article_id_param, user_id_param, ip_address_param, user_agent_param);
  
  -- Update view count
  UPDATE public.knowledge_base_articles 
  SET view_count = view_count + 1 
  WHERE id = article_id_param;
END;
$$;