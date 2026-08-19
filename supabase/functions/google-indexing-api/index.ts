import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

import { getCorsHeaders, handleCorsPreflightRequest } from '../_shared/secure-cors.ts';

type IndexingAction = 'URL_UPDATED' | 'URL_DELETED'

interface IndexingRequest {
  urls: string[]
  action: IndexingAction
}

interface IndexingResult {
  url: string
  success: boolean
  status?: number
  error?: string
  urlNotificationMetadata?: {
    url: string
    latestUpdate?: { type: string; notifyTime: string }
    latestRemove?: { type: string; notifyTime: string }
  }
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') {
    return handleCorsPreflightRequest(req)
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      return new Response(
        JSON.stringify({ success: false, error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ success: false, error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const serviceAccountJson = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_JSON')

    if (!serviceAccountJson) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Google service account credentials not configured. Set GOOGLE_SERVICE_ACCOUNT_JSON in Supabase Secrets.',
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    let serviceAccount: { client_email: string; private_key: string }
    try {
      serviceAccount = JSON.parse(serviceAccountJson)
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid GOOGLE_SERVICE_ACCOUNT_JSON format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!serviceAccount.client_email || !serviceAccount.private_key) {
      return new Response(
        JSON.stringify({ success: false, error: 'Service account JSON missing client_email or private_key' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const requestData: IndexingRequest = await req.json()

    if (!requestData.urls || !Array.isArray(requestData.urls) || requestData.urls.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'urls must be a non-empty array of URL strings' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    if (!requestData.action || !['URL_UPDATED', 'URL_DELETED'].includes(requestData.action)) {
      return new Response(
        JSON.stringify({ success: false, error: 'action must be URL_UPDATED or URL_DELETED' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Google Indexing API has a batch limit of 200 URLs per day
    if (requestData.urls.length > 200) {
      return new Response(
        JSON.stringify({ success: false, error: 'Maximum 200 URLs per request (Google Indexing API daily limit)' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const accessToken = await getGoogleAccessToken(
      serviceAccount.client_email,
      serviceAccount.private_key
    )

    const results: IndexingResult[] = []

    for (const url of requestData.urls) {
      try {
        const response = await fetch(
          'https://indexing.googleapis.com/v3/urlNotifications:publish',
          {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              url,
              type: requestData.action,
            }),
          }
        )

        const data = await response.json()

        if (response.ok) {
          results.push({
            url,
            success: true,
            status: response.status,
            urlNotificationMetadata: data.urlNotificationMetadata,
          })
        } else {
          results.push({
            url,
            success: false,
            status: response.status,
            error: data.error?.message || 'Unknown error',
          })
        }
      } catch (error) {
        results.push({
          url,
          success: false,
          error: error instanceof Error ? error.message : 'Request failed',
        })
      }
    }

    const successCount = results.filter((r) => r.success).length
    const failureCount = results.filter((r) => !r.success).length

    return new Response(
      JSON.stringify({
        success: failureCount === 0,
        data: {
          submitted: requestData.urls.length,
          succeeded: successCount,
          failed: failureCount,
          action: requestData.action,
          results,
        },
        timestamp: new Date().toISOString(),
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Google Indexing API Error:', error)
    return new Response(
      JSON.stringify({
        success: false,
        error: 'Internal server error',
        details: error instanceof Error ? error.message : String(error),
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' }
  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/indexing',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }

  const assertion = await createJWT(header, payload, privateKey)

  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion,
    }),
  })

  const tokenData = await tokenResponse.json()

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`)
  }

  return tokenData.access_token
}

async function createJWT(header: Record<string, string>, payload: Record<string, unknown>, privateKey: string): Promise<string> {
  const encodedHeader = base64urlEscape(btoa(JSON.stringify(header)))
  const encodedPayload = base64urlEscape(btoa(JSON.stringify(payload)))
  const signingInput = `${encodedHeader}.${encodedPayload}`

  const keyData = parsePrivateKey(privateKey)
  const signature = await signData(signingInput, keyData)

  return `${signingInput}.${signature}`
}

function base64urlEscape(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function parsePrivateKey(privateKey: string): Uint8Array {
  const cleaned = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s/g, '')

  const binaryString = atob(cleaned)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

async function signData(data: string, privateKeyBytes: Uint8Array): Promise<string> {
  const algorithm: RsaHashedImportParams = {
    name: 'RSASSA-PKCS1-v1_5',
    hash: 'SHA-256',
  }

  const keyBuffer = privateKeyBytes.buffer.slice(
    privateKeyBytes.byteOffset,
    privateKeyBytes.byteOffset + privateKeyBytes.byteLength,
  ) as ArrayBuffer

  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    algorithm,
    false,
    ['sign'],
  )

  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign(
    algorithm,
    privateKey,
    encoder.encode(data),
  )

  const signatureBytes = new Uint8Array(signature)
  let binary = ''
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i])
  }
  return base64urlEscape(btoa(binary))
}
