-- Add scheduling functionality to blog posts
-- This allows users to schedule posts to be published at a specific date/time

-- Add scheduled_at column to blog_posts table
ALTER TABLE public.blog_posts 
ADD COLUMN scheduled_at TIMESTAMP WITH TIME ZONE;

-- Add a scheduled status to the existing status options
-- We'll use 'scheduled' as a new status value

-- Create index for efficient querying of scheduled posts
CREATE INDEX idx_blog_posts_scheduled_at ON public.blog_posts(scheduled_at);
CREATE INDEX idx_blog_posts_status_scheduled ON public.blog_posts(status, scheduled_at);

-- Create a function to automatically publish scheduled posts
CREATE OR REPLACE FUNCTION public.publish_scheduled_blog_posts()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER SET search_path = ''
AS $$
DECLARE
  published_count INTEGER := 0;
BEGIN
  -- Update scheduled posts that are due to be published
  UPDATE public.blog_posts 
  SET 
    status = 'published',
    published_at = now(),
    updated_at = now()
  WHERE 
    status = 'scheduled' 
    AND scheduled_at <= now()
    AND scheduled_at IS NOT NULL;
  
  GET DIAGNOSTICS published_count = ROW_COUNT;
  
  RETURN published_count;
END;
$$;

-- Comment on the function
COMMENT ON FUNCTION public.publish_scheduled_blog_posts IS 'Automatically publishes blog posts that are scheduled and due to be published';

-- Create a function to validate scheduling logic
CREATE OR REPLACE FUNCTION public.validate_blog_post_schedule()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  -- If status is 'scheduled', ensure scheduled_at is set and in the future
  IF NEW.status = 'scheduled' THEN
    IF NEW.scheduled_at IS NULL THEN
      RAISE EXCEPTION 'scheduled_at must be set when status is scheduled';
    END IF;
    
    IF NEW.scheduled_at <= now() THEN
      RAISE EXCEPTION 'scheduled_at must be in the future';
    END IF;
  END IF;
  
  -- If status is not 'scheduled', clear scheduled_at
  IF NEW.status != 'scheduled' THEN
    NEW.scheduled_at := NULL;
  END IF;
  
  RETURN NEW;
END;
$$;

-- Create trigger to validate scheduling
DROP TRIGGER IF EXISTS validate_blog_post_schedule_trigger ON public.blog_posts;
CREATE TRIGGER validate_blog_post_schedule_trigger
  BEFORE INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.validate_blog_post_schedule();

-- Update RLS policies to handle scheduled posts
-- Allow viewing of scheduled posts by admins
DROP POLICY IF EXISTS "Anyone can view published blog posts" ON public.blog_posts;
CREATE POLICY "Anyone can view published blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (status = 'published');

-- Create policy for scheduled posts (admins only)
CREATE POLICY "Root admins can view scheduled blog posts" 
ON public.blog_posts 
FOR SELECT 
USING (status = 'scheduled' AND get_user_role(auth.uid()) = 'root_admin');

-- Add comments for documentation
COMMENT ON COLUMN public.blog_posts.scheduled_at IS 'When the post should be automatically published (only used when status is scheduled)';
COMMENT ON TRIGGER validate_blog_post_schedule_trigger ON public.blog_posts IS 'Validates that scheduled posts have a future scheduled_at timestamp'; 