/**
 * AI Service v2 - Coolify Team Shared Variables Support
 *
 * This service provides centralized AI model management with support for:
 * - Coolify Team Shared Variables ({{ team.VARIABLE_NAME }})
 * - Standard vs Lightweight task routing
 * - Multi-provider support (Claude, OpenAI, Gemini)
 * - Environment variable overrides
 *
 * Environment Variables (set via Coolify Team Shared Variables):
 * - AI_DEFAULT_PROVIDER: Default AI provider (anthropic, openai, gemini)
 * - DEFAULT_AI_MODEL: Model for standard/heavy tasks
 * - LIGHTWEIGHT_AI_MODEL: Model for lightweight tasks (Haiku)
 * - CLAUDE_API_KEY: Anthropic API key
 * - OPENAI_API_KEY: OpenAI API key (optional)
 * - AI_MAX_RETRIES: Max retry attempts (default: 3)
 * - AI_TIMEOUT_MS: Request timeout (default: 30000)
 */

import { createClient } from "npm:@supabase/supabase-js@2";

// Task types for model routing
export type AITaskType = 'standard' | 'lightweight';

// Usage categories for specialized model selection
export type AIUsageCategory = 'general' | 'content_generation' | 'analysis' | 'chat' | 'code';

interface AIModelConfig {
  id: string;
  name: string;
  provider: string;
  model_name: string;
  api_endpoint: string;
  auth_method: 'bearer' | 'x-api-key' | 'api-key';
  is_default: boolean;
  is_active: boolean;
  model_alias?: string;
  is_alias: boolean;
  points_to_model?: string;
  task_type: AITaskType;
  usage_category: AIUsageCategory;
  max_tokens?: number;
  context_window?: number;
}

interface AIRequest {
  messages: Array<{ role: string; content: string }>;
  max_tokens?: number;
  temperature?: number;
  system?: string;
}

interface AIResponse {
  content: string;
  model_used: string;
  task_type: AITaskType;
  tokens_used?: number;
  latency_ms?: number;
}

interface AIServiceConfig {
  defaultProvider: string;
  defaultModel: string;
  lightweightModel: string;
  maxRetries: number;
  timeoutMs: number;
}

export class AIServiceV2 {
  private supabase: any;
  private modelConfigs: Map<string, AIModelConfig> = new Map();
  private standardDefault?: AIModelConfig;
  private lightweightDefault?: AIModelConfig;
  private config: AIServiceConfig;
  private initialized = false;

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    this.supabase = createClient(supabaseUrl, supabaseKey);

    // Load configuration from Coolify Team Shared Variables
    this.config = {
      defaultProvider: Deno.env.get('AI_DEFAULT_PROVIDER') || 'anthropic',
      defaultModel: Deno.env.get('DEFAULT_AI_MODEL') || 'claude-sonnet-4-5-20250929',
      lightweightModel: Deno.env.get('LIGHTWEIGHT_AI_MODEL') || 'claude-3-5-haiku-20241022',
      maxRetries: parseInt(Deno.env.get('AI_MAX_RETRIES') || '3'),
      timeoutMs: parseInt(Deno.env.get('AI_TIMEOUT_MS') || '30000'),
    };
  }

  /**
   * Get the current configuration (useful for debugging/admin)
   */
  getConfig(): AIServiceConfig {
    return { ...this.config };
  }

  /**
   * Initialize the service by loading model configurations from database
   */
  async initialize(): Promise<void> {
    if (this.initialized) return;

    const { data: models, error } = await this.supabase
      .from('ai_model_configurations')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: false });

    if (error) {
      throw new Error(`Failed to load AI model configurations: ${error.message}`);
    }

    for (const model of models || []) {
      const key = model.model_alias || model.model_name;
      this.modelConfigs.set(key, model);

      // Set defaults based on task type FROM DATABASE ONLY
      if (model.is_default) {
        if (model.task_type === 'lightweight') {
          this.lightweightDefault = model;
        } else {
          this.standardDefault = model;
        }
      }
    }

    // PRIORITY: Environment variables override database defaults (Coolify Team Shared Variables)
    // This ensures centralized control via Coolify takes precedence
    const envStandardModel = this.modelConfigs.get(this.config.defaultModel);
    const envLightweightModel = this.modelConfigs.get(this.config.lightweightModel);

    if (envStandardModel) {
      this.standardDefault = envStandardModel;
      console.log(`[AI-Service-V2] Standard model set from env: ${envStandardModel.model_name}`);
    } else if (!this.standardDefault) {
      console.warn(`[AI-Service-V2] No standard model found for env var: ${this.config.defaultModel}`);
    }

    if (envLightweightModel) {
      this.lightweightDefault = envLightweightModel;
      console.log(`[AI-Service-V2] Lightweight model set from env: ${envLightweightModel.model_name}`);
    } else if (!this.lightweightDefault) {
      console.warn(`[AI-Service-V2] No lightweight model found for env var: ${this.config.lightweightModel}`);
    }

    this.initialized = true;
    console.log(`[AI-Service-V2] Loaded ${this.modelConfigs.size} models`);
    console.log(`[AI-Service-V2] Final Standard default: ${this.standardDefault?.model_name}`);
    console.log(`[AI-Service-V2] Final Lightweight default: ${this.lightweightDefault?.model_name}`);
  }

  /**
   * Resolve which model to use based on task type and optional model identifier
   */
  private resolveModel(taskType: AITaskType = 'standard', modelIdentifier?: string): AIModelConfig {
    // If specific model requested, use it
    if (modelIdentifier) {
      const model = this.modelConfigs.get(modelIdentifier);
      if (!model) {
        throw new Error(`AI model '${modelIdentifier}' not found or not active`);
      }

      // Resolve alias if needed
      if (model.is_alias && model.points_to_model) {
        const targetModel = this.modelConfigs.get(model.points_to_model);
        if (!targetModel) {
          throw new Error(`Alias '${modelIdentifier}' points to non-existent model '${model.points_to_model}'`);
        }
        return targetModel;
      }
      return model;
    }

    // Use task-appropriate default
    const defaultModel = taskType === 'lightweight' ? this.lightweightDefault : this.standardDefault;
    if (!defaultModel) {
      throw new Error(`No default ${taskType} AI model configured`);
    }
    return defaultModel;
  }

  /**
   * Get the API key for a provider
   */
  private getApiKey(provider: string): string {
    const keyMap: Record<string, string> = {
      'claude': 'CLAUDE_API_KEY',
      'anthropic': 'CLAUDE_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'gemini': 'GEMINI_API_KEY',
    };

    const envKey = keyMap[provider.toLowerCase()];
    if (!envKey) {
      throw new Error(`No API key mapping for provider: ${provider}`);
    }

    const apiKey = Deno.env.get(envKey);
    if (!apiKey) {
      throw new Error(`API key ${envKey} not configured. Set it in Coolify Team Shared Variables.`);
    }

    return apiKey;
  }

  /**
   * Build request headers for the provider
   */
  private buildHeaders(model: AIModelConfig): Record<string, string> {
    const apiKey = this.getApiKey(model.provider);
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    switch (model.auth_method) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
      case 'x-api-key':
        headers['x-api-key'] = apiKey;
        if (model.provider.toLowerCase() === 'claude' || model.provider.toLowerCase() === 'anthropic') {
          headers['anthropic-version'] = '2023-06-01';
        }
        break;
      case 'api-key':
        headers['Authorization'] = `Bearer ${apiKey}`;
        break;
    }

    return headers;
  }

  /**
   * Build the request body based on provider format
   */
  private buildRequestBody(model: AIModelConfig, request: AIRequest): any {
    const maxTokens = request.max_tokens || model.max_tokens || 2000;

    const baseBody = {
      model: model.model_name,
      max_tokens: maxTokens,
    };

    switch (model.provider.toLowerCase()) {
      case 'openai':
        return {
          ...baseBody,
          messages: request.system
            ? [{ role: 'system', content: request.system }, ...request.messages]
            : request.messages,
          temperature: request.temperature,
        };

      case 'claude':
      case 'anthropic':
        return {
          ...baseBody,
          messages: request.messages,
          system: request.system,
        };

      case 'gemini':
        return {
          ...baseBody,
          contents: request.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }],
          })),
        };

      default:
        throw new Error(`Unsupported provider: ${model.provider}`);
    }
  }

  /**
   * Parse response based on provider format
   */
  private parseResponse(model: AIModelConfig, responseData: any): { content: string; tokensUsed?: number } {
    switch (model.provider.toLowerCase()) {
      case 'openai':
        return {
          content: responseData.choices?.[0]?.message?.content || '',
          tokensUsed: responseData.usage?.total_tokens,
        };

      case 'claude':
      case 'anthropic':
        return {
          content: responseData.content?.[0]?.text || '',
          tokensUsed: (responseData.usage?.input_tokens || 0) + (responseData.usage?.output_tokens || 0),
        };

      case 'gemini':
        return {
          content: responseData.candidates?.[0]?.content?.parts?.[0]?.text || '',
          tokensUsed: responseData.usageMetadata?.totalTokenCount,
        };

      default:
        throw new Error(`Response parsing not implemented for provider: ${model.provider}`);
    }
  }

  /**
   * Generate content with automatic task type routing
   *
   * @param request - The AI request
   * @param taskType - 'standard' for complex tasks, 'lightweight' for simple tasks
   * @param modelIdentifier - Optional specific model to use
   */
  async generateContent(
    request: AIRequest,
    taskType: AITaskType = 'standard',
    modelIdentifier?: string
  ): Promise<AIResponse> {
    await this.initialize();

    const model = this.resolveModel(taskType, modelIdentifier);
    const headers = this.buildHeaders(model);
    const body = this.buildRequestBody(model, request);

    console.log(`[AI-Service-V2] ${taskType} request to ${model.provider} (${model.model_name})`);
    const startTime = Date.now();

    let lastError: Error | null = null;
    for (let attempt = 1; attempt <= this.config.maxRetries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), this.config.timeoutMs);

        const response = await fetch(model.api_endpoint, {
          method: 'POST',
          headers,
          body: JSON.stringify(body),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`${model.provider} API error: ${response.status} - ${errorText}`);
        }

        const responseData = await response.json();
        const { content, tokensUsed } = this.parseResponse(model, responseData);
        const latencyMs = Date.now() - startTime;

        return {
          content,
          model_used: model.model_name,
          task_type: taskType,
          tokens_used: tokensUsed,
          latency_ms: latencyMs,
        };
      } catch (error) {
        lastError = error as Error;
        console.error(`[AI-Service-V2] Attempt ${attempt} failed:`, error);
        if (attempt < this.config.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }
    }

    throw lastError || new Error('AI request failed after all retries');
  }

  /**
   * Generate simple content (convenience method)
   */
  async generateSimpleContent(
    prompt: string,
    options?: {
      systemPrompt?: string;
      taskType?: AITaskType;
      modelIdentifier?: string;
      maxTokens?: number;
    }
  ): Promise<string> {
    const request: AIRequest = {
      messages: [{ role: 'user', content: prompt }],
      system: options?.systemPrompt,
      max_tokens: options?.maxTokens,
    };

    const response = await this.generateContent(
      request,
      options?.taskType || 'standard',
      options?.modelIdentifier
    );
    return response.content;
  }

  /**
   * Generate lightweight content (uses Haiku by default)
   * Use this for: classification, simple Q&A, data extraction, quick summaries
   */
  async generateLightweight(
    prompt: string,
    systemPrompt?: string,
    maxTokens?: number
  ): Promise<string> {
    return this.generateSimpleContent(prompt, {
      systemPrompt,
      taskType: 'lightweight',
      maxTokens: maxTokens || 1000,
    });
  }

  /**
   * Test the AI configuration
   * Returns diagnostic information about the setup
   */
  async testConfiguration(): Promise<{
    success: boolean;
    config: AIServiceConfig;
    standardModel: { name: string; provider: string } | null;
    lightweightModel: { name: string; provider: string } | null;
    apiKeyStatus: Record<string, boolean>;
    testResults: {
      standard?: { success: boolean; latencyMs: number; error?: string };
      lightweight?: { success: boolean; latencyMs: number; error?: string };
    };
  }> {
    await this.initialize();

    const apiKeyStatus: Record<string, boolean> = {
      CLAUDE_API_KEY: !!Deno.env.get('CLAUDE_API_KEY'),
      OPENAI_API_KEY: !!Deno.env.get('OPENAI_API_KEY'),
      GEMINI_API_KEY: !!Deno.env.get('GEMINI_API_KEY'),
    };

    const testResults: any = {};

    // Test standard model
    if (this.standardDefault) {
      try {
        const startTime = Date.now();
        await this.generateSimpleContent('Say "OK" and nothing else.', {
          taskType: 'standard',
          maxTokens: 10,
        });
        testResults.standard = {
          success: true,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        testResults.standard = {
          success: false,
          latencyMs: 0,
          error: (error as Error).message,
        };
      }
    }

    // Test lightweight model
    if (this.lightweightDefault) {
      try {
        const startTime = Date.now();
        await this.generateLightweight('Say "OK" and nothing else.', undefined, 10);
        testResults.lightweight = {
          success: true,
          latencyMs: Date.now() - startTime,
        };
      } catch (error) {
        testResults.lightweight = {
          success: false,
          latencyMs: 0,
          error: (error as Error).message,
        };
      }
    }

    return {
      success: testResults.standard?.success && testResults.lightweight?.success,
      config: this.config,
      standardModel: this.standardDefault
        ? { name: this.standardDefault.model_name, provider: this.standardDefault.provider }
        : null,
      lightweightModel: this.lightweightDefault
        ? { name: this.lightweightDefault.model_name, provider: this.lightweightDefault.provider }
        : null,
      apiKeyStatus,
      testResults,
    };
  }
}

// Export singleton instance
export const aiServiceV2 = new AIServiceV2();
