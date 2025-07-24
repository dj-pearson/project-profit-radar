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

    // Get request data
    const requestData: AnalyticsRequest = await req.json()

    // Get Google credentials from Supabase secrets
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const ga4PropertyId = Deno.env.get('GA4_PROPERTY_ID')

    if (!googleClientEmail || !googlePrivateKey || !ga4PropertyId) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Analytics credentials not configured in Supabase Secrets',
          missing: {
            clientEmail: !googleClientEmail,
            privateKey: !googlePrivateKey,
            propertyId: !ga4PropertyId
          }
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Generate JWT token for Google API authentication
    const accessToken = await getGoogleAccessToken(googleClientEmail, googlePrivateKey)

    // Handle different actions
    switch (requestData.action) {
      case 'get-metrics':
        return await getMetrics(accessToken, ga4PropertyId, requestData)
      
      case 'get-pages':
        return await getPages(accessToken, ga4PropertyId, requestData)
      
      case 'get-traffic-sources':
        return await getTrafficSources(accessToken, ga4PropertyId, requestData)
      
      case 'get-realtime':
        return await getRealtimeData(accessToken, ga4PropertyId)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Google Analytics API Error:', error)
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
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600, // 1 hour
    iat: now
  }

  // Note: In production, you'd use a proper JWT library
  // For this example, we'll call Google's token endpoint directly
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
  // Simplified JWT creation - in production use a proper library
  const encoder = new TextEncoder()
  
  const encodedHeader = btoa(JSON.stringify(header))
  const encodedPayload = btoa(JSON.stringify(payload))
  
  const data = `${encodedHeader}.${encodedPayload}`
  
  // Sign with private key (simplified)
  // In production, use proper RSA signing
  const signature = btoa(data) // Placeholder - use proper RSA signature
  
  return `${data}.${signature}`
}

async function getMetrics(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
    requests: [{
      entity: { propertyId },
      dateRanges: [{
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'pageviews' },
        { name: 'averageSessionDuration' },
        { name: 'bounceRate' }
      ],
      dimensions: request.dimensions || []
    }]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process and return formatted data
  const report = data.reports[0]
  const metrics = {
    activeUsers: parseInt(report.rows?.[0]?.metricValues?.[0]?.value || '0'),
    sessions: parseInt(report.rows?.[0]?.metricValues?.[1]?.value || '0'),
    pageviews: parseInt(report.rows?.[0]?.metricValues?.[2]?.value || '0'),
    averageSessionDuration: parseFloat(report.rows?.[0]?.metricValues?.[3]?.value || '0'),
    bounceRate: parseFloat(report.rows?.[0]?.metricValues?.[4]?.value || '0')
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: metrics,
      period: dateRange 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getPages(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
    requests: [{
      entity: { propertyId },
      dateRanges: [{
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }],
      metrics: [
        { name: 'pageviews' },
        { name: 'activeUsers' },
        { name: 'averageSessionDuration' }
      ],
      dimensions: [
        { name: 'pagePath' },
        { name: 'pageTitle' }
      ],
      limit: 20,
      orderBys: [{ metric: { metricName: 'pageviews' }, desc: true }]
    }]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process page data
  const report = data.reports[0]
  const pages = report.rows?.map((row: any) => ({
    path: row.dimensionValues[0].value,
    title: row.dimensionValues[1].value,
    pageviews: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value),
    avgSessionDuration: parseFloat(row.metricValues[2].value)
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

async function getTrafficSources(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
    requests: [{
      entity: { propertyId },
      dateRanges: [{
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      }],
      metrics: [
        { name: 'sessions' },
        { name: 'activeUsers' }
      ],
      dimensions: [
        { name: 'sessionDefaultChannelGroup' },
        { name: 'sessionSource' }
      ],
      limit: 10,
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }]
    }]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:batchRunReports`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process traffic source data
  const report = data.reports[0]
  const sources = report.rows?.map((row: any) => ({
    channel: row.dimensionValues[0].value,
    source: row.dimensionValues[1].value,
    sessions: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value)
  })) || []

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { sources },
      period: dateRange 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getRealtimeData(accessToken: string, propertyId: string) {
  const requestBody = {
    entity: { propertyId },
    metrics: [
      { name: 'activeUsers' }
    ],
    dimensions: [
      { name: 'country' }
    ],
    limit: 10
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runRealtimeReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  
  if (!response.ok) {
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process realtime data
  const totalActiveUsers = data.rows?.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0) || 0

  const topCountries = data.rows?.slice(0, 5).map((row: any) => ({
    country: row.dimensionValues[0].value,
    activeUsers: parseInt(row.metricValues[0].value)
  })) || []

  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        totalActiveUsers,
        topCountries 
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
} 