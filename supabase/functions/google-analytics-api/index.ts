import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface AnalyticsRequest {
  action: 'get-metrics' | 'get-pages' | 'get-traffic-sources' | 'get-realtime' | 'get-organic-traffic' | 'get-device-breakdown' | 'get-conversion-data' | 'get-geographic-data' | 'get-user-behavior'
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

    if (!googleClientEmail || !googlePrivateKey || !ga4PropertyId) {
      console.log('Missing credentials')
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

    console.log('All credentials found, attempting to get access token...')

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

      case 'get-organic-traffic':
        return await getOrganicTraffic(accessToken, ga4PropertyId, requestData)

      case 'get-device-breakdown':
        return await getDeviceBreakdown(accessToken, ga4PropertyId, requestData)

      case 'get-conversion-data':
        return await getConversionData(accessToken, ga4PropertyId, requestData)

      case 'get-geographic-data':
        return await getGeographicData(accessToken, ga4PropertyId, requestData)

      case 'get-user-behavior':
        return await getUserBehavior(accessToken, ga4PropertyId, requestData)

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
  
  if (!tokenResponse.ok) {
    console.log('Token response error:', tokenData)
    throw new Error(`Failed to get access token: ${JSON.stringify(tokenData)}`)
  }

  console.log('Token obtained successfully')
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

async function getMetrics(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching Analytics metrics...')
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' }
    ],
    dimensions: request.dimensions || []
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  console.log('Analytics API response status:', response.status)
  
  if (!response.ok) {
    console.error('Analytics API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process and return formatted data
  const metrics = {
    activeUsers: parseInt(data.rows?.[0]?.metricValues?.[0]?.value || '0'),
    sessions: parseInt(data.rows?.[0]?.metricValues?.[1]?.value || '0'),
    pageviews: parseInt(data.rows?.[0]?.metricValues?.[2]?.value || '0'),
    averageSessionDuration: parseFloat(data.rows?.[0]?.metricValues?.[3]?.value || '0'),
    bounceRate: parseFloat(data.rows?.[0]?.metricValues?.[4]?.value || '0')
  }

  console.log('Analytics metrics processed successfully')
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
  console.log('Fetching top pages...')
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'activeUsers' },
      { name: 'averageSessionDuration' }
    ],
    dimensions: [
      { name: 'pagePath' },
      { name: 'pageTitle' }
    ],
    limit: 20,
    orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  console.log('Pages API response status:', response.status)
  
  if (!response.ok) {
    console.error('Pages API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process page data
  const pages = data.rows?.map((row: any) => ({
    path: row.dimensionValues[0].value,
    title: row.dimensionValues[1].value,
    pageviews: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value),
    avgSessionDuration: parseFloat(row.metricValues[2].value)
  })) || []

  console.log('Pages data processed successfully')
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
  console.log('Fetching traffic sources...')
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  const requestBody = {
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
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  console.log('Traffic sources API response status:', response.status)
  
  if (!response.ok) {
    console.error('Traffic sources API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process traffic source data
  const sources = data.rows?.map((row: any) => ({
    channel: row.dimensionValues[0].value,
    source: row.dimensionValues[1].value,
    sessions: parseInt(row.metricValues[0].value),
    users: parseInt(row.metricValues[1].value)
  })) || []

  console.log('Traffic sources data processed successfully')
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
  console.log('Fetching realtime data...')
  
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
  console.log('Realtime API response status:', response.status)
  
  if (!response.ok) {
    console.error('Realtime API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process realtime data
  const totalActiveUsers = data.rows?.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0) || 0

  const topCountries = data.rows?.slice(0, 5).map((row: any) => ({
    country: row.dimensionValues[0].value,
    activeUsers: parseInt(row.metricValues[0].value)
  })) || []

  console.log('Realtime data processed successfully')
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

async function getOrganicTraffic(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching organic traffic data...')
  
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request

  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'sessions' },
      { name: 'screenPageViews' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' }
    ],
    dimensions: [
      { name: 'sessionDefaultChannelGrouping' }
    ]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Organic traffic API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process organic traffic data
  const organicRow = data.rows?.find((row: any) => 
    row.dimensionValues[0].value === 'Organic Search'
  )

  const organicData = {
    sessions: parseInt(organicRow?.metricValues[0]?.value || '0'),
    pageViews: parseInt(organicRow?.metricValues[1]?.value || '0'),
    bounceRate: parseFloat(organicRow?.metricValues[2]?.value || '0'),
    avgSessionDuration: parseFloat(organicRow?.metricValues[3]?.value || '0')
  }

  // Calculate organic percentage
  const totalSessions = data.rows?.reduce((sum: number, row: any) => 
    sum + parseInt(row.metricValues[0].value), 0) || 0
  const organicPercentage = totalSessions > 0 ? (organicData.sessions / totalSessions) * 100 : 0

  console.log('Organic traffic data processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: { 
        ...organicData,
        organicPercentage: parseFloat(organicPercentage.toFixed(2))
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getDeviceBreakdown(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching device breakdown data...')
  
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request

  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'bounceRate' },
      { name: 'averageSessionDuration' }
    ],
    dimensions: [
      { name: 'deviceCategory' }
    ]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Device breakdown API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process device data
  const deviceData = (data.rows || []).map((row: any) => ({
    device: row.dimensionValues[0].value,
    users: parseInt(row.metricValues[0].value),
    sessions: parseInt(row.metricValues[1].value),
    bounceRate: parseFloat(row.metricValues[2].value),
    avgSessionDuration: parseFloat(row.metricValues[3].value)
  }))

  console.log('Device breakdown data processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: deviceData
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getConversionData(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching conversion data...')
  
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request

  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'conversions' },
      { name: 'totalRevenue' },
      { name: 'eventCount' }
    ],
    dimensions: [
      { name: 'eventName' }
    ]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Conversion data API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process conversion data
  const conversionEvents = (data.rows || []).map((row: any) => ({
    eventName: row.dimensionValues[0].value,
    conversions: parseInt(row.metricValues[0].value || '0'),
    revenue: parseFloat(row.metricValues[1].value || '0'),
    eventCount: parseInt(row.metricValues[2].value || '0')
  })).filter(event => event.conversions > 0)

  const totalConversions = conversionEvents.reduce((sum, event) => sum + event.conversions, 0)
  const totalRevenue = conversionEvents.reduce((sum, event) => sum + event.revenue, 0)

  console.log('Conversion data processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: {
        totalConversions,
        totalRevenue,
        conversionEvents: conversionEvents.slice(0, 10) // Top 10 events
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getGeographicData(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching geographic data...')
  
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request

  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'activeUsers' },
      { name: 'sessions' },
      { name: 'bounceRate' }
    ],
    dimensions: [
      { name: 'country' },
      { name: 'city' }
    ]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('Geographic data API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process geographic data
  const locationData = (data.rows || []).map((row: any) => ({
    country: row.dimensionValues[0].value,
    city: row.dimensionValues[1].value,
    users: parseInt(row.metricValues[0].value),
    sessions: parseInt(row.metricValues[1].value),
    bounceRate: parseFloat(row.metricValues[2].value)
  })).slice(0, 20) // Top 20 locations

  console.log('Geographic data processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: locationData
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getUserBehavior(accessToken: string, propertyId: string, request: AnalyticsRequest) {
  console.log('Fetching user behavior data...')
  
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request

  const requestBody = {
    dateRanges: [{
      startDate: dateRange.startDate,
      endDate: dateRange.endDate
    }],
    metrics: [
      { name: 'screenPageViews' },
      { name: 'averageSessionDuration' },
      { name: 'bounceRate' },
      { name: 'engagementRate' }
    ],
    dimensions: [
      { name: 'pagePath' }
    ]
  }

  const response = await fetch(`https://analyticsdata.googleapis.com/v1beta/properties/${propertyId}:runReport`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(requestBody)
  })

  const data = await response.json()
  if (!response.ok) {
    console.error('User behavior API error:', data)
    throw new Error(`Analytics API error: ${data.error?.message || 'Unknown error'}`)
  }

  // Process behavior data
  const pageData = (data.rows || []).map((row: any) => ({
    page: row.dimensionValues[0].value,
    pageViews: parseInt(row.metricValues[0].value),
    avgSessionDuration: parseFloat(row.metricValues[1].value),
    bounceRate: parseFloat(row.metricValues[2].value),
    engagementRate: parseFloat(row.metricValues[3].value || '0')
  })).slice(0, 15) // Top 15 pages

  console.log('User behavior data processed successfully')
  return new Response(
    JSON.stringify({ 
      success: true, 
      data: pageData
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
} 