-- Set claude-sonnet-4-5-20250929 as default for standard tasks
UPDATE ai_model_configurations
SET is_default = true
WHERE model_name = 'claude-sonnet-4-5-20250929';

-- Unset claude-3-5-sonnet-20241022 as default
UPDATE ai_model_configurations
SET is_default = false
WHERE model_name = 'claude-3-5-sonnet-20241022';

-- Set claude-3-5-haiku-20241022 as default for lightweight tasks
UPDATE ai_model_configurations
SET is_default = true
WHERE model_name = 'claude-3-5-haiku-20241022';

-- Verify the changes
SELECT model_name, model_display_name, is_default, task_type
FROM ai_model_configurations
WHERE provider IN ('claude', 'anthropic')
  AND is_default = true
ORDER BY task_type;
