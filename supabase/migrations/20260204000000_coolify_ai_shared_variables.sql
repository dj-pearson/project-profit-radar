-- Migration: Coolify AI Shared Variables Support
-- Adds support for centralized AI configuration via Coolify Team Shared Variables
-- Adds lightweight model support (Haiku) for cost-efficient light tasks

-- Create ai_model_configurations table if it doesn't exist
-- This ensures the migration works on fresh databases
CREATE TABLE IF NOT EXISTS ai_model_configurations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  model_name TEXT NOT NULL UNIQUE,
  model_display_name TEXT NOT NULL,
  model_family TEXT,
  model_alias TEXT,
  is_alias BOOLEAN DEFAULT false,
  points_to_model TEXT,
  auto_update_alias BOOLEAN DEFAULT false,
  auth_method TEXT NOT NULL DEFAULT 'x-api-key',
  api_endpoint TEXT,
  max_tokens INTEGER,
  context_window INTEGER,
  speed_rating INTEGER DEFAULT 5,
  quality_rating INTEGER DEFAULT 5,
  cost_rating INTEGER DEFAULT 5,
  is_active BOOLEAN DEFAULT true,
  is_default BOOLEAN DEFAULT false,
  priority_order INTEGER DEFAULT 0,
  description TEXT,
  deprecated_date TIMESTAMPTZ,
  deprecation_reason TEXT,
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Add task_type column to distinguish between standard and lightweight AI tasks
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_configurations' 
    AND column_name = 'task_type'
  ) THEN
    ALTER TABLE ai_model_configurations
    ADD COLUMN task_type TEXT DEFAULT 'standard';
  END IF;
END $$;

-- Add check constraint for task_type if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_model_configurations_task_type_check'
  ) THEN
    ALTER TABLE ai_model_configurations
    ADD CONSTRAINT ai_model_configurations_task_type_check 
    CHECK (task_type IN ('standard', 'lightweight'));
  END IF;
END $$;

-- Add env_var_override column to allow environment variable overrides
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_configurations' 
    AND column_name = 'env_var_model_override'
  ) THEN
    ALTER TABLE ai_model_configurations
    ADD COLUMN env_var_model_override TEXT;
  END IF;
END $$;

-- Add usage_category for better model selection
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'ai_model_configurations' 
    AND column_name = 'usage_category'
  ) THEN
    ALTER TABLE ai_model_configurations
    ADD COLUMN usage_category TEXT DEFAULT 'general';
  END IF;
END $$;

-- Add check constraint for usage_category if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'ai_model_configurations_usage_category_check'
  ) THEN
    ALTER TABLE ai_model_configurations
    ADD CONSTRAINT ai_model_configurations_usage_category_check 
    CHECK (usage_category IN ('general', 'content_generation', 'analysis', 'chat', 'code'));
  END IF;
END $$;

-- Create index for task_type queries
CREATE INDEX IF NOT EXISTS idx_ai_models_task_type ON ai_model_configurations(task_type, is_active);

-- Insert Claude Haiku models for lightweight tasks
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
) VALUES
-- Claude 3.5 Haiku (current production lightweight)
(
  'claude',
  'claude-3-5-haiku-20241022',
  'Claude 3.5 Haiku',
  'claude-haiku',
  'x-api-key',
  'https://api.anthropic.com/v1/messages',
  8192,
  200000,
  10,  -- Very fast
  7,   -- Good quality for light tasks
  10,  -- Very cost effective
  true,
  true,  -- Default for lightweight
  100,
  'Fast, cost-effective model for lightweight tasks like classification, simple Q&A, and quick content processing. Ideal for high-volume, low-complexity operations.',
  'lightweight',
  'general'
),
-- Claude 3 Haiku (legacy lightweight)
(
  'claude',
  'claude-3-haiku-20240307',
  'Claude 3 Haiku (Legacy)',
  'claude-haiku',
  'x-api-key',
  'https://api.anthropic.com/v1/messages',
  4096,
  200000,
  10,
  6,
  10,
  true,
  false,
  90,
  'Legacy Haiku model. Use Claude 3.5 Haiku for better performance.',
  'lightweight',
  'general'
)
ON CONFLICT (model_name) DO UPDATE SET
  task_type = EXCLUDED.task_type,
  usage_category = EXCLUDED.usage_category,
  is_active = EXCLUDED.is_active;

-- Update existing models to be standard task_type
UPDATE ai_model_configurations
SET task_type = 'standard'
WHERE task_type IS NULL AND model_family NOT LIKE '%haiku%';

-- Create AI environment configuration table for tracking Coolify variables
CREATE TABLE IF NOT EXISTS ai_environment_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  config_key TEXT NOT NULL UNIQUE,
  description TEXT,
  default_value TEXT,
  coolify_variable TEXT, -- Maps to {{ team.VARIABLE_NAME }}
  is_required BOOLEAN DEFAULT false,
  config_type TEXT DEFAULT 'string' CHECK (config_type IN ('string', 'model_name', 'api_key', 'boolean')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert standard Coolify variable mappings
INSERT INTO ai_environment_config (config_key, description, coolify_variable, is_required, config_type, default_value) VALUES
('AI_DEFAULT_PROVIDER', 'Default AI provider (anthropic, openai, gemini)', 'AI_DEFAULT_PROVIDER', true, 'string', 'anthropic'),
('DEFAULT_AI_MODEL', 'Default model for standard AI tasks', 'DEFAULT_AI_MODEL', true, 'model_name', 'claude-sonnet-4-5-20250929'),
('LIGHTWEIGHT_AI_MODEL', 'Default model for lightweight AI tasks', 'LIGHTWEIGHT_AI_MODEL', true, 'model_name', 'claude-3-5-haiku-20241022'),
('CLAUDE_API_KEY', 'Anthropic/Claude API key', 'CLAUDE_API_KEY', true, 'api_key', NULL),
('OPENAI_API_KEY', 'OpenAI API key (optional)', 'OPENAI_GLOBAL_API', false, 'api_key', NULL),
('AI_MAX_RETRIES', 'Maximum retry attempts for AI calls', 'AI_MAX_RETRIES', false, 'string', '3'),
('AI_TIMEOUT_MS', 'Timeout in milliseconds for AI calls', 'AI_TIMEOUT_MS', false, 'string', '30000'),
('AI_TEMPERATURE', 'Default temperature for AI responses (0.0-1.0)', 'AI_TEMPERATURE', false, 'string', '0.7'),
('AI_ENABLE_CACHING', 'Enable response caching for identical prompts', 'AI_ENABLE_CACHING', false, 'boolean', 'true')
ON CONFLICT (config_key) DO UPDATE SET
  coolify_variable = EXCLUDED.coolify_variable,
  description = EXCLUDED.description,
  default_value = EXCLUDED.default_value;

-- Enable RLS
ALTER TABLE ai_environment_config ENABLE ROW LEVEL SECURITY;

-- Only root admins can view/modify AI environment config
-- Only create policy if user_profiles table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'user_profiles'
  ) THEN
    -- Drop existing policy if it exists
    DROP POLICY IF EXISTS "Root admins can manage AI environment config" ON ai_environment_config;
    
    -- Create the policy
    CREATE POLICY "Root admins can manage AI environment config"
    ON ai_environment_config
    FOR ALL
    USING (
      EXISTS (
        SELECT 1 FROM user_profiles
        WHERE user_profiles.user_id = auth.uid()
        AND user_profiles.role = 'root_admin'
      )
    );
  ELSE
    -- If user_profiles doesn't exist, create a permissive policy that can be updated later
    DROP POLICY IF EXISTS "Allow all for ai_environment_config" ON ai_environment_config;
    
    CREATE POLICY "Allow all for ai_environment_config"
    ON ai_environment_config
    FOR ALL
    USING (true);
    
    -- Add a comment to remind to update this policy
    COMMENT ON POLICY "Allow all for ai_environment_config" ON ai_environment_config 
    IS 'Temporary permissive policy - update to restrict to root_admin when user_profiles table exists';
  END IF;
END $$;

-- Add comments for documentation
COMMENT ON TABLE ai_environment_config IS 'Tracks Coolify Team Shared Variables for centralized AI configuration across all platforms';
COMMENT ON COLUMN ai_model_configurations.task_type IS 'Type of tasks this model handles: standard (complex) or lightweight (simple, cost-effective)';
COMMENT ON COLUMN ai_model_configurations.env_var_model_override IS 'Environment variable that can override this model selection';
