-- Fix the trigger function to handle missing secrets and add debugging
CREATE OR REPLACE FUNCTION public.trigger_blog_social_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  company_uuid uuid;
  service_role_key text;
  http_result record;
BEGIN
  -- Only trigger on status change to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get company_id from the user who created the blog post
    SELECT up.company_id INTO company_uuid
    FROM public.user_profiles up
    WHERE up.id = NEW.created_by;
    
    IF company_uuid IS NOT NULL THEN
      -- Try to get the service role key from vault, but continue if not found
      BEGIN
        SELECT decrypted_secret INTO service_role_key
        FROM vault.decrypted_secrets 
        WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
        LIMIT 1;
      EXCEPTION WHEN OTHERS THEN
        service_role_key := NULL;
      END;
      
      -- Call the blog social webhook function (with or without auth)
      SELECT * INTO http_result FROM net.http_post(
        url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-social-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s'),
          'apikey', COALESCE(service_role_key, 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlsaHp1dmVtaXV5ZnV4ZmVndGx2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTE0OTU1NDQsImV4cCI6MjA2NzA3MTU0NH0.1JSYhiiJRohQnt8feFbTza9VnmKFprwsOxW0jBRcM2s')
        ),
        body := json_build_object(
          'blog_post_id', NEW.id,
          'company_id', company_uuid,
          'status', NEW.status,
          'title', NEW.title,
          'published_at', NEW.published_at
        )::jsonb
      );
      
      -- Log the HTTP call result for debugging
      INSERT INTO public.audit_logs (
        company_id, 
        user_id, 
        action_type, 
        resource_type, 
        resource_id, 
        description,
        metadata
      ) VALUES (
        company_uuid,
        NEW.created_by,
        'webhook_trigger',
        'blog_post',
        NEW.id::text,
        'Blog social webhook triggered',
        jsonb_build_object(
          'http_status', http_result.status,
          'has_service_key', service_role_key IS NOT NULL,
          'blog_title', NEW.title
        )
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$function$;