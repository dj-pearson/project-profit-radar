import { createClient } from "npm:@supabase/supabase-js@2";

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
  "content": "Full article content in Markdown format (use ## for headings, **bold**, *italic*, - for lists, etc.)",
  "excerpt": "Brief summary (160 chars max)",
  "seo_description": "SEO meta description (160 chars max)",
  "keywords": ["primary keyword", "secondary keyword", "tertiary keyword"],
  "estimated_read_time": 8
}

Make the content authoritative, actionable, and valuable for construction professionals. Include specific examples, best practices, and practical tips. Use proper Markdown formatting with headings (##, ###), bullet points (-), bold (**text**), and other Markdown elements.`

    const response = await this.generateSimpleContent(
      `Write a comprehensive blog post about: ${topic}`,
      systemPrompt,
      modelIdentifier
    )

    // Parse and normalize the AI response with multiple fallback strategies
    return this.parseAndNormalizeBlogResponse(response, topic)
  }

  /**
   * Resilient parser that handles multiple AI output formats:
   * - Raw JSON
   * - JSON wrapped in markdown code fences
   * - Plain text/markdown content
   * - Partial or malformed JSON
   */
  private parseAndNormalizeBlogResponse(response: string, topic: string): any {
    const trimmed = response.trim()

    // Strategy 1: Try to extract JSON from code fences
    const codeBlockPatterns = [
      /^```json\s*\n?([\s\S]*?)\n?```$/,
      /^```\s*\n?([\s\S]*?)\n?```$/,
      /```json\s*\n?([\s\S]*?)\n?```/,
      /```\s*\n?(\{[\s\S]*?\})\n?```/
    ]

    for (const pattern of codeBlockPatterns) {
      const match = trimmed.match(pattern)
      if (match) {
        try {
          const parsed = JSON.parse(match[1].trim())
          return this.normalizeBlogFields(parsed, topic)
        } catch {
          // Continue to next strategy
        }
      }
    }

    // Strategy 2: Try to parse as raw JSON
    try {
      // Check if it starts with { and ends with }
      if (trimmed.startsWith('{') && trimmed.includes('}')) {
        // Find the last closing brace
        const lastBrace = trimmed.lastIndexOf('}')
        const jsonCandidate = trimmed.substring(0, lastBrace + 1)
        const parsed = JSON.parse(jsonCandidate)
        return this.normalizeBlogFields(parsed, topic)
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 3: Try to find JSON object anywhere in the response
    try {
      const jsonMatch = trimmed.match(/\{[\s\S]*"title"[\s\S]*"content"[\s\S]*\}/)
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0])
        return this.normalizeBlogFields(parsed, topic)
      }
    } catch {
      // Continue to next strategy
    }

    // Strategy 4: Treat response as plain markdown content
    console.log('[AI-Service] Could not parse JSON, treating response as plain content')
    return this.createBlogFromPlainContent(trimmed, topic)
  }

  /**
   * Normalize blog fields with defaults for any missing fields
   */
  private normalizeBlogFields(parsed: any, topic: string): any {
    const content = parsed.content || parsed.body || ''
    const title = parsed.title || this.extractTitleFromContent(content) || topic

    return {
      title: title,
      content: content,
      excerpt: parsed.excerpt || this.generateExcerpt(content),
      seo_description: parsed.seo_description || parsed.meta_description || this.generateExcerpt(content),
      keywords: this.normalizeKeywords(parsed.keywords, topic),
      estimated_read_time: parsed.estimated_read_time || this.calculateReadTime(content)
    }
  }

  /**
   * Create blog structure from plain markdown/text content
   */
  private createBlogFromPlainContent(content: string, topic: string): any {
    const title = this.extractTitleFromContent(content) || topic

    return {
      title: title,
      content: content,
      excerpt: this.generateExcerpt(content),
      seo_description: this.generateExcerpt(content),
      keywords: [topic.toLowerCase().replace(/[^a-z0-9\s]/g, '').trim()],
      estimated_read_time: this.calculateReadTime(content)
    }
  }

  /**
   * Extract title from markdown content (first # heading)
   */
  private extractTitleFromContent(content: string): string | null {
    // Look for # heading at start
    const h1Match = content.match(/^#\s+(.+?)(?:\n|$)/m)
    if (h1Match) return h1Match[1].trim()

    // Look for ## heading
    const h2Match = content.match(/^##\s+(.+?)(?:\n|$)/m)
    if (h2Match) return h2Match[1].trim()

    // Use first line if it looks like a title (short, no punctuation at end)
    const firstLine = content.split('\n')[0]?.trim()
    if (firstLine && firstLine.length < 100 && !firstLine.endsWith('.')) {
      return firstLine
    }

    return null
  }

  /**
   * Generate excerpt from content (first 160 chars of actual text)
   */
  private generateExcerpt(content: string): string {
    // Remove markdown formatting
    let text = content
      .replace(/^#+\s+.+$/gm, '') // Remove headings
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Remove bold
      .replace(/\*([^*]+)\*/g, '$1') // Remove italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Remove links
      .replace(/^[-*]\s+/gm, '') // Remove list markers
      .replace(/\n+/g, ' ') // Replace newlines with spaces
      .trim()

    // Get first 160 chars, ending at a word boundary
    if (text.length <= 160) return text
    const truncated = text.substring(0, 160)
    const lastSpace = truncated.lastIndexOf(' ')
    return (lastSpace > 100 ? truncated.substring(0, lastSpace) : truncated) + '...'
  }

  /**
   * Normalize keywords array
   */
  private normalizeKeywords(keywords: any, topic: string): string[] {
    if (Array.isArray(keywords) && keywords.length > 0) {
      return keywords.map(k => String(k).toLowerCase().trim()).filter(k => k.length > 0)
    }
    // Generate default keywords from topic
    return topic.toLowerCase().split(/\s+/).filter(w => w.length > 3).slice(0, 5)
  }

  /**
   * Calculate estimated read time (average 200 words per minute)
   */
  private calculateReadTime(content: string): number {
    const wordCount = content.split(/\s+/).length
    return Math.max(1, Math.ceil(wordCount / 200))
  }
}

// Export singleton instance
export const aiService = new AIService()