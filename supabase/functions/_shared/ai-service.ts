import { createClient } from "@supabase/supabase-js";

interface AIModelConfig {
  id: string
  name: string
  provider: string
  model_name: string
  api_endpoint: string
  auth_method: 'bearer' | 'x-api-key' | 'api-key'
  is_default: boolean
  is_active: boolean
  model_alias?: string
  is_alias: boolean
  points_to_model?: string
}

interface AIRequest {
  messages: Array<{ role: string; content: string }>
  max_tokens?: number
  temperature?: number
  system?: string
}

interface AIResponse {
  content: string
  model_used: string
  tokens_used?: number
}

export class AIService {
  private supabase: any
  private modelConfigs: Map<string, AIModelConfig> = new Map()
  private defaultModel?: AIModelConfig

  constructor() {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    this.supabase = createClient(supabaseUrl, supabaseKey)
  }

  async initialize(): Promise<void> {
    const { data: models, error } = await this.supabase
      .from('ai_model_configurations')
      .select('*')
      .eq('is_active', true)
      .order('priority_order', { ascending: true })

    if (error) {
      throw new Error(`Failed to load AI model configurations: ${error.message}`)
    }

    for (const model of models || []) {
      this.modelConfigs.set(model.model_alias || model.model_name, model)
      if (model.is_default) {
        this.defaultModel = model
      }
    }

    console.log(`Loaded ${this.modelConfigs.size} AI model configurations`)
  }

  private resolveModel(modelIdentifier?: string): AIModelConfig {
    if (!modelIdentifier) {
      if (!this.defaultModel) {
        throw new Error('No default AI model configured')
      }
      return this.defaultModel
    }

    const model = this.modelConfigs.get(modelIdentifier)
    if (!model) {
      throw new Error(`AI model '${modelIdentifier}' not found or not active`)
    }

    // If this is an alias, resolve to the actual model
    if (model.is_alias && model.points_to_model) {
      const targetModel = this.modelConfigs.get(model.points_to_model)
      if (!targetModel) {
        throw new Error(`Alias '${modelIdentifier}' points to non-existent model '${model.points_to_model}'`)
      }
      return targetModel
    }

    return model
  }

  private getApiKey(provider: string): string {
    const keyMap: Record<string, string> = {
      'claude': 'CLAUDE_API_KEY',
      'anthropic': 'CLAUDE_API_KEY',
      'openai': 'OPENAI_API_KEY',
      'gemini': 'GEMINI_API_KEY'
    }

    const envKey = keyMap[provider.toLowerCase()]
    if (!envKey) {
      throw new Error(`No API key mapping for provider: ${provider}`)
    }

    const apiKey = Deno.env.get(envKey)
    if (!apiKey) {
      throw new Error(`API key ${envKey} not configured`)
    }

    return apiKey
  }

  private buildHeaders(model: AIModelConfig): Record<string, string> {
    const apiKey = this.getApiKey(model.provider)
    const headers: Record<string, string> = {
      'Content-Type': 'application/json'
    }

    switch (model.auth_method) {
      case 'bearer':
        headers['Authorization'] = `Bearer ${apiKey}`
        break
      case 'x-api-key':
        headers['x-api-key'] = apiKey
        if (model.provider.toLowerCase() === 'claude' || model.provider.toLowerCase() === 'anthropic') {
          headers['anthropic-version'] = '2023-06-01'
        }
        break
      case 'api-key':
        headers['Authorization'] = `Bearer ${apiKey}`
        break
    }

    return headers
  }

  private buildRequestBody(model: AIModelConfig, request: AIRequest): any {
    const baseBody = {
      model: model.model_name,
      max_tokens: request.max_tokens || 2000
    }

    switch (model.provider.toLowerCase()) {
      case 'openai':
        return {
          ...baseBody,
          messages: request.system 
            ? [{ role: 'system', content: request.system }, ...request.messages]
            : request.messages,
          temperature: request.temperature
        }

      case 'claude':
      case 'anthropic':
        return {
          ...baseBody,
          messages: request.messages,
          system: request.system
        }

      case 'gemini':
        return {
          ...baseBody,
          contents: request.messages.map(msg => ({
            role: msg.role === 'assistant' ? 'model' : msg.role,
            parts: [{ text: msg.content }]
          }))
        }

      default:
        throw new Error(`Unsupported provider: ${model.provider}`)
    }
  }

  async generateContent(request: AIRequest, modelIdentifier?: string): Promise<AIResponse> {
    await this.initialize()
    
    const model = this.resolveModel(modelIdentifier)
    const headers = this.buildHeaders(model)
    const body = this.buildRequestBody(model, request)

    console.log(`Making AI request to ${model.provider} (${model.model_name})`)

    const response = await fetch(model.api_endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body)
    })

    if (!response.ok) {
      const errorText = await response.text()
      throw new Error(`${model.provider} API error: ${response.status} - ${errorText}`)
    }

    const responseData = await response.json()
    
    let content: string
    let tokensUsed: number | undefined

    switch (model.provider.toLowerCase()) {
      case 'openai':
        content = responseData.choices?.[0]?.message?.content || ''
        tokensUsed = responseData.usage?.total_tokens
        break

      case 'claude':
      case 'anthropic':
        content = responseData.content?.[0]?.text || ''
        tokensUsed = responseData.usage?.input_tokens + responseData.usage?.output_tokens
        break

      case 'gemini':
        content = responseData.candidates?.[0]?.content?.parts?.[0]?.text || ''
        tokensUsed = responseData.usageMetadata?.totalTokenCount
        break

      default:
        throw new Error(`Response parsing not implemented for provider: ${model.provider}`)
    }

    return {
      content,
      model_used: model.model_name,
      tokens_used: tokensUsed
    }
  }

  async generateSimpleContent(prompt: string, systemPrompt?: string, modelIdentifier?: string): Promise<string> {
    const request: AIRequest = {
      messages: [{ role: 'user', content: prompt }],
      system: systemPrompt
    }

    const response = await this.generateContent(request, modelIdentifier)
    return response.content
  }

  // Helper method for legacy compatibility
  async generateBlogContent(topic: string, modelIdentifier?: string): Promise<any> {
    const systemPrompt = `You are an expert content writer specializing in construction management and small business operations. Generate comprehensive, SEO-optimized blog content that provides practical value to construction professionals.

Return your response as valid JSON in this exact format:
{
  "title": "SEO-optimized title (60 chars max)",
  "content": "Full article content in HTML format",
  "excerpt": "Brief summary (160 chars max)", 
  "seo_description": "SEO meta description (160 chars max)",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "estimated_read_time": 8
}

Make the content authoritative, actionable, and valuable for construction professionals. Include specific examples, best practices, and practical tips.`

    const response = await this.generateSimpleContent(
      `Write a comprehensive blog post about: ${topic}`,
      systemPrompt,
      modelIdentifier
    )

    try {
      return JSON.parse(response)
    } catch {
      // Fallback structure if JSON parsing fails
      return {
        title: topic,
        content: response,
        excerpt: response.substring(0, 160),
        seo_description: `Learn about ${topic} for construction management`,
        keywords: [topic.toLowerCase()],
        estimated_read_time: Math.ceil(response.length / 200)
      }
    }
  }
}

// Export singleton instance
export const aiService = new AIService()