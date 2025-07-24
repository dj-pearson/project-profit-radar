import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  action: 'get-metrics' | 'get-pages' | 'get-traffic-sources' | 'get-realtime'
  dateRange?: {
    startDate: string
    endDate: string
  }
  dimensions?: string[]
  metrics?: string[]
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Google Analytics API Function Called ===')
    
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    )

    // Verify user authentication and root admin role
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser()

    if (authError || !user) {
      console.log('Auth error:', authError)
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!userProfile || userProfile.role !== 'root_admin') {
      console.log('Access denied. User role:', userProfile?.role)
      return new Response(
        JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('User authenticated as root_admin')

    // Get request data
    const requestData: AnalyticsRequest = await req.json()
    console.log('Request data:', requestData)

    // Get Google credentials from Supabase secrets
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const ga4PropertyId = Deno.env.get('GA4_PROPERTY_ID')

    console.log('Checking credentials...')
    console.log('Client Email exists:', !!googleClientEmail)
    console.log('Private Key exists:', !!googlePrivateKey)
    console.log('GA4 Property ID exists:', !!ga4PropertyId)

    if (!googleClientEmail || !googlePrivateKey || !ga4PropertyId) {
      console.log('Missing credentials')
      return new Response(
        JSON.stringify({ 
          error: 'Google Analytics credentials not configured in Supabase Secrets',
          missing: {
            clientEmail: !googleClientEmail,
            privateKey: !googlePrivateKey,
            propertyId: !ga4PropertyId
          },
          debug: {
            clientEmailLength: googleClientEmail?.length || 0,
            privateKeyLength: googlePrivateKey?.length || 0,
            propertyId: ga4PropertyId
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('All credentials found, attempting to get access token...')

    // Try to generate JWT token for Google API authentication
    let accessToken: string;
    try {
      accessToken = await getGoogleAccessToken(googleClientEmail, googlePrivateKey)
      console.log('Access token obtained successfully')
    } catch (tokenError) {
      console.error('Token generation failed:', tokenError)
      return new Response(
        JSON.stringify({ 
          error: 'Failed to generate Google access token',
          details: tokenError.message,
          credentials: {
            clientEmail: googleClientEmail?.substring(0, 20) + '...',
            privateKeyStart: googlePrivateKey?.substring(0, 50) + '...',
            ga4PropertyId
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // For now, return a simple test response
    return new Response(
      JSON.stringify({ 
        success: true,
        message: 'Google Analytics API function is working',
        data: {
          test: true,
          action: requestData.action,
          propertyId: ga4PropertyId,
          tokenGenerated: true
        }
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Google Analytics API Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message,
        stack: error.stack
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  console.log('Creating JWT token...')
  
  // Create JWT for Google service account authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  }

  // Create JWT assertion
  const assertion = await createJWT(header, payload, privateKey)
  console.log('JWT created, requesting token from Google...')

  // Call Google's token endpoint
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: assertion
    })
  })

  const tokenData = await tokenResponse.json()
  console.log('Token response status:', tokenResponse.status)
  console.log('Token response:', tokenData)
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`)
  }

  return tokenData.access_token
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  console.log('Creating JWT with proper RSA signing...')
  
  // Base64URL encode header and payload
  const encodedHeader = base64urlEscape(btoa(JSON.stringify(header)))
  const encodedPayload = base64urlEscape(btoa(JSON.stringify(payload)))
  
  const signingInput = `${encodedHeader}.${encodedPayload}`
  
  try {
    // Parse the private key and create signature
    const keyData = parsePrivateKey(privateKey)
    console.log('Private key parsed, signing data...')
    const signature = await signData(signingInput, keyData)
    console.log('Data signed successfully')
    
    return `${signingInput}.${signature}`
  } catch (jwtError) {
    console.error('JWT creation failed:', jwtError)
    throw new Error(`JWT creation failed: ${jwtError.message}`)
  }
}

function base64urlEscape(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function parsePrivateKey(privateKey: string): Uint8Array {
  console.log('Parsing private key...')
  
  // Remove headers and newlines, handle both \n chars and actual newlines
  const cleaned = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s/g, '')
  
  console.log('Cleaned private key length:', cleaned.length)
  
  try {
    // Decode base64 to get DER format
    const binaryString = atob(cleaned)
    const bytes = new Uint8Array(binaryString.length)
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i)
    }
    console.log('Private key parsed successfully, bytes length:', bytes.length)
    return bytes
  } catch (parseError) {
    console.error('Private key parsing failed:', parseError)
    throw new Error(`Private key parsing failed: ${parseError.message}`)
  }
}

async function signData(data: string, privateKeyBytes: Uint8Array): Promise<string> {
  console.log('Signing data with RSA...')
  
  try {
    // Import the private key for signing
    const algorithm = {
      name: 'RSASSA-PKCS1-v1_5',
      hash: 'SHA-256'
    }
    
    const privateKey = await crypto.subtle.importKey(
      'pkcs8',
      privateKeyBytes,
      algorithm,
      false,
      ['sign']
    )
    
    console.log('Private key imported successfully')
    
    // Sign the data
    const encoder = new TextEncoder()
    const signature = await crypto.subtle.sign(
      algorithm,
      privateKey,
      encoder.encode(data)
    )
    
    console.log('Data signed successfully')
    
    // Convert to base64url
    const signatureBytes = new Uint8Array(signature)
    let binary = ''
    for (let i = 0; i < signatureBytes.length; i++) {
      binary += String.fromCharCode(signatureBytes[i])
    }
    return base64urlEscape(btoa(binary))
  } catch (signError) {
    console.error('Data signing failed:', signError)
    throw new Error(`Data signing failed: ${signError.message}`)
  }
} 