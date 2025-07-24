import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface SEOAnalyticsRequest {
  action: 'get_analytics_summary' | 'fetch_google_search_console' | 'fetch_bing_data' | 'generate_ai_insights' | 'get_google_auth_url' | 'get_microsoft_auth_url' | 'fetch-dashboard-data' | 'get-seo-data' | 'get-google-analytics' | 'get-search-console' | 'get-top-queries' | 'get-top-pages'
  data?: any
  timeframe?: string
  startDate?: string
  endDate?: string
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
    const requestData: SEOAnalyticsRequest = await req.json()

    // Check if credentials are configured
    const googleClientEmail = Deno.env.get('GOOGLE_CLIENT_EMAIL')
    const googlePrivateKey = Deno.env.get('GOOGLE_PRIVATE_KEY')
    const ga4PropertyId = Deno.env.get('GA4_PROPERTY_ID')
    const searchConsoleSiteUrl = Deno.env.get('SEARCH_CONSOLE_SITE_URL')

    if (!googleClientEmail || !googlePrivateKey || !ga4PropertyId || !searchConsoleSiteUrl) {
      return new Response(
        JSON.stringify({ 
          error: 'Google Analytics and Search Console credentials not configured in Supabase Secrets',
          message: 'Please configure GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY, GA4_PROPERTY_ID, and SEARCH_CONSOLE_SITE_URL in Supabase Secrets'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Handle different actions
    switch (requestData.action) {
      case 'get_analytics_summary':
      case 'fetch-dashboard-data':
      case 'get-seo-data':
        return await getDashboardData(supabaseClient, requestData)
      
      case 'fetch_google_search_console':
      case 'get-search-console':
        return await getSearchConsoleData(supabaseClient, requestData)
      
      case 'fetch_bing_data':
        return await getBingData(supabaseClient, requestData)
      
      case 'generate_ai_insights':
        return await generateAIInsights(supabaseClient, requestData)
      
      case 'get_google_auth_url':
      case 'get_microsoft_auth_url':
        return await getAuthUrl(requestData.action)
      
      case 'get-google-analytics':
        return await getGoogleAnalyticsData(supabaseClient, requestData)
      
      case 'get-top-queries':
        return await getTopQueries(supabaseClient, requestData)
      
      case 'get-top-pages':
        return await getTopPages(supabaseClient, requestData)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('SEO Analytics Error:', error)
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getDashboardData(supabaseClient: any, request: SEOAnalyticsRequest) {
  try {
    // Call both analytics and search console APIs
    const [analyticsResponse, searchConsoleResponse, keywordsResponse, pagesResponse] = await Promise.all([
      supabaseClient.functions.invoke('google-analytics-api', {
        body: { 
          action: 'get-metrics',
          dateRange: { startDate: '30daysAgo', endDate: 'today' }
        }
      }),
      supabaseClient.functions.invoke('google-search-console-api', {
        body: { 
          action: 'get-performance',
          dateRange: { 
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }
        }
      }),
      supabaseClient.functions.invoke('google-search-console-api', {
        body: { 
          action: 'get-keywords',
          dateRange: { 
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }
        }
      }),
      supabaseClient.functions.invoke('google-search-console-api', {
        body: { 
          action: 'get-pages',
          dateRange: { 
            startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
            endDate: new Date().toISOString().split('T')[0]
          }
        }
      })
    ])

    if (analyticsResponse.error) {
      throw new Error(`Analytics API error: ${analyticsResponse.error.message}`)
    }
    if (searchConsoleResponse.error) {
      throw new Error(`Search Console API error: ${searchConsoleResponse.error.message}`)
    }

    // Transform data to match legacy dashboard expectations
    const combinedData = {
      totalImpressions: searchConsoleResponse.data.data.totalImpressions,
      totalClicks: searchConsoleResponse.data.data.totalClicks,
      averageCTR: (searchConsoleResponse.data.data.averageCTR || 0).toFixed(2) + '%',
      averagePosition: (searchConsoleResponse.data.data.averagePosition || 0).toFixed(1),
      
      // Transform queries
      topQueries: keywordsResponse.data?.data?.keywords?.slice(0, 10).map((keyword: any) => ({
        query: keyword.query,
        impressions: keyword.impressions,
        clicks: keyword.clicks,
        ctr: (keyword.ctr || 0).toFixed(2) + '%',
        position: (keyword.position || 0).toFixed(1)
      })) || [],
      
      // Transform pages  
      topPages: pagesResponse.data?.data?.pages?.slice(0, 10).map((page: any) => ({
        page: page.page,
        impressions: page.impressions,
        clicks: page.clicks,
        ctr: (page.ctr || 0).toFixed(2) + '%',
        position: (page.position || 0).toFixed(1)
      })) || [],

      // Analytics data
      totalUsers: analyticsResponse.data.data.activeUsers,
      totalSessions: analyticsResponse.data.data.sessions,
      averageSessionDuration: Math.round(analyticsResponse.data.data.averageSessionDuration || 0),
      bounceRate: ((analyticsResponse.data.data.bounceRate || 0) * 100).toFixed(1) + '%',
      pageViews: analyticsResponse.data.data.pageviews,
      
      // Mock trending data (would calculate from historical data in production)
      trendingQueries: keywordsResponse.data?.data?.keywords?.slice(0, 5).map((keyword: any, index: number) => ({
        ...keyword,
        trend: index % 2 === 0 ? 'up' : 'down',
        change: (Math.random() * 20 - 10).toFixed(1) + '%'
      })) || [],
      
      // Device breakdown (mock data - would need additional Analytics API call)
      deviceBreakdown: [
        { device: 'Mobile', users: Math.floor(analyticsResponse.data.data.activeUsers * 0.6), percentage: '60%' },
        { device: 'Desktop', users: Math.floor(analyticsResponse.data.data.activeUsers * 0.35), percentage: '35%' },
        { device: 'Tablet', users: Math.floor(analyticsResponse.data.data.activeUsers * 0.05), percentage: '5%' }
      ],
      
      lastUpdated: new Date().toISOString()
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        data: combinedData
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Error fetching dashboard data:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'Failed to fetch dashboard data'
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
}

async function getGoogleAnalyticsData(supabaseClient: any, request: SEOAnalyticsRequest) {
  const { data, error } = await supabaseClient.functions.invoke('google-analytics-api', {
    body: { 
      action: 'get-metrics',
      dateRange: { startDate: '30daysAgo', endDate: 'today' }
    }
  })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getSearchConsoleData(supabaseClient: any, request: SEOAnalyticsRequest) {
  const { data, error } = await supabaseClient.functions.invoke('google-search-console-api', {
    body: { 
      action: 'get-performance',
      dateRange: { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    }
  })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getTopQueries(supabaseClient: any, request: SEOAnalyticsRequest) {
  const { data, error } = await supabaseClient.functions.invoke('google-search-console-api', {
    body: { 
      action: 'get-keywords',
      dateRange: { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    }
  })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data.keywords }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getTopPages(supabaseClient: any, request: SEOAnalyticsRequest) {
  const { data, error } = await supabaseClient.functions.invoke('google-search-console-api', {
    body: { 
      action: 'get-pages',
      dateRange: { 
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        endDate: new Date().toISOString().split('T')[0]
      }
    }
  })

  if (error) {
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }

  return new Response(
    JSON.stringify({ success: true, data: data.data.pages }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getBingData(supabaseClient: any, request: SEOAnalyticsRequest) {
  // For now, return a message that Bing is not configured
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'Bing Webmaster Tools integration is not configured. This feature requires OAuth setup with Microsoft.',
      requiresSetup: true 
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function generateAIInsights(supabaseClient: any, request: SEOAnalyticsRequest) {
  // For now, return a message that AI insights are not configured
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: 'AI insights generation is not configured. This feature requires OpenAI API integration.',
      requiresSetup: true 
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function getAuthUrl(action: string) {
  // For now, return a message that OAuth is not configured
  const provider = action.includes('google') ? 'Google' : 'Microsoft'
  return new Response(
    JSON.stringify({ 
      success: false, 
      error: `${provider} OAuth is not configured. This legacy feature has been replaced with service account authentication.`,
      message: 'Please use the new SEO Analytics (MCP) page which uses secure service account credentials stored in Supabase Secrets.'
    }),
    { status: 503, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}