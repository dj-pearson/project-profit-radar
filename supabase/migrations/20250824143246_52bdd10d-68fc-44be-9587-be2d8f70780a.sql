-- Create a trigger function to call the blog social webhook
CREATE OR REPLACE FUNCTION public.trigger_blog_social_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  company_uuid uuid;
BEGIN
  -- Only trigger on status change to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get company_id from the user who created the blog post
    SELECT up.company_id INTO company_uuid
    FROM public.user_profiles up
    WHERE up.id = NEW.created_by;
    
    IF company_uuid IS NOT NULL THEN
      -- Call the blog social webhook function asynchronously
      PERFORM pg_notify('blog_published', json_build_object(
        'blog_post_id', NEW.id,
        'company_id', company_uuid,
        'status', NEW.status,
        'title', NEW.title,
        'published_at', NEW.published_at
      )::text);
      
      -- Also make HTTP call to the edge function
      PERFORM net.http_post(
        url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-social-webhook',
        headers := '{"Content-Type": "application/json"}'::jsonb,
        body := json_build_object(
          'blog_post_id', NEW.id,
          'company_id', company_uuid,
          'status', NEW.status,
          'title', NEW.title,
          'published_at', NEW.published_at
        )::jsonb
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

-- Create the trigger on blog_posts table
DROP TRIGGER IF EXISTS blog_social_webhook_trigger ON public.blog_posts;
CREATE TRIGGER blog_social_webhook_trigger
  AFTER UPDATE OF status ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_blog_social_webhook();