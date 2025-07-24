-- REVERT: Restore correct Claude 4 model names
-- The previous "fix" was wrong - Claude 4 models DO exist and are valid

-- Restore Claude 4 models in blog auto generation settings
UPDATE public.blog_auto_generation_settings 
SET preferred_model = 'claude-sonnet-4-20250514'
WHERE preferred_model = 'claude-3-5-sonnet-20241022' 
  AND created_at > '2025-01-20'; -- Only update recent incorrect changes

-- Ensure Claude 4 models are in the configuration (these are REAL models)
INSERT INTO public.ai_model_configurations (
  provider, model_name, display_name, model_family, context_window, max_output_tokens,
  quality_score, speed_score, cost_score, supports_json_mode, supports_function_calling,
  supports_vision, supports_image_generation, is_deprecated, api_key_name, description
) VALUES
  ('claude', 'claude-opus-4-20250514', 'Claude Opus 4', 'claude-4', 200000, 32000, 10, 7, 5, true, true, true, false, false, 'CLAUDE_API_KEY', 'Our most capable and intelligent model yet with superior reasoning capabilities'),
  ('claude', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude-4', 200000, 64000, 9, 8, 7, true, true, true, false, false, 'CLAUDE_API_KEY', 'High-performance model with exceptional reasoning capabilities and efficiency')
ON CONFLICT (model_name) DO UPDATE SET
  display_name = EXCLUDED.display_name,
  description = EXCLUDED.description,
  max_output_tokens = EXCLUDED.max_output_tokens,
  is_deprecated = EXCLUDED.is_deprecated;

-- Set Claude Sonnet 4 as default for Claude provider
UPDATE public.ai_model_configurations 
SET is_default = false 
WHERE provider = 'claude';

UPDATE public.ai_model_configurations 
SET is_default = true 
WHERE provider = 'claude' AND model_name = 'claude-sonnet-4-20250514'; 