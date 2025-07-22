-- Add Claude 4 models to AI model configurations
-- Based on https://docs.anthropic.com/en/docs/about-claude/models/overview

INSERT INTO public.ai_model_configurations (
  provider, 
  model_name, 
  model_display_name, 
  model_family, 
  max_tokens, 
  context_window, 
  speed_rating, 
  quality_rating, 
  cost_rating, 
  recommended_for_blog, 
  good_for_seo, 
  good_for_long_form, 
  is_active, 
  is_default, 
  requires_api_key, 
  description,
  supports_vision,
  supports_function_calling
) VALUES

-- Claude 4 Models (Latest Generation)
('claude', 'claude-opus-4-20250514', 'Claude Opus 4', 'claude-4', 32000, 200000, 6, 10, 10, true, true, true, true, false, 'CLAUDE_API_KEY', 'Our most powerful and capable model with superior reasoning capabilities', true, true),

('claude', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude-4', 64000, 200000, 8, 10, 8, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with exceptional reasoning capabilities and efficiency', true, true),

-- Claude 3.7 (Latest before Claude 4)
('claude', 'claude-3-7-sonnet-20250219', 'Claude Sonnet 3.7', 'claude-3.7', 64000, 200000, 8, 9, 7, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with early extended thinking capabilities', true, true)

-- Update existing Claude 3.5 Sonnet to latest version if it exists
ON CONFLICT (provider, model_name) DO UPDATE SET
  model_display_name = EXCLUDED.model_display_name,
  max_tokens = EXCLUDED.max_tokens,
  description = EXCLUDED.description,
  updated_at = now();

-- Update the default model to Claude Sonnet 4 (but keep existing default if user has changed it)
UPDATE public.ai_model_configurations 
SET is_default = false 
WHERE provider = 'claude' AND is_default = true;

-- Set Claude Sonnet 4 as the new default
UPDATE public.ai_model_configurations 
SET is_default = true 
WHERE provider = 'claude' AND model_name = 'claude-sonnet-4-20250514';

-- Update blog auto-generation settings to use Claude Sonnet 4 as preferred model
UPDATE public.blog_auto_generation_settings 
SET preferred_model = 'claude-sonnet-4-20250514'
WHERE preferred_model = 'claude-3-5-sonnet-20241022';

-- Update the fallback model to Claude 3.5 Haiku (most cost-effective)
UPDATE public.blog_auto_generation_settings 
SET fallback_model = 'claude-3-5-haiku-20241022'
WHERE fallback_model IS NULL OR fallback_model = '';

-- Add comment explaining the model hierarchy
COMMENT ON TABLE public.ai_model_configurations IS 'AI model configurations with Claude 4 models (Opus 4, Sonnet 4) as top-tier options for blog generation'; 