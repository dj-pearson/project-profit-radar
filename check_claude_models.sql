-- Check what Claude models exist in the database
SELECT model_name, model_display_name, provider, is_default, task_type, is_active
FROM ai_model_configurations
WHERE provider IN ('claude', 'anthropic')
ORDER BY priority_order DESC, model_name;
