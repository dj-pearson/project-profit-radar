import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SearchConsoleRequest {
  action: 'get-performance' | 'get-keywords' | 'get-pages' | 'get-crawl-errors'
  dateRange?: {
    startDate: string
    endDate: string
  }
  dimensions?: string[]
  searchType?: 'web' | 'image' | 'video'
  rowLimit?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
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
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
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
        JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('=== Google Search Console API Function Called ===')
    
    // Get request data
    const requestData: SearchConsoleRequest = await req.json()
    console.log('Request data:', requestData)

    // Get Google credentials from Supabase secrets
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const searchConsoleSiteUrl = Deno.env.get('SEARCH_CONSOLE_SITE_URL')

    console.log('Client Email exists:', !!googleClientEmail)
    console.log('Private Key exists:', !!googlePrivateKey)
    console.log('Search Console Site URL exists:', !!searchConsoleSiteUrl)

    if (!googleClientEmail || !googlePrivateKey || !searchConsoleSiteUrl) {
      console.error('Missing credentials:', {
        clientEmail: !!googleClientEmail,
        privateKey: !!googlePrivateKey,
        siteUrl: !!searchConsoleSiteUrl
      })
      return new Response(
        JSON.stringify({ 
          error: 'Google Search Console credentials not configured in Supabase Secrets',
          missing: {
            clientEmail: !googleClientEmail,
            privateKey: !googlePrivateKey,
            siteUrl: !searchConsoleSiteUrl
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('All credentials found, attempting to get access token...')

    // Generate JWT token for Google API authentication
    const accessToken = await getGoogleAccessToken(googleClientEmail, googlePrivateKey)

    // Handle different actions
    switch (requestData.action) {
      case 'get-performance':
        return await getPerformanceData(accessToken, searchConsoleSiteUrl, requestData)
      
      case 'get-keywords':
        return await getKeywords(accessToken, searchConsoleSiteUrl, requestData)
      
      case 'get-pages':
        return await getPages(accessToken, searchConsoleSiteUrl, requestData)
      
      case 'get-crawl-errors':
        return await getCrawlErrors(accessToken, searchConsoleSiteUrl)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Google Search Console API Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getGoogleAccessToken(clientEmail: string, privateKey: string): Promise<string> {
  // Create JWT for Google service account authentication
  const header = {
    alg: 'RS256',
    typ: 'JWT'
  }

  const now = Math.floor(Date.now() / 1000)
  const payload = {
    iss: clientEmail,
    scope: 'https://www.googleapis.com/auth/webmasters.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  }

  // Simplified JWT creation - in production, use proper RSA signing
  const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: await createJWT(header, payload, privateKey)
    })
  })

  const tokenData = await tokenResponse.json()
  
  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${tokenData.error}`)
  }

  return tokenData.access_token
}

async function createJWT(header: any, payload: any, privateKey: string): Promise<string> {
  // Proper JWT creation with RSA signature
  const encoder = new TextEncoder()
  
  // Base64URL encode header and payload
  const encodedHeader = base64urlEscape(btoa(JSON.stringify(header)))
  const encodedPayload = base64urlEscape(btoa(JSON.stringify(payload)))
  
  const signingInput = `${encodedHeader}.${encodedPayload}`
  
  // Parse the private key and create signature
  const keyData = parsePrivateKey(privateKey)
  const signature = await signData(signingInput, keyData)
  
  return `${signingInput}.${signature}`
}

function base64urlEscape(str: string): string {
  return str.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

function parsePrivateKey(privateKey: string): Uint8Array {
  // Remove headers and newlines, handle both \n chars and actual newlines
  const cleaned = privateKey
    .replace(/-----BEGIN PRIVATE KEY-----/g, '')
    .replace(/-----END PRIVATE KEY-----/g, '')
    .replace(/\\n/g, '')
    .replace(/\n/g, '')
    .replace(/\r/g, '')
    .replace(/\s/g, '')
  
  // Decode base64 to get DER format
  const binaryString = atob(cleaned)
  const bytes = new Uint8Array(binaryString.length)
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i)
  }
  return bytes
}

async function signData(data: string, privateKeyBytes: Uint8Array): Promise<string> {
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
  
  // Sign the data
  const encoder = new TextEncoder()
  const signature = await crypto.subtle.sign(
    algorithm,
    privateKey,
    encoder.encode(data)
  )
  
  // Convert to base64url
  const signatureBytes = new Uint8Array(signature)
  let binary = ''
  for (let i = 0; i < signatureBytes.length; i++) {
    binary += String.fromCharCode(signatureBytes[i])
  }
  return base64urlEscape(btoa(binary))
}

async function getPerformanceData(accessToken: string, siteUrl: string, request: SearchConsoleRequest) {
  const { 
    dateRange = { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    dimensions = ['date'],
    searchType = 'web',
    rowLimit = 1000
  } = request

  const requestBody = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    dimensions,
    searchType,
    rowLimit
  }

  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Search Console API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process and aggregate performance data
  const totalClicks = data.rows?.reduce((sum: number, row: any) => sum + row.clicks, 0) || 0
  const totalImpressions = data.rows?.reduce((sum: number, row: any) => sum + row.impressions, 0) || 0
  const averageCTR = totalImpressions > 0 ? (totalClicks / totalImpressions) * 100 : 0
  const averagePosition = data.rows?.reduce((sum: number, row: any) => sum + row.position, 0) / (data.rows?.length || 1) || 0

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        totalClicks,
        totalImpressions, 
        averageCTR,
        averagePosition,
        rows: data.rows || [],
        period: dateRange
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getKeywords(accessToken: string, siteUrl: string, request: SearchConsoleRequest) {
  const { 
    dateRange = { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    searchType = 'web',
    rowLimit = 50
  } = request

  const requestBody = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    dimensions: ['query'],
    searchType,
    rowLimit
  }

  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Search Console API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process keyword data
  const keywords = data.rows?.map((row: any) => ({
    query: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr * 100, // Convert to percentage
    position: row.position,
    trend: 'stable' // Would need historical data for real trend analysis
  })) || []

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { keywords },
      period: dateRange 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPages(accessToken: string, siteUrl: string, request: SearchConsoleRequest) {
  const { 
    dateRange = { 
      startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
      endDate: new Date().toISOString().split('T')[0]
    },
    searchType = 'web',
    rowLimit = 50
  } = request

  const requestBody = {
    startDate: dateRange.startDate,
    endDate: dateRange.endDate,
    dimensions: ['page'],
    searchType,
    rowLimit
  }

  const encodedSiteUrl = encodeURIComponent(siteUrl)
  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodedSiteUrl}/searchAnalytics/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Search Console API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process page data
  const pages = data.rows?.map((row: any) => ({
    page: row.keys[0],
    clicks: row.clicks,
    impressions: row.impressions,
    ctr: row.ctr * 100, // Convert to percentage
    position: row.position
  })) || []

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { pages },
      period: dateRange 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getCrawlErrors(accessToken: string, siteUrl: string) {
  // Note: The legacy Search Console API for crawl errors was deprecated
  // This is a placeholder for the new URL Inspection API
  
  const response = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
    }
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Search Console API error: ${data.error?.message || 'Unknown error'}`)
  }

  // For now, return site verification status
  const site = data.siteEntry?.find((entry: any) => entry.siteUrl === siteUrl)
  
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        siteVerified: !!site,
        permissionLevel: site?.permissionLevel || 'none',
        message: 'Crawl error reporting requires URL Inspection API integration'
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
} 