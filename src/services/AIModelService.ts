import { supabase } from '@/integrations/supabase/client';

export interface AIModelConfig {
  id: string;
  model_name: string;
  provider: string;
  api_endpoint: string;
  auth_method: 'bearer' | 'x-api-key' | 'api-key';
  is_default: boolean;
  is_active: boolean;
  model_alias?: string;
  is_alias: boolean;
  points_to_model?: string;
}

export interface AIGenerationRequest {
  prompt: string;
  system_prompt?: string;
  model_alias?: string;
  content_type?: 'blog' | 'social' | 'general';
  max_tokens?: number;
  temperature?: number;
}

export class AIModelService {
  async generateContent(request: AIGenerationRequest) {
    try {
      const { data, error } = await supabase.functions.invoke('ai-content-generator', {
        body: {
          prompt: request.prompt,
          system_prompt: request.system_prompt,
          model_alias: request.model_alias,
          content_type: request.content_type || 'general',
          max_tokens: request.max_tokens,
          temperature: request.temperature
        }
      });

      if (error) {
        throw new Error(`AI generation failed: ${error.message}`);
      }

      return data;
    } catch (error) {
      console.error('AI Model Service Error:', error);
      throw error;
    }
  }

  async getAvailableModels() {
    const { data, error } = await supabase
      .from('ai_model_configurations')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true });

    if (error) {
      throw new Error(`Failed to fetch AI models: ${error.message}`);
    }

    return data || [];
  }

  async getDefaultModel() {
    const { data, error } = await supabase
      .from('ai_model_configurations')
      .select('*')
      .eq('is_active', true)
      .eq('is_default', true)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw new Error(`Failed to fetch default model: ${error.message}`);
    }

    return data;
  }

  async setDefaultModel(modelId: string): Promise<void> {
    // First, remove default from all models
    const { error: removeError } = await supabase
      .from('ai_model_configurations')
      .update({ is_default: false })
      .eq('is_default', true);

    if (removeError) {
      throw new Error(`Failed to remove existing default: ${removeError.message}`);
    }

    // Set new default
    const { error: setError } = await supabase
      .from('ai_model_configurations')
      .update({ is_default: true })
      .eq('id', modelId);

    if (setError) {
      throw new Error(`Failed to set new default: ${setError.message}`);
    }
  }

  async updateModelAlias(aliasId: string, targetModelId: string): Promise<void> {
    const { error } = await supabase
      .from('ai_model_configurations')
      .update({ 
        points_to_model: targetModelId,
        last_updated: new Date().toISOString()
      })
      .eq('id', aliasId)
      .eq('is_alias', true);

    if (error) {
      throw new Error(`Failed to update alias: ${error.message}`);
    }
  }
}

export const aiModelService = new AIModelService();