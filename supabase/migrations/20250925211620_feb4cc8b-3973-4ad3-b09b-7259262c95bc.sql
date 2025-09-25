-- Fix the AI model configurations migration by removing ON CONFLICT
-- Since there's no unique constraint, we'll check for existing records first

-- Add new columns to ai_model_configurations if they don't exist
ALTER TABLE public.ai_model_configurations 
ADD COLUMN IF NOT EXISTS model_alias text,
ADD COLUMN IF NOT EXISTS auth_method text DEFAULT 'bearer' CHECK (auth_method IN ('bearer', 'x-api-key', 'basic')),
ADD COLUMN IF NOT EXISTS api_endpoint text,
ADD COLUMN IF NOT EXISTS is_alias boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS points_to_model text,
ADD COLUMN IF NOT EXISTS auto_update_alias boolean DEFAULT false,
ADD COLUMN IF NOT EXISTS last_updated timestamp with time zone DEFAULT now(),
ADD COLUMN IF NOT EXISTS deprecated_date date,
ADD COLUMN IF NOT EXISTS deprecation_reason text,
ADD COLUMN IF NOT EXISTS priority_order integer DEFAULT 0;

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_alias ON public.ai_model_configurations(model_alias);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_provider_active ON public.ai_model_configurations(provider, is_active);
CREATE INDEX IF NOT EXISTS idx_ai_model_configurations_priority ON public.ai_model_configurations(priority_order DESC);

-- Update existing models with proper endpoints and auth methods
UPDATE public.ai_model_configurations 
SET 
  api_endpoint = CASE 
    WHEN provider = 'claude' THEN 'https://api.anthropic.com/v1/messages'
    WHEN provider = 'openai' THEN 'https://api.openai.com/v1/chat/completions'
    WHEN provider = 'gemini' THEN 'https://generativelanguage.googleapis.com/v1/models'
    ELSE api_endpoint
  END,
  auth_method = CASE 
    WHEN provider = 'claude' THEN 'bearer'
    WHEN provider = 'openai' THEN 'bearer'
    WHEN provider = 'gemini' THEN 'x-api-key'
    ELSE 'bearer'
  END,
  last_updated = now()
WHERE api_endpoint IS NULL OR auth_method IS NULL;

-- Insert example aliases only if they don't exist
INSERT INTO public.ai_model_configurations 
(provider, model_name, model_display_name, model_family, model_alias, is_alias, points_to_model, auto_update_alias, auth_method, api_endpoint, is_active, description, priority_order)
SELECT 'claude', 'claude-opus-latest', 'Claude Opus (Latest)', 'claude-opus', 'claude-opus-latest', true, 'claude-opus-4-1-20250805', true, 'bearer', 'https://api.anthropic.com/v1/messages', true, 'Always points to the latest Claude Opus model', 100
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_configurations WHERE provider = 'claude' AND model_name = 'claude-opus-latest');

INSERT INTO public.ai_model_configurations 
(provider, model_name, model_display_name, model_family, model_alias, is_alias, points_to_model, auto_update_alias, auth_method, api_endpoint, is_active, description, priority_order)
SELECT 'claude', 'claude-sonnet-latest', 'Claude Sonnet (Latest)', 'claude-sonnet', 'claude-sonnet-latest', true, 'claude-sonnet-4-20250514', true, 'bearer', 'https://api.anthropic.com/v1/messages', true, 'Always points to the latest Claude Sonnet model', 90
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_configurations WHERE provider = 'claude' AND model_name = 'claude-sonnet-latest');

INSERT INTO public.ai_model_configurations 
(provider, model_name, model_display_name, model_family, model_alias, is_alias, points_to_model, auto_update_alias, auth_method, api_endpoint, is_active, description, priority_order)
SELECT 'claude', 'claude-haiku-latest', 'Claude Haiku (Latest)', 'claude-haiku', 'claude-haiku-latest', true, 'claude-3-5-haiku-20241022', true, 'bearer', 'https://api.anthropic.com/v1/messages', true, 'Always points to the latest Claude Haiku model', 80
WHERE NOT EXISTS (SELECT 1 FROM public.ai_model_configurations WHERE provider = 'claude' AND model_name = 'claude-haiku-latest');