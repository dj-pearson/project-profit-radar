-- Update the trigger function to include proper authorization headers
CREATE OR REPLACE FUNCTION public.trigger_blog_social_webhook()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $function$
DECLARE
  company_uuid uuid;
  service_role_key text;
BEGIN
  -- Only trigger on status change to 'published'
  IF NEW.status = 'published' AND (OLD.status IS NULL OR OLD.status != 'published') THEN
    -- Get company_id from the user who created the blog post
    SELECT up.company_id INTO company_uuid
    FROM public.user_profiles up
    WHERE up.id = NEW.created_by;
    
    IF company_uuid IS NOT NULL THEN
      -- Get the service role key from vault (you'll need to add this secret)
      SELECT decrypted_secret INTO service_role_key
      FROM vault.decrypted_secrets 
      WHERE name = 'SUPABASE_SERVICE_ROLE_KEY'
      LIMIT 1;
      
      -- Call the blog social webhook function with proper auth
      PERFORM net.http_post(
        url := 'https://ilhzuvemiuyfuxfegtlv.supabase.co/functions/v1/blog-social-webhook',
        headers := jsonb_build_object(
          'Content-Type', 'application/json',
          'Authorization', 'Bearer ' || COALESCE(service_role_key, ''),
          'apikey', COALESCE(service_role_key, '')
        ),
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