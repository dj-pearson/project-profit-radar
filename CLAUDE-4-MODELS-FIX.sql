-- Fix for Claude 4 Models - No ON CONFLICT dependency
-- This approach safely adds models without requiring unique constraints

-- Method 1: Simple INSERT (will fail if models already exist, but that's fine)
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
-- Claude Opus 4
('claude', 'claude-opus-4-20250514', 'Claude Opus 4', 'claude-4', 32000, 200000, 6, 10, 10, true, true, true, true, false, 'CLAUDE_API_KEY', 'Our most powerful and capable model with superior reasoning capabilities', true, true),

-- Claude Sonnet 4  
('claude', 'claude-sonnet-4-20250514', 'Claude Sonnet 4', 'claude-4', 64000, 200000, 8, 10, 8, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with exceptional reasoning capabilities and efficiency', true, true),

-- Claude Sonnet 3.7
('claude', 'claude-3-7-sonnet-20250219', 'Claude Sonnet 3.7', 'claude-3.7', 64000, 200000, 8, 9, 7, true, true, true, true, false, 'CLAUDE_API_KEY', 'High-performance model with early extended thinking capabilities', true, true);

-- Method 2: Check if they exist first (alternative approach)
-- Run this if the above fails with "duplicate key" error:

/*
-- Check what models currently exist
SELECT provider, model_name, model_display_name FROM public.ai_model_configurations WHERE provider = 'claude';

-- Delete specific models if you want to replace them
-- DELETE FROM public.ai_model_configurations WHERE model_name IN ('claude-opus-4-20250514', 'claude-sonnet-4-20250514', 'claude-3-7-sonnet-20250219');

-- Then run the INSERT above
*/

-- Set Claude Sonnet 4 as the default model
UPDATE public.ai_model_configurations 
SET is_default = false 
WHERE provider = 'claude' AND is_default = true;

UPDATE public.ai_model_configurations 
SET is_default = true 
WHERE provider = 'claude' AND model_name = 'claude-sonnet-4-20250514';

-- Verify the results
SELECT 
  provider, 
  model_display_name, 
  model_name, 
  model_family,
  is_default,
  is_active,
  quality_rating,
  speed_rating
FROM public.ai_model_configurations 
WHERE provider = 'claude' 
ORDER BY model_family DESC, quality_rating DESC; 