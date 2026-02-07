-- Fix Claude models to use x-api-key instead of bearer
UPDATE ai_model_configurations
SET auth_method = 'x-api-key'
WHERE (provider = 'claude' OR provider = 'anthropic')
  AND auth_method != 'x-api-key';

-- Verify the update
SELECT model_name, provider, auth_method 
FROM ai_model_configurations 
WHERE provider IN ('claude', 'anthropic')
ORDER BY model_name;
