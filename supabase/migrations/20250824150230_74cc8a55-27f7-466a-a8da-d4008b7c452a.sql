-- Create default social media automation settings for the company
INSERT INTO public.social_media_automation_settings (
  company_id,
  is_active,
  auto_post_on_publish,
  ai_content_generation,
  platforms_enabled,
  posting_schedule,
  content_templates,
  created_by
) VALUES (
  'fcfd2e31-637b-466b-b533-df70f7f1b3af',  -- Your company ID
  true,
  true,  -- Auto-publish when blog posts are published
  true,
  ARRAY['twitter', 'linkedin', 'facebook', 'instagram'],
  '{"immediate": true}'::jsonb,
  '{"default": "Generated content based on blog post"}'::jsonb,
  'fcfd2e31-637b-466b-b533-df70f7f1b3af'
) ON CONFLICT (company_id) DO UPDATE SET
  is_active = EXCLUDED.is_active,
  auto_post_on_publish = EXCLUDED.auto_post_on_publish,
  updated_at = NOW();