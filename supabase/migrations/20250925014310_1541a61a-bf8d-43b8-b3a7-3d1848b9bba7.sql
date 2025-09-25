-- Fix remaining functions that need search_path security updates
-- Update all functions that are missing proper search_path settings

-- Fix functions with missing search_path
ALTER FUNCTION public.generate_claim_number() SET search_path = public;
ALTER FUNCTION public.log_admin_action() SET search_path = public;
ALTER FUNCTION public.log_security_event(uuid, text, inet, text, jsonb) SET search_path = public;
ALTER FUNCTION public.check_project_requirements(uuid, numeric) SET search_path = public;
ALTER FUNCTION public.grant_root_admin_complimentary() SET search_path = public;
ALTER FUNCTION public.log_security_event(uuid, text, text, text, inet, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.update_project_completion() SET search_path = public;
ALTER FUNCTION public.set_request_due_date() SET search_path = public;
ALTER FUNCTION public.get_role_permissions(user_role) SET search_path = public;
ALTER FUNCTION public.log_consent_withdrawal() SET search_path = public;
ALTER FUNCTION public.generate_po_number(uuid) SET search_path = public;
ALTER FUNCTION public.get_equipment_schedule(uuid, uuid, date, date) SET search_path = public;
ALTER FUNCTION public.handle_failed_login(uuid, inet, text) SET search_path = public;
ALTER FUNCTION public.reset_failed_attempts(uuid, inet, text) SET search_path = public;
ALTER FUNCTION public.calculate_warranty_end_date() SET search_path = public;
ALTER FUNCTION public.increment_article_view_count(uuid, uuid, inet, text) SET search_path = public;
ALTER FUNCTION public.calculate_lead_score(uuid) SET search_path = public;
ALTER FUNCTION public.log_audit_event(uuid, uuid, text, text, text, text, jsonb, jsonb, inet, text, text, text, text, text, jsonb) SET search_path = public;
ALTER FUNCTION public.check_equipment_availability(uuid, date, date, integer, uuid) SET search_path = public;
ALTER FUNCTION public.log_data_access(uuid, uuid, text, text, text, text, text, text, inet, text, text, text) SET search_path = public;
ALTER FUNCTION public.validate_post_for_platform(text, social_platform, jsonb) SET search_path = public;
ALTER FUNCTION public.check_rate_limit(text, text, text, text, inet) SET search_path = public;
ALTER FUNCTION public.calculate_project_risk_score(uuid, uuid) SET search_path = public;
ALTER FUNCTION public.queue_next_blog_generation(uuid) SET search_path = public;
ALTER FUNCTION public.grant_root_admin_complimentary(uuid) SET search_path = public;
ALTER FUNCTION public.calculate_project_completion(uuid) SET search_path = public;
ALTER FUNCTION public.handle_warranty_transfer() SET search_path = public;
ALTER FUNCTION public.log_service_call_status_change() SET search_path = public;
ALTER FUNCTION public.validate_api_permission(text, text, uuid) SET search_path = public;
ALTER FUNCTION public.generate_estimate_number() SET search_path = public;
ALTER FUNCTION public.generate_api_key() SET search_path = public;
ALTER FUNCTION public.set_work_order_number_trigger() SET search_path = public;
ALTER FUNCTION public.create_default_project_channels() SET search_path = public;
ALTER FUNCTION public.update_channel_last_activity() SET search_path = public;
ALTER FUNCTION public.trigger_blog_social_webhook() SET search_path = public;
ALTER FUNCTION public.calculate_next_generation_time(text, time, text) SET search_path = public;
ALTER FUNCTION public.trigger_blog_social_webhook_test() SET search_path = public;
ALTER FUNCTION public.log_api_usage(text, text, text, inet, text, integer, integer) SET search_path = public;
ALTER FUNCTION public.trigger_security_alert(uuid, text, text, text, text, jsonb, jsonb) SET search_path = public;