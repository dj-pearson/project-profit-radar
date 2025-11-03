// Webhook Delivery Worker Edge Function
// Delivers webhook events to registered endpoints with retry logic

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface WebhookEndpoint {
  id: string
  url: string
  secret: string
  is_active: boolean
  subscribed_events: string[]
  custom_headers: Record<string, string> | null
  retry_count: number
  last_failed_at: string | null
}

interface WebhookDelivery {
  id: string
  endpoint_id: string
  event_type: string
  payload: any
  attempt_count: number
  max_attempts: number
  next_retry_at: string | null
  status: string
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

    // This can be called in two ways:
    // 1. POST with a specific delivery_id to process
    // 2. GET to process all pending deliveries (cron job)

    let deliveriesToProcess: WebhookDelivery[] = []

    if (req.method === 'POST') {
      const body = await req.json()
      const { delivery_id } = body

      if (delivery_id) {
        const { data, error } = await supabaseClient
          .from('webhook_deliveries')
          .select('*')
          .eq('id', delivery_id)
          .single()

        if (error) throw error
        if (data) deliveriesToProcess = [data]
      }
    } else {
      // GET request - process all pending deliveries
      const { data, error } = await supabaseClient
        .from('webhook_deliveries')
        .select('*')
        .in('status', ['pending', 'failed'])
        .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
        .lt('attempt_count', 5) // Max 5 attempts
        .limit(100)

      if (error) throw error
      if (data) deliveriesToProcess = data
    }

    const results = []

    for (const delivery of deliveriesToProcess) {
      // Get the webhook endpoint details
      const { data: endpoint, error: endpointError } = await supabaseClient
        .from('webhook_endpoints')
        .select('*')
        .eq('id', delivery.endpoint_id)
        .single()

      if (endpointError || !endpoint) {
        console.error('Endpoint not found:', delivery.endpoint_id)
        continue
      }

      // Check if endpoint is active
      if (!endpoint.is_active) {
        console.log('Endpoint is inactive, skipping:', endpoint.url)
        continue
      }

      // Check if endpoint is subscribed to this event
      if (!isSubscribedToEvent(endpoint.subscribed_events, delivery.event_type)) {
        console.log('Endpoint not subscribed to event:', delivery.event_type)
        continue
      }

      // Attempt delivery
      const deliveryResult = await deliverWebhook(delivery, endpoint)
      results.push(deliveryResult)

      // Update delivery record
      await updateDeliveryRecord(supabaseClient, delivery.id, deliveryResult)

      // Update endpoint statistics
      await updateEndpointStats(supabaseClient, endpoint.id, deliveryResult.success)
    }

    return new Response(
      JSON.stringify({
        success: true,
        processed: deliveriesToProcess.length,
        results
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook Delivery Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

// Check if endpoint is subscribed to the event
function isSubscribedToEvent(subscribedEvents: string[], eventType: string): boolean {
  // Wildcard subscription
  if (subscribedEvents.includes('*')) {
    return true
  }

  // Exact match
  if (subscribedEvents.includes(eventType)) {
    return true
  }

  // Pattern match (e.g., "project.*" matches "project.created", "project.updated")
  for (const pattern of subscribedEvents) {
    if (pattern.endsWith('.*')) {
      const prefix = pattern.slice(0, -2)
      if (eventType.startsWith(prefix + '.')) {
        return true
      }
    }
  }

  return false
}

// Deliver webhook to endpoint
async function deliverWebhook(
  delivery: WebhookDelivery,
  endpoint: WebhookEndpoint
): Promise<{
  success: boolean
  status_code: number
  response_body: string
  error_message: string | null
  delivery_time_ms: number
}> {
  const startTime = Date.now()

  try {
    // Create webhook payload
    const payload = {
      id: delivery.id,
      event: delivery.event_type,
      created_at: new Date().toISOString(),
      data: delivery.payload
    }

    const payloadString = JSON.stringify(payload)

    // Generate HMAC signature
    const signature = await generateHMACSignature(payloadString, endpoint.secret)

    // Prepare headers
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      'X-Webhook-Signature': signature,
      'X-Webhook-Id': delivery.id,
      'X-Webhook-Event': delivery.event_type,
      'X-Webhook-Timestamp': new Date().toISOString(),
      'User-Agent': 'BuildDesk-Webhooks/1.0'
    }

    // Add custom headers if configured
    if (endpoint.custom_headers) {
      Object.assign(headers, endpoint.custom_headers)
    }

    // Make the HTTP request
    const response = await fetch(endpoint.url, {
      method: 'POST',
      headers,
      body: payloadString,
      signal: AbortSignal.timeout(30000) // 30 second timeout
    })

    const responseBody = await response.text()
    const deliveryTimeMs = Date.now() - startTime

    return {
      success: response.ok,
      status_code: response.status,
      response_body: responseBody.substring(0, 1000), // Limit response body size
      error_message: response.ok ? null : `HTTP ${response.status}: ${response.statusText}`,
      delivery_time_ms: deliveryTimeMs
    }

  } catch (error) {
    const deliveryTimeMs = Date.now() - startTime

    return {
      success: false,
      status_code: 0,
      response_body: '',
      error_message: error.message || 'Unknown error',
      delivery_time_ms: deliveryTimeMs
    }
  }
}

// Generate HMAC-SHA256 signature
async function generateHMACSignature(payload: string, secret: string): Promise<string> {
  const encoder = new TextEncoder()
  const keyData = encoder.encode(secret)
  const messageData = encoder.encode(payload)

  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign('HMAC', key, messageData)
  const signatureArray = Array.from(new Uint8Array(signature))
  const signatureHex = signatureArray.map(b => b.toString(16).padStart(2, '0')).join('')

  return `sha256=${signatureHex}`
}

// Update delivery record with result
async function updateDeliveryRecord(
  supabaseClient: any,
  deliveryId: string,
  result: any
): Promise<void> {
  const newAttemptCount = result.attempt_count || 1

  let status = result.success ? 'delivered' : 'failed'
  let nextRetryAt = null

  // Calculate next retry time using exponential backoff
  if (!result.success && newAttemptCount < 5) {
    const backoffMinutes = Math.pow(2, newAttemptCount) * 5 // 5, 10, 20, 40, 80 minutes
    nextRetryAt = new Date(Date.now() + backoffMinutes * 60 * 1000).toISOString()
  } else if (!result.success) {
    status = 'failed_permanent'
  }

  await supabaseClient
    .from('webhook_deliveries')
    .update({
      status,
      attempt_count: newAttemptCount,
      next_retry_at: nextRetryAt,
      last_attempt_at: new Date().toISOString(),
      response_status_code: result.status_code,
      response_body: result.response_body,
      error_message: result.error_message,
      delivered_at: result.success ? new Date().toISOString() : null
    })
    .eq('id', deliveryId)
}

// Update endpoint statistics
async function updateEndpointStats(
  supabaseClient: any,
  endpointId: string,
  success: boolean
): Promise<void> {
  const { data: endpoint } = await supabaseClient
    .from('webhook_endpoints')
    .select('success_count, failure_count')
    .eq('id', endpointId)
    .single()

  if (!endpoint) return

  const updates: any = {
    last_triggered_at: new Date().toISOString()
  }

  if (success) {
    updates.success_count = (endpoint.success_count || 0) + 1
    updates.failure_count = 0 // Reset failure count on success
  } else {
    updates.failure_count = (endpoint.failure_count || 0) + 1
    updates.last_failed_at = new Date().toISOString()

    // Auto-disable endpoint after 10 consecutive failures
    if (updates.failure_count >= 10) {
      updates.is_active = false
      console.log(`Auto-disabled endpoint after 10 failures: ${endpointId}`)
    }
  }

  await supabaseClient
    .from('webhook_endpoints')
    .update(updates)
    .eq('id', endpointId)
}
