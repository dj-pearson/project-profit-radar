import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface BingWebmasterRequest {
  action: 'get-performance' | 'get-pages' | 'get-keywords' | 'get-crawl-errors' | 'get-backlinks'
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
    console.log('=== Bing Webmaster Tools API Function Called ===')
    
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
    const requestData: BingWebmasterRequest = await req.json()
    console.log('Request data:', requestData)

    // Get Bing Webmaster API credentials from Supabase secrets
    const bingApiKey = Deno.env.get('Microsoft_Bing_API')
    const bingSiteUrl = Deno.env.get('SEARCH_CONSOLE_SITE_URL') // Reuse the same site URL

    console.log('Bing API Key exists:', !!bingApiKey)
    console.log('Bing Site URL exists:', !!bingSiteUrl)

    if (!bingApiKey || !bingSiteUrl) {
      console.error('Missing credentials:', {
        bingApiKey: !!bingApiKey,
        bingSiteUrl: !!bingSiteUrl
      })
      return new Response(
        JSON.stringify({ 
          error: 'Bing Webmaster API credentials not configured in Supabase Secrets',
          missing: {
            bingApiKey: !bingApiKey,
            siteUrl: !bingSiteUrl
          },
          help: 'Please add Microsoft_Bing_API key from Bing Webmaster Tools → Settings → API Access'
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      )
    }

    console.log('Using API key length:', bingApiKey.length)
    console.log('Using site URL:', bingSiteUrl)

    console.log('All credentials found, calling Bing Webmaster API...')

    // Process the request based on action
    switch (requestData.action) {
      case 'get-performance':
        return await getBingPerformanceData(bingApiKey, bingSiteUrl, requestData)

      case 'get-pages':
        return await getBingPages(bingApiKey, bingSiteUrl, requestData)

      case 'get-keywords':
        return await getBingKeywords(bingApiKey, bingSiteUrl, requestData)

      case 'get-crawl-errors':
        return await getBingCrawlErrors(bingApiKey, bingSiteUrl, requestData)

      case 'get-backlinks':
        return await getBingBacklinks(bingApiKey, bingSiteUrl, requestData)

      default:
        return new Response(
          JSON.stringify({ error: 'Invalid action' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }

  } catch (error) {
    console.error('Bing Webmaster API Error:', error)
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

async function getBingPerformanceData(apiKey: string, siteUrl: string, request: BingWebmasterRequest) {
  console.log('Fetching Bing performance data...')
  const { dateRange = { startDate: '30daysAgo', endDate: 'today' } } = request
  
  // Convert site URL format for Bing API
  const cleanSiteUrl = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
  
  try {
    // Bing Webmaster Tools uses different endpoints for different data
    const performanceResponse = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetUrlsSubmittedCount?siteUrl=${encodeURIComponent(cleanSiteUrl)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing performance API response status:', performanceResponse.status)
    
    if (!performanceResponse.ok) {
      const errorData = await performanceResponse.json()
      console.error('Bing performance API error:', errorData)
      throw new Error(`Bing API error: ${errorData.message || 'Unknown error'}`)
    }

    const performanceData = await performanceResponse.json()
    console.log('Bing performance data processed successfully')

    // Return formatted data compatible with the frontend
    return new Response(
      JSON.stringify({
        data: {
          clicks: performanceData.d || 0,
          impressions: performanceData.d || 0,
          ctr: 0.0,
          position: 0.0,
          source: 'bing'
        }
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing performance data error:', error)
    throw new Error(`Bing performance API error: ${error.message}`)
  }
}

async function getBingPages(apiKey: string, siteUrl: string, request: BingWebmasterRequest) {
  console.log('Fetching Bing top pages...')
  const cleanSiteUrl = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
  
  try {
    const pagesResponse = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetPagesStats?siteUrl=${encodeURIComponent(cleanSiteUrl)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing pages API response status:', pagesResponse.status)
    
    if (!pagesResponse.ok) {
      const errorData = await pagesResponse.json()
      console.error('Bing pages API error:', errorData)
      throw new Error(`Bing API error: ${errorData.message || 'Unknown error'}`)
    }

    const pagesData = await pagesResponse.json()
    console.log('Bing pages data processed successfully')

    // Format data for frontend compatibility
    const formattedPages = (pagesData.d || []).map((page: any) => ({
      url: page.Url || '/',
      clicks: page.Clicks || 0,
      impressions: page.Impressions || 0,
      ctr: page.Ctr || 0,
      position: page.Position || 0,
      source: 'bing'
    }))

    return new Response(
      JSON.stringify({ data: formattedPages }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing pages data error:', error)
    throw new Error(`Bing pages API error: ${error.message}`)
  }
}

async function getBingKeywords(apiKey: string, siteUrl: string, request: BingWebmasterRequest) {
  console.log('Fetching Bing keywords...')
  const cleanSiteUrl = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
  
  try {
    const keywordsResponse = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(cleanSiteUrl)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing keywords API response status:', keywordsResponse.status)
    
    if (!keywordsResponse.ok) {
      const errorData = await keywordsResponse.json()
      console.error('Bing keywords API error:', errorData)
      throw new Error(`Bing API error: ${errorData.message || 'Unknown error'}`)
    }

    const keywordsData = await keywordsResponse.json()
    console.log('Bing keywords data processed successfully')

    // Format data for frontend compatibility
    const formattedKeywords = (keywordsData.d || []).map((keyword: any) => ({
      query: keyword.Query || '',
      clicks: keyword.Clicks || 0,
      impressions: keyword.Impressions || 0,
      ctr: keyword.Ctr || 0,
      position: keyword.Position || 0,
      source: 'bing'
    }))

    return new Response(
      JSON.stringify({ data: formattedKeywords }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing keywords data error:', error)
    throw new Error(`Bing keywords API error: ${error.message}`)
  }
}

async function getBingCrawlErrors(apiKey: string, siteUrl: string, request: BingWebmasterRequest) {
  console.log('Fetching Bing crawl errors...')
  const cleanSiteUrl = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
  
  try {
    const crawlResponse = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetCrawlErrors?siteUrl=${encodeURIComponent(cleanSiteUrl)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing crawl errors API response status:', crawlResponse.status)
    
    if (!crawlResponse.ok) {
      const errorData = await crawlResponse.json()
      console.error('Bing crawl errors API error:', errorData)
      throw new Error(`Bing API error: ${errorData.message || 'Unknown error'}`)
    }

    const crawlData = await crawlResponse.json()
    console.log('Bing crawl errors data processed successfully')

    // Format data for frontend compatibility
    const formattedErrors = (crawlData.d || []).map((error: any) => ({
      url: error.Url || '',
      errorType: error.ErrorType || '',
      errorCode: error.ErrorCode || '',
      detectedDate: error.DetectedDate || '',
      source: 'bing'
    }))

    return new Response(
      JSON.stringify({ data: formattedErrors }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing crawl errors data error:', error)
    throw new Error(`Bing crawl errors API error: ${error.message}`)
  }
}

async function getBingBacklinks(apiKey: string, siteUrl: string, request: BingWebmasterRequest) {
  console.log('Fetching Bing backlinks...')
  const cleanSiteUrl = siteUrl.replace('sc-domain:', '').replace('https://', '').replace('http://', '')
  
  try {
    const backlinksResponse = await fetch(`https://ssl.bing.com/webmaster/api.svc/json/GetBackLinks?siteUrl=${encodeURIComponent(cleanSiteUrl)}`, {
      headers: {
        'Ocp-Apim-Subscription-Key': apiKey,
        'Content-Type': 'application/json'
      }
    })

    console.log('Bing backlinks API response status:', backlinksResponse.status)
    
    if (!backlinksResponse.ok) {
      const errorData = await backlinksResponse.json()
      console.error('Bing backlinks API error:', errorData)
      throw new Error(`Bing API error: ${errorData.message || 'Unknown error'}`)
    }

    const backlinksData = await backlinksResponse.json()
    console.log('Bing backlinks data processed successfully')

    // Format data for frontend compatibility
    const formattedBacklinks = (backlinksData.d || []).map((backlink: any) => ({
      sourceUrl: backlink.SourceUrl || '',
      targetUrl: backlink.TargetUrl || '',
      anchorText: backlink.AnchorText || '',
      dateFound: backlink.DateFound || '',
      source: 'bing'
    }))

    return new Response(
      JSON.stringify({ data: formattedBacklinks }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )

  } catch (error) {
    console.error('Bing backlinks data error:', error)
    throw new Error(`Bing backlinks API error: ${error.message}`)
  }
} 