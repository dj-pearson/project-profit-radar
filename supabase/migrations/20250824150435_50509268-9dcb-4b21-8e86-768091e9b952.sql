-- Update platforms_enabled for the social media automation settings
UPDATE public.social_media_automation_settings 
SET platforms_enabled = '["twitter", "linkedin", "facebook", "instagram"]'::jsonb,
    updated_at = NOW()
WHERE company_id = 'fcfd2e31-637b-466b-b533-df70f7f1b3af';