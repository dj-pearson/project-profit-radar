-- Add Claude Sonnet 4.5 (2025-01-29) model
INSERT INTO ai_model_configurations (
  provider,
  model_name,
  model_display_name,
  model_family,
  auth_method,
  api_endpoint,
  max_tokens,
  context_window,
  speed_rating,
  quality_rating,
  cost_rating,
  is_active,
  is_default,
  priority_order,
  description,
  task_type,
  usage_category
) VALUES (
  'claude',
  'claude-sonnet-4-5-20250929',
  'Claude Sonnet 4.5',
  'claude-sonnet',
  'x-api-key',
  'https://api.anthropic.com/v1/messages',
  8192,
  200000,
  8,
  10,
  7,
  true,
  true,  -- Set as default for standard tasks
  1000,  -- High priority
  'Latest Claude Sonnet 4.5 model with improved reasoning and coding capabilities.',
  'standard',
  'general'
)
ON CONFLICT (model_name) DO UPDATE SET
  is_default = EXCLUDED.is_default,
  is_active = EXCLUDED.is_active,
  auth_method = 'x-api-key',
  priority_order = EXCLUDED.priority_order;

-- Unset other models as default for standard tasks
UPDATE ai_model_configurations
SET is_default = false
WHERE task_type = 'standard' 
  AND model_name != 'claude-sonnet-4-5-20250929'
  AND is_default = true;

-- Verify
SELECT model_name, is_default, task_type, auth_method
FROM ai_model_configurations
WHERE provider IN ('claude', 'anthropic')
ORDER BY priority_order DESC;
