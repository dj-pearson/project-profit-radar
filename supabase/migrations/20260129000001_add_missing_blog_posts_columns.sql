-- Add missing columns to blog_posts table for AI blog generation
-- These columns are needed by the enhanced-blog-ai-fixed edge function

-- Add company_id column (for multi-tenant support)
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS company_id UUID REFERENCES public.companies(id) ON DELETE CASCADE;

-- Add content column (AI uses 'content', table has 'body')
-- We'll keep both for backwards compatibility, content will be the new standard
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS content TEXT;

-- Add queue_id for tracking which generation queue item created this post
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS queue_id UUID REFERENCES public.blog_generation_queue(id) ON DELETE SET NULL;

-- Add keywords array for SEO
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS keywords TEXT[] DEFAULT '{}';

-- Add estimated read time
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS estimated_read_time INTEGER DEFAULT 5;

-- Add topic that was used to generate the post
ALTER TABLE public.blog_posts
ADD COLUMN IF NOT EXISTS topic TEXT;

-- Make created_by nullable for automated generation (no user involved)
ALTER TABLE public.blog_posts
ALTER COLUMN created_by DROP NOT NULL;

-- Create trigger to sync content and body columns
CREATE OR REPLACE FUNCTION sync_blog_content_body()
RETURNS TRIGGER AS $$
BEGIN
  -- If content is set but body is not, copy content to body
  IF NEW.content IS NOT NULL AND (NEW.body IS NULL OR NEW.body = '') THEN
    NEW.body := NEW.content;
  END IF;
  -- If body is set but content is not, copy body to content
  IF NEW.body IS NOT NULL AND (NEW.content IS NULL OR NEW.content = '') THEN
    NEW.content := NEW.body;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS sync_blog_content_body_trigger ON public.blog_posts;
CREATE TRIGGER sync_blog_content_body_trigger
BEFORE INSERT OR UPDATE ON public.blog_posts
FOR EACH ROW
EXECUTE FUNCTION sync_blog_content_body();

-- Create index for company_id
CREATE INDEX IF NOT EXISTS idx_blog_posts_company_id ON public.blog_posts(company_id);

-- Create index for queue_id
CREATE INDEX IF NOT EXISTS idx_blog_posts_queue_id ON public.blog_posts(queue_id);

-- Note: Service role key bypasses RLS automatically in Supabase
-- The edge function uses SUPABASE_SERVICE_ROLE_KEY which has full access
