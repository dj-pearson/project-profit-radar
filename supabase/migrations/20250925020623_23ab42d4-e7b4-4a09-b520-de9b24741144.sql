-- Fix remaining functions missing search_path security setting

-- Functions that need search_path fixes
ALTER FUNCTION public.add_subscriber_to_funnel(uuid, text, text, text, text) SET search_path = 'public';
ALTER FUNCTION public.calculate_critical_path(uuid) SET search_path = 'public';
ALTER FUNCTION public.check_budget_thresholds() SET search_path = 'public';
ALTER FUNCTION public.update_bid_analytics_on_status_change() SET search_path = 'public';
ALTER FUNCTION public.trigger_blog_social_webhook_test() SET search_path = 'public';
ALTER FUNCTION public.get_active_promotions() SET search_path = 'public';
ALTER FUNCTION public.generate_affiliate_code() SET search_path = 'public';

-- Additional function security fixes
ALTER FUNCTION public.is_account_locked(uuid) SET search_path = 'public';

-- Ensure all trigger functions have proper search_path
DO $$
DECLARE
    func_record RECORD;
BEGIN
    -- Find functions without search_path that should have it
    FOR func_record IN 
        SELECT p.proname, p.oid
        FROM pg_proc p
        JOIN pg_namespace n ON n.oid = p.pronamespace
        WHERE n.nspname = 'public'
        AND p.proconfig IS NULL  -- No configuration set
        AND p.proname NOT LIKE 'pg_%'
        AND p.proname NOT LIKE 'uuid_%'
        AND p.proname NOT LIKE 'auth.%'
        AND p.prosecdef = true  -- Security definer functions
    LOOP
        -- Set search_path for each function
        EXECUTE format('ALTER FUNCTION public.%I SET search_path = ''public''', func_record.proname);
    END LOOP;
END $$;