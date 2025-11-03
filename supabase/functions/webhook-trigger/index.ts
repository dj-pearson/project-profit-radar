// Webhook Event Trigger Function
// Creates webhook deliveries when events occur in the application

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const { event_type, tenant_id, data } = await req.json()

    if (!event_type || !tenant_id) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: event_type and tenant_id are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Find all webhook endpoints subscribed to this event
    const { data: endpoints, error: endpointsError } = await supabaseClient
      .from('webhook_endpoints')
      .select('*')
      .eq('tenant_id', tenant_id)
      .eq('is_active', true)

    if (endpointsError) throw endpointsError

    if (!endpoints || endpoints.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No active webhook endpoints found',
          deliveries_created: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Filter endpoints that are subscribed to this event type
    const subscribedEndpoints = endpoints.filter(endpoint => {
      return isSubscribedToEvent(endpoint.subscribed_events, event_type)
    })

    if (subscribedEndpoints.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          message: 'No endpoints subscribed to this event type',
          event_type,
          deliveries_created: 0
        }),
        {
          status: 200,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Create webhook deliveries for each subscribed endpoint
    const deliveries = subscribedEndpoints.map(endpoint => ({
      endpoint_id: endpoint.id,
      event_type,
      payload: data,
      status: 'pending',
      attempt_count: 0,
      max_attempts: 5,
      next_retry_at: new Date().toISOString()
    }))

    const { data: createdDeliveries, error: deliveriesError } = await supabaseClient
      .from('webhook_deliveries')
      .insert(deliveries)
      .select()

    if (deliveriesError) throw deliveriesError

    // Trigger immediate delivery by calling webhook-delivery function
    // This is async - we don't wait for the deliveries to complete
    for (const delivery of createdDeliveries) {
      fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/webhook-delivery`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`
        },
        body: JSON.stringify({ delivery_id: delivery.id })
      }).catch(err => console.error('Failed to trigger delivery:', err))
    }

    return new Response(
      JSON.stringify({
        success: true,
        event_type,
        deliveries_created: createdDeliveries.length,
        endpoints_notified: subscribedEndpoints.map(e => ({
          id: e.id,
          url: e.url,
          name: e.description
        }))
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Webhook Trigger Error:', error)
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
