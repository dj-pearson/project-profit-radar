// API Authentication Middleware Edge Function
// Validates API keys, checks rate limits, and enforces permissions

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

interface APIKey {
  id: string
  site_id: string
  user_id: string
  tenant_id: string
  name: string
  key_prefix: string
  key_hash: string
  scopes: string[]
  environment: string
  rate_limit_per_minute: number
  rate_limit_per_hour: number
  rate_limit_per_day: number
  ip_whitelist: string[]
  is_active: boolean
  expires_at: string | null
  last_used_at: string | null
}

interface RateLimitInfo {
  minute_count: number
  hour_count: number
  day_count: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // Extract API key from header
    const apiKeyHeader = req.headers.get('x-api-key') || req.headers.get('authorization')?.replace('Bearer ', '')

    if (!apiKeyHeader) {
      return new Response(
        JSON.stringify({ error: 'API key required', code: 'MISSING_API_KEY' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Extract key prefix and hash the full key
    const keyPrefix = apiKeyHeader.substring(0, 12)
    const keyHash = await hashAPIKey(apiKeyHeader)

    // Look up the API key in the database
    const { data: apiKey, error: keyError } = await supabaseClient
      .from('api_keys')
      .select('*')
      .eq('key_prefix', keyPrefix)
      .eq('key_hash', keyHash)
      .single()

    if (keyError || !apiKey) {
      return new Response(
        JSON.stringify({ error: 'Invalid API key', code: 'INVALID_API_KEY' }),
        {
          status: 401,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if key is active
    if (!apiKey.is_active) {
      return new Response(
        JSON.stringify({ error: 'API key is inactive', code: 'INACTIVE_API_KEY' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check if key is expired
    if (apiKey.expires_at && new Date(apiKey.expires_at) < new Date()) {
      return new Response(
        JSON.stringify({ error: 'API key has expired', code: 'EXPIRED_API_KEY' }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Check IP whitelist if configured
    const clientIP = req.headers.get('x-forwarded-for') || req.headers.get('cf-connecting-ip') || 'unknown'
    if (apiKey.ip_whitelist && apiKey.ip_whitelist.length > 0) {
      if (!apiKey.ip_whitelist.includes(clientIP)) {
        return new Response(
          JSON.stringify({ error: 'IP address not allowed', code: 'IP_NOT_WHITELISTED', ip: clientIP }),
          {
            status: 403,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
          }
        )
      }
    }

    // Check rate limits
    const rateLimitCheck = await checkRateLimits(supabaseClient, apiKey.id, apiKey)
    if (!rateLimitCheck.allowed) {
      return new Response(
        JSON.stringify({
          error: 'Rate limit exceeded',
          code: 'RATE_LIMIT_EXCEEDED',
          limit_type: rateLimitCheck.limitType,
          retry_after: rateLimitCheck.retryAfter
        }),
        {
          status: 429,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json',
            'X-RateLimit-Limit': String(rateLimitCheck.limit),
            'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
            'X-RateLimit-Reset': String(rateLimitCheck.resetAt),
            'Retry-After': String(rateLimitCheck.retryAfter)
          }
        }
      )
    }

    // Parse the requested endpoint and method
    const url = new URL(req.url)
    const endpoint = url.searchParams.get('endpoint') || url.pathname.replace('/api-auth', '')
    const method = req.method

    // Check if the API key has the required scope for this endpoint
    const requiredScope = determineRequiredScope(endpoint, method)
    if (!hasRequiredScope(apiKey.scopes, requiredScope)) {
      return new Response(
        JSON.stringify({
          error: 'Insufficient permissions',
          code: 'INSUFFICIENT_SCOPE',
          required_scope: requiredScope,
          available_scopes: apiKey.scopes
        }),
        {
          status: 403,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Log the API request
    await logAPIRequest(supabaseClient, apiKey.id, {
      endpoint,
      method,
      ip_address: clientIP,
      user_agent: req.headers.get('user-agent') || 'unknown',
      response_status: 200
    })

    // Update last_used_at timestamp
    await supabaseClient
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKey.id)

    // Return success with user context including site_id for multi-tenant isolation
    return new Response(
      JSON.stringify({
        success: true,
        site_id: apiKey.site_id,
        user_id: apiKey.user_id,
        tenant_id: apiKey.tenant_id,
        scopes: apiKey.scopes,
        environment: apiKey.environment,
        rate_limit: {
          remaining_minute: rateLimitCheck.remaining,
          limit_minute: apiKey.rate_limit_per_minute
        }
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': String(rateLimitCheck.remaining),
          'X-RateLimit-Limit': String(apiKey.rate_limit_per_minute)
        }
      }
    )

  } catch (error) {
    console.error('API Auth Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', code: 'INTERNAL_ERROR' }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Hash API key using SHA-256
async function hashAPIKey(apiKey: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(apiKey)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  return hashHex
}

// Check rate limits for the API key
async function checkRateLimits(
  supabaseClient: any,
  apiKeyId: string,
  apiKey: APIKey
): Promise<{
  allowed: boolean
  limitType?: string
  limit?: number
  remaining: number
  resetAt?: number
  retryAfter?: number
}> {
  const now = new Date()
  const oneMinuteAgo = new Date(now.getTime() - 60 * 1000)
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000)
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)

  // Count requests in different time windows
  const { data: requests, error } = await supabaseClient
    .from('api_request_logs')
    .select('created_at')
    .eq('api_key_id', apiKeyId)
    .gte('created_at', oneDayAgo.toISOString())
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Rate limit check error:', error)
    return { allowed: true, remaining: apiKey.rate_limit_per_minute }
  }

  const minuteCount = requests.filter(r => new Date(r.created_at) >= oneMinuteAgo).length
  const hourCount = requests.filter(r => new Date(r.created_at) >= oneHourAgo).length
  const dayCount = requests.length

  // Check per-minute limit
  if (apiKey.rate_limit_per_minute && minuteCount >= apiKey.rate_limit_per_minute) {
    return {
      allowed: false,
      limitType: 'minute',
      limit: apiKey.rate_limit_per_minute,
      remaining: 0,
      resetAt: oneMinuteAgo.getTime() + 60 * 1000,
      retryAfter: 60
    }
  }

  // Check per-hour limit
  if (apiKey.rate_limit_per_hour && hourCount >= apiKey.rate_limit_per_hour) {
    return {
      allowed: false,
      limitType: 'hour',
      limit: apiKey.rate_limit_per_hour,
      remaining: 0,
      resetAt: oneHourAgo.getTime() + 60 * 60 * 1000,
      retryAfter: 3600
    }
  }

  // Check per-day limit
  if (apiKey.rate_limit_per_day && dayCount >= apiKey.rate_limit_per_day) {
    return {
      allowed: false,
      limitType: 'day',
      limit: apiKey.rate_limit_per_day,
      remaining: 0,
      resetAt: oneDayAgo.getTime() + 24 * 60 * 60 * 1000,
      retryAfter: 86400
    }
  }

  return {
    allowed: true,
    remaining: apiKey.rate_limit_per_minute - minuteCount
  }
}

// Determine required scope based on endpoint and method
function determineRequiredScope(endpoint: string, method: string): string {
  // Read operations
  if (method === 'GET') {
    return 'read'
  }

  // Write operations
  if (['POST', 'PUT', 'PATCH'].includes(method)) {
    return 'write'
  }

  // Delete operations
  if (method === 'DELETE') {
    return 'delete'
  }

  // Admin operations (system endpoints)
  if (endpoint.includes('/admin/') || endpoint.includes('/system/')) {
    return 'admin'
  }

  return 'read'
}

// Check if API key has required scope
function hasRequiredScope(availableScopes: string[], requiredScope: string): boolean {
  // Wildcard scope grants all permissions
  if (availableScopes.includes('*') || availableScopes.includes('all')) {
    return true
  }

  // Check if required scope is in available scopes
  if (availableScopes.includes(requiredScope)) {
    return true
  }

  // Admin scope grants all permissions
  if (availableScopes.includes('admin')) {
    return true
  }

  // Write scope includes read
  if (requiredScope === 'read' && availableScopes.includes('write')) {
    return true
  }

  return false
}

// Log API request to database
async function logAPIRequest(
  supabaseClient: any,
  apiKeyId: string,
  logData: {
    endpoint: string
    method: string
    ip_address: string
    user_agent: string
    response_status: number
  }
): Promise<void> {
  try {
    await supabaseClient
      .from('api_request_logs')
      .insert({
        api_key_id: apiKeyId,
        endpoint: logData.endpoint,
        method: logData.method,
        ip_address: logData.ip_address,
        user_agent: logData.user_agent,
        response_status: logData.response_status,
        response_time_ms: 0 // Could be calculated if needed
      })
  } catch (error) {
    console.error('Failed to log API request:', error)
    // Don't throw - logging failure shouldn't break the request
  }
}
