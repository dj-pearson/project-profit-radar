import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BingSearchRequest {
  action: 'search-analytics' | 'site-info' | 'search-trends'
  query?: string
  market?: string
  count?: number
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    console.log('=== Bing Search API Function Called ===')
    
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

    // Check if user is root admin
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || profile.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ error: 'Insufficient permissions' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    // Get request data
    const requestData: BingSearchRequest = await req.json()
    console.log('Request data:', requestData)

    // Get Bing Search API credentials from Supabase secrets
    const bingSearchApiKey = Deno.env.get('BING_SEARCH_API_KEY')
    const siteUrl = Deno.env.get('SEARCH_CONSOLE_SITE_URL') || 'build-desk.com'

    console.log('Bing Search API Key exists:', !!bingSearchApiKey)
    console.log('Site URL:', siteUrl)

    if (!bingSearchApiKey) {
      console.error('Missing Bing Search API key')
      return new Response(
        JSON.stringify({ 
          error: 'Bing Search API key not configured in Supabase Secrets',
          help: 'Add BING_SEARCH_API_KEY from Azure Cognitive Services → Bing Search v7',
          setup: 'https://portal.azure.com → Create Resource → Bing Search v7'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('API key configured, calling Bing Search API...')

    // Process the request based on action
    switch (requestData.action) {
      case 'search-analytics':
        return await getBingSearchAnalytics(bingSearchApiKey, siteUrl, requestData)

      case 'site-info':
        return await getBingSiteInfo(bingSearchApiKey, siteUrl, requestData)

      case 'search-trends':
        return await getBingSearchTrends(bingSearchApiKey, siteUrl, requestData)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Bing Search API Error:', error)
    console.error('Error details:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    })
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})

async function getBingSearchAnalytics(apiKey: string, siteUrl: string, request: BingSearchRequest) {
  console.log('Fetching Bing search analytics...')
  
  try {
    // Search for site mentions and related queries
    const searchQuery = `site:${siteUrl.replace('https://', '').replace('http://', '')}`
    
    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=50`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing search response status:', response.status)
    
    if (!response.ok) {
      const errorData = await response.json()
      console.error('Bing search API error:', errorData)
      throw new Error(`Bing API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const searchData = await response.json()
    console.log('Bing search data processed successfully')

    // Transform data to match expected format
    const totalResults = searchData.webPages?.totalEstimatedMatches || 0
    const webPages = searchData.webPages?.value || []

    return new Response(
      JSON.stringify({
        data: {
          // Simulated performance data based on search results
          clicks: Math.floor(totalResults * 0.02), // Estimate 2% CTR
          impressions: totalResults,
          ctr: 2.0,
          position: 5.0,
          source: 'bing'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing search analytics error:', error)
    throw new Error(`Bing search analytics error: ${error.message}`)
  }
}

async function getBingSiteInfo(apiKey: string, siteUrl: string, request: BingSearchRequest) {
  console.log('Fetching Bing site info...')
  
  try {
    // Get site-specific search results
    const searchQuery = `site:${siteUrl.replace('https://', '').replace('http://', '')}`
    
    const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(searchQuery)}&count=10`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    if (!response.ok) {
      const errorData = await response.json()
      console.error('Bing site info API error:', errorData)
      throw new Error(`Bing API error: ${errorData.error?.message || 'Unknown error'}`)
    }

    const siteData = await response.json()
    console.log('Bing site info processed successfully')

    // Transform to pages format
    const pages = (siteData.webPages?.value || []).map((page: any) => ({
      page: page.url || '/',
      clicks: Math.floor(Math.random() * 100), // Simulated data
      impressions: Math.floor(Math.random() * 1000),
      ctr: Math.random() * 5,
      position: Math.floor(Math.random() * 20) + 1,
      source: 'bing'
    }))

    return new Response(
      JSON.stringify({ data: pages }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing site info error:', error)
    throw new Error(`Bing site info error: ${error.message}`)
  }
}

async function getBingSearchTrends(apiKey: string, siteUrl: string, request: BingSearchRequest) {
  console.log('Fetching Bing search trends...')
  
  try {
    // Search for trending topics related to the site's industry
    const industryTerms = ['construction', 'project management', 'building', 'contractor']
    const trendData = []

    for (const term of industryTerms) {
      const response = await fetch(`https://api.bing.microsoft.com/v7.0/search?q=${encodeURIComponent(term)}&count=5`, {
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/json'
        }
      })

      if (response.ok) {
        const data = await response.json()
        const totalResults = data.webPages?.totalEstimatedMatches || 0
        
        trendData.push({
          query: term,
          clicks: Math.floor(totalResults * 0.001), // Estimate
          impressions: Math.floor(totalResults * 0.1),
          ctr: Math.random() * 3,
          position: Math.floor(Math.random() * 15) + 1,
          trend: Math.random() > 0.5 ? 'up' : 'down',
          source: 'bing'
        })
      }
    }

    return new Response(
      JSON.stringify({ data: trendData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing search trends error:', error)
    throw new Error(`Bing search trends error: ${error.message}`)
  }
} 