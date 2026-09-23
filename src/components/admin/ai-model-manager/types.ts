export interface AIModel {
  id: string;
  provider: string;
  model_name: string;
  model_display_name: string;
  model_family: string;
  model_alias?: string;
  is_alias: boolean;
  points_to_model?: string;
  auto_update_alias: boolean;
  auth_method: 'bearer' | 'x-api-key' | 'basic';
  api_endpoint?: string;
  max_tokens?: number;
  context_window?: number;
  speed_rating?: number;
  quality_rating?: number;
  cost_rating?: number;
  is_active: boolean;
  is_default: boolean;
  priority_order: number;
  description?: string;
  deprecated_date?: string;
  deprecation_reason?: string;
  last_updated?: string;
  created_at: string;
  task_type?: 'standard' | 'lightweight';
  usage_category?: string;
}

export interface AIEnvConfig {
  id: string;
  config_key: string;
  description: string;
  default_value: string | null;
  coolify_variable: string;
  is_required: boolean;
  config_type: string;
}

export interface TestResult {
  success: boolean;
  timestamp: string;
  environment: Record<string, string>;
  config: {
    defaultProvider: string;
    defaultModel: string;
    lightweightModel: string;
    maxRetries: number;
    timeoutMs: number;
  };
  standardModel: { name: string; provider: string } | null;
  lightweightModel: { name: string; provider: string } | null;
  apiKeyStatus: Record<string, boolean>;
  testResults: {
    standard?: { success: boolean; latencyMs: number; error?: string };
    lightweight?: { success: boolean; latencyMs: number; error?: string };
  };
}
