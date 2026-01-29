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
    console.log('[AI-Service] Parsing response, length:', response.length)

    let content = response.trim()

    // Step 1: Strip markdown code fences if present
    content = this.stripCodeFences(content)
    console.log('[AI-Service] After stripping code fences, length:', content.length)

    // Step 2: Try to parse as JSON
    const jsonResult = this.tryParseJson(content)
    if (jsonResult) {
      console.log('[AI-Service] Successfully parsed JSON')
      return this.normalizeBlogFields(jsonResult, topic)
    }

    // Step 3: Try to extract JSON object from mixed content
    const extractedJson = this.extractJsonObject(content)
    if (extractedJson) {
      console.log('[AI-Service] Extracted JSON from mixed content')
      return this.normalizeBlogFields(extractedJson, topic)
    }

    // Step 4: Treat as plain markdown content
    console.log('[AI-Service] Could not parse JSON, treating response as plain content')
    return this.createBlogFromPlainContent(content, topic)
  }

  /**
   * Strip markdown code fences from content
   */
  private stripCodeFences(content: string): string {
    let result = content

    // Remove opening code fence (```json or ```) at the start
    result = result.replace(/^```(?:json)?\s*\n?/, '')

    // Remove closing code fence at the end
    result = result.replace(/\n?```\s*$/, '')

    // Also handle if there are multiple code blocks - extract the first one
    const codeBlockMatch = content.match(/```(?:json)?\s*\n?([\s\S]*?)(?:\n?```|$)/)
    if (codeBlockMatch && codeBlockMatch[1]) {
      // If we found a code block, use its contents
      result = codeBlockMatch[1].trim()
    }

    return result.trim()
  }

  /**
   * Try to parse content as JSON with multiple strategies
   */
  private tryParseJson(content: string): any | null {
    // Direct parse attempt
    try {
      return JSON.parse(content)
    } catch {
      // Continue to other strategies
    }

    // Try to find complete JSON object (handle truncated responses)
    if (content.includes('{')) {
      try {
        const firstBrace = content.indexOf('{')
        const lastBrace = content.lastIndexOf('}')
        if (lastBrace > firstBrace) {
          const jsonCandidate = content.substring(firstBrace, lastBrace + 1)
          return JSON.parse(jsonCandidate)
        }
      } catch {
        // Continue
      }
    }

    return null
  }

  /**
   * Extract JSON object from content that might have surrounding text
   */
  private extractJsonObject(content: string): any | null {
    // Look for a JSON object with title and content fields
    const patterns = [
      // Match from first { to last } that contains title and content
      /\{[^{}]*"title"\s*:\s*"[^"]*"[^{}]*"content"\s*:\s*"[\s\S]*?"[^{}]*\}/,
      // More greedy pattern
      /\{[\s\S]*?"title"\s*:\s*"[^"]*"[\s\S]*?"content"\s*:[\s\S]*\}/,
    ]

    for (const pattern of patterns) {
      const match = content.match(pattern)
      if (match) {
        try {
          return JSON.parse(match[0])
        } catch {
          // Try to fix common JSON issues
          const fixed = this.tryFixJson(match[0])
          if (fixed) return fixed
        }
      }
    }

    // Last resort: find { and try to balance braces
    const firstBrace = content.indexOf('{')
    if (firstBrace !== -1) {
      const jsonCandidate = this.extractBalancedJson(content.substring(firstBrace))
      if (jsonCandidate) {
        try {
          return JSON.parse(jsonCandidate)
        } catch {
          const fixed = this.tryFixJson(jsonCandidate)
          if (fixed) return fixed
        }
      }
    }

    return null
  }

  /**
   * Extract a balanced JSON object (matching braces)
   */
  private extractBalancedJson(content: string): string | null {
    let depth = 0
    let inString = false
    let escape = false
    let start = -1

    for (let i = 0; i < content.length; i++) {
      const char = content[i]

      if (escape) {
        escape = false
        continue
      }

      if (char === '\\' && inString) {
        escape = true
        continue
      }

      if (char === '"' && !escape) {
        inString = !inString
        continue
      }

      if (!inString) {
        if (char === '{') {
          if (depth === 0) start = i
          depth++
        } else if (char === '}') {
          depth--
          if (depth === 0 && start !== -1) {
            return content.substring(start, i + 1)
          }
        }
      }
    }

    // If we have an unclosed object, return what we have
    if (start !== -1 && depth > 0) {
      // Try to close it
      return content.substring(start) + '}'.repeat(depth)
    }

    return null
  }

  /**
   * Try to fix common JSON parsing issues
   */
  private tryFixJson(jsonString: string): any | null {
    try {
      // Remove trailing commas
      let fixed = jsonString.replace(/,\s*([}\]])/g, '$1')

      // Try to close unclosed strings and objects
      const openBraces = (fixed.match(/\{/g) || []).length
      const closeBraces = (fixed.match(/\}/g) || []).length
      if (openBraces > closeBraces) {
        fixed += '}'.repeat(openBraces - closeBraces)
      }

      // Close unclosed strings (very basic)
      const quotes = (fixed.match(/"/g) || []).length
      if (quotes % 2 !== 0) {
        fixed += '"'
      }

      return JSON.parse(fixed)
    } catch {
      return null
    }
  }

  /**
   * Normalize blog fields with defaults for any missing fields
   */
  private normalizeBlogFields(parsed: any, topic: string): any {
    const rawContent = parsed.content || parsed.body || ''
    const content = this.normalizeMarkdown(rawContent)
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
  private createBlogFromPlainContent(rawContent: string, topic: string): any {
    const content = this.normalizeMarkdown(rawContent)
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
   * Normalize markdown formatting for proper rendering
   * Ensures proper spacing between elements
   */
  private normalizeMarkdown(content: string): string {
    if (!content) return ''

    let normalized = content

    // Normalize line endings to \n
    normalized = normalized.replace(/\r\n/g, '\n').replace(/\r/g, '\n')

    // Ensure blank line before headings (unless at start)
    normalized = normalized.replace(/([^\n])\n(#{1,6}\s)/g, '$1\n\n$2')

    // Ensure blank line after headings
    normalized = normalized.replace(/(#{1,6}\s.+)\n([^\n#])/g, '$1\n\n$2')

    // Ensure blank line before lists (unless after heading or another list item)
    normalized = normalized.replace(/([^\n-*\d#])\n([-*]\s|\d+\.\s)/g, '$1\n\n$2')

    // Ensure blank line after list blocks (detect end of list)
    normalized = normalized.replace(/([-*]\s.+|^\d+\.\s.+)\n([^\n-*\d\s])/gm, '$1\n\n$2')

    // Ensure blank line before code blocks
    normalized = normalized.replace(/([^\n])\n(```)/g, '$1\n\n$2')

    // Ensure blank line after code blocks
    normalized = normalized.replace(/(```)\n([^\n])/g, '$1\n\n$2')

    // Ensure blank line before blockquotes
    normalized = normalized.replace(/([^\n>])\n(>\s)/g, '$1\n\n$2')

    // Ensure blank line after blockquotes
    normalized = normalized.replace(/(>\s.+)\n([^\n>])/g, '$1\n\n$2')

    // Ensure blank line before horizontal rules
    normalized = normalized.replace(/([^\n])\n(---+|___+|\*\*\*+)\n/g, '$1\n\n$2\n')

    // Ensure blank line after horizontal rules
    normalized = normalized.replace(/\n(---+|___+|\*\*\*+)\n([^\n])/g, '\n$1\n\n$2')

    // Normalize multiple blank lines to maximum of 2
    normalized = normalized.replace(/\n{3,}/g, '\n\n')

    // Trim leading/trailing whitespace
    normalized = normalized.trim()

    return normalized
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

    // Use first non-empty, non-code-fence line if it looks like a title
    const lines = content.split('\n')
    for (const line of lines) {
      const trimmedLine = line.trim()
      // Skip empty lines and code fence markers
      if (!trimmedLine || trimmedLine.startsWith('```') || trimmedLine === '{') {
        continue
      }
      // Skip lines that look like JSON
      if (trimmedLine.startsWith('"') || trimmedLine.startsWith('{')) {
        continue
      }
      // Use line if it looks like a title (short, no punctuation at end)
      if (trimmedLine.length < 100 && !trimmedLine.endsWith('.')) {
        return trimmedLine
      }
      break // Only check first few lines
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