// Webhook Signature Verification Utility
// Helps webhook consumers verify that payloads are from BuildDesk

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'

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
    const { payload, signature, secret } = await req.json()

    if (!payload || !signature || !secret) {
      return new Response(
        JSON.stringify({
          error: 'Missing required fields: payload, signature, and secret are required'
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      )
    }

    // Generate expected signature
    const payloadString = typeof payload === 'string' ? payload : JSON.stringify(payload)
    const expectedSignature = await generateHMACSignature(payloadString, secret)

    // Compare signatures (constant-time comparison)
    const isValid = constantTimeCompare(signature, expectedSignature)

    return new Response(
      JSON.stringify({
        valid: isValid,
        provided_signature: signature,
        expected_signature: expectedSignature
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )

  } catch (error) {
    console.error('Verification Error:', error)
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    )
  }
})

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

// Constant-time string comparison to prevent timing attacks
function constantTimeCompare(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false
  }

  let result = 0
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i)
  }

  return result === 0
}
