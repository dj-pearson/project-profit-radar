-- Test the trigger by creating a simple version that logs to audit_logs
DROP TRIGGER IF EXISTS blog_social_webhook_trigger ON public.blog_posts;

CREATE OR REPLACE FUNCTION public.trigger_blog_social_webhook_test()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  company_uuid uuid;
BEGIN
  -- Always log when this trigger is called
  INSERT INTO public.audit_logs (
    company_id, 
    user_id, 
    action_type, 
    resource_type, 
    resource_id, 
    description,
    metadata
  ) VALUES (
    NULL,
    NEW.created_by,
    'trigger_test',
    'blog_post',
    NEW.id::text,
    'Blog trigger called: ' || NEW.status || ' (was: ' || COALESCE(OLD.status, 'null') || ')',
    jsonb_build_object(
      'new_status', NEW.status,
      'old_status', COALESCE(OLD.status, 'null'),
      'blog_title', NEW.title
    )
  );
  
  -- Only proceed with webhook for published posts
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    SELECT up.company_id INTO company_uuid
    FROM public.user_profiles up
    WHERE up.id = NEW.created_by;
    
    IF company_uuid IS NOT NULL THEN
      PERFORM net.http_post(
        url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-social-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s',
          'apikey', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s'
        ),
        body := json_build_object(
          'blog_post_id', NEW.id,
          'company_id', company_uuid,
          'status', NEW.status,
          'title', NEW.title,
          'published_at', NEW.published_at
        )::jsonb
      );
      
      INSERT INTO public.audit_logs (
        company_id, 
        user_id, 
        action_type, 
        resource_type, 
        resource_id, 
        description
      ) VALUES (
        company_uuid,
        NEW.created_by,
        'webhook_sent',
        'blog_post',
        NEW.id::text,
        'HTTP webhook sent to blog-social-webhook'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;

CREATE TRIGGER blog_social_webhook_trigger
  AFTER INSERT OR UPDATE ON public.blog_posts
  FOR EACH ROW
  EXECUTE FUNCTION public.trigger_blog_social_webhook_test();