-- Fix incorrect Claude model names in database
-- The Claude 4 models don't actually exist yet - these were placeholder names

-- Update blog auto generation settings to use real Claude models
UPDATE public.blog_auto_generation_settings 
SET preferred_model = 'claude-3-5-sonnet-20241022'
WHERE preferred_model IN ('claude-sonnet-4-20250514', 'claude-opus-4-20250514');

UPDATE public.blog_auto_generation_settings 
SET fallback_model = 'claude-3-5-haiku-20241022'
WHERE fallback_model IN ('claude-sonnet-4-20250514', 'claude-opus-4-20250514');

-- Update AI model configurations to remove fictional models
DELETE FROM public.ai_model_configurations 
WHERE model_name IN ('claude-sonnet-4-20250514', 'claude-opus-4-20250514', 'claude-3-7-sonnet-20250219');

-- Ensure we have valid Claude models in the configuration
INSERT INTO public.ai_model_configurations (
  provider, model_name, display_name, model_family, context_window, max_output_tokens,
  quality_score, speed_score, cost_score, supports_json_mode, supports_function_calling,
  supports_vision, supports_image_generation, is_deprecated, api_key_name, description
) VALUES
  ('claude', 'claude-3-5-sonnet-20241022', 'Claude 3.5 Sonnet', 'claude-3.5', 200000, 8192, 9, 8, 7, true, true, true, false, false, 'CLAUDE_API_KEY', 'Most capable Claude model with excellent reasoning and code generation'),
  ('claude', 'claude-3-5-haiku-20241022', 'Claude 3.5 Haiku', 'claude-3.5', 200000, 8192, 7, 10, 9, true, true, true, false, false, 'CLAUDE_API_KEY', 'Fast and efficient Claude model, great for most tasks'),
  ('claude', 'claude-3-opus-20240229', 'Claude 3 Opus', 'claude-3', 200000, 4096, 10, 6, 5, true, true, true, false, false, 'CLAUDE_API_KEY', 'Most powerful Claude 3 model with exceptional capabilities')
ON CONFLICT (model_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  is_deprecated = EXCLUDED.is_deprecated;

-- Set claude-3-5-sonnet as the default if no default is set
UPDATE public.ai_model_configurations 
SET is_default = true 
WHERE provider = 'claude' AND model_name = 'claude-3-5-sonnet-20241022'
AND NOT EXISTS (SELECT 1 FROM public.ai_model_configurations WHERE provider = 'claude' AND is_default = true); 