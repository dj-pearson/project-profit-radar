-- Fix final batch of functions missing search_path security setting

ALTER FUNCTION public.schedule_next_automated_post() SET search_path = 'public';
ALTER FUNCTION public.update_automated_social_content_library_updated_at() SET search_path = 'public';
ALTER FUNCTION public.update_automated_social_posts_config_updated_at() SET search_path = 'public';
ALTER FUNCTION public.validate_blog_post_schedule() SET search_path = 'public';