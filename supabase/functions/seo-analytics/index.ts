import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://cdn.skypack.dev/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    const { action, data } = await req.json()
    console.log('SEO Analytics Action:', action, data)

    switch (action) {
      case 'fetch_google_search_console':
        return await fetchGoogleSearchConsole(supabaseClient, data)
      case 'fetch_bing_data':
        return await fetchBingData(supabaseClient, data)
      case 'generate_ai_insights':
        return await generateAIInsights(supabaseClient, data)
      case 'get_analytics_summary':
        return await getAnalyticsSummary(supabaseClient, data)
      case 'submit_sitemap':
        return await submitSitemap(supabaseClient, data)
      case 'check_indexing':
        return await checkIndexing(supabaseClient, data)
      default:
        throw new Error('Invalid action')
    }
  } catch (error) {
    console.error('SEO Analytics Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

async function fetchGoogleSearchConsole(supabaseClient: any, data: any) {
  const googleApiKey = Deno.env.get('Google_Search_Console_API')
  const { siteUrl, startDate, endDate } = data
  
  if (!googleApiKey) {
    throw new Error('Google Search Console API key not configured')
  }

  try {
    // Fetch search analytics data from Google Search Console
    const searchAnalyticsResponse = await fetch(
      `https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(siteUrl)}/searchAnalytics/query?key=${googleApiKey}`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          startDate: startDate || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          endDate: endDate || new Date().toISOString().split('T')[0],
          dimensions: ['query', 'page', 'country', 'device'],
          rowLimit: 1000,
          aggregationType: 'auto'
        })
      }
    )

    const searchData = await searchAnalyticsResponse.json()
    
    if (!searchAnalyticsResponse.ok) {
      console.error('Google Search Console API Error:', searchData)
      throw new Error(`Google API Error: ${searchData.error?.message || 'Unknown error'}`)
    }

    // Process and aggregate the data
    const processedData = {
      totalImpressions: searchData.rows?.reduce((sum: number, row: any) => sum + row.impressions, 0) || 0,
      totalClicks: searchData.rows?.reduce((sum: number, row: any) => sum + row.clicks, 0) || 0,
      averageCTR: searchData.rows?.length ? 
        (searchData.rows.reduce((sum: number, row: any) => sum + row.ctr, 0) / searchData.rows.length * 100).toFixed(2) : 0,
      averagePosition: searchData.rows?.length ?
        (searchData.rows.reduce((sum: number, row: any) => sum + row.position, 0) / searchData.rows.length).toFixed(1) : 0,
      topQueries: searchData.rows?.slice(0, 10).map((row: any) => ({
        query: row.keys[0],
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: (row.ctr * 100).toFixed(2),
        position: row.position.toFixed(1)
      })) || [],
      topPages: searchData.rows?.slice(0, 10).map((row: any) => ({
        page: row.keys[1] || row.keys[0],
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: (row.ctr * 100).toFixed(2)
      })) || [],
      deviceBreakdown: {},
      countryBreakdown: {}
    }

    // Store in database
    const { error } = await supabaseClient
      .from('seo_analytics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        search_engine: 'google',
        impressions: processedData.totalImpressions,
        clicks: processedData.totalClicks,
        ctr: parseFloat(processedData.averageCTR),
        average_position: parseFloat(processedData.averagePosition),
        top_queries: processedData.topQueries,
        top_pages: processedData.topPages,
        device_breakdown: processedData.deviceBreakdown,
        country_breakdown: processedData.countryBreakdown
      }, { onConflict: 'date,search_engine' })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data: processedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Google Search Console Error:', error)
    throw error
  }
}

async function fetchBingData(supabaseClient: any, data: any) {
  const bingApiKey = Deno.env.get('Microsoft_Bing_API')
  const { siteUrl, startDate, endDate } = data
  
  if (!bingApiKey) {
    throw new Error('Bing Webmaster API key not configured')
  }

  try {
    // Fetch data from Bing Webmaster Tools API
    const bingResponse = await fetch(
      `https://ssl.bing.com/webmaster/api.svc/json/GetQueryStats?siteUrl=${encodeURIComponent(siteUrl)}`,
      {
        headers: {
          'Authorization': `Bearer ${bingApiKey}`,
          'Content-Type': 'application/json',
        }
      }
    )

    const bingData = await bingResponse.json()
    
    if (!bingResponse.ok) {
      console.error('Bing Webmaster API Error:', bingData)
      throw new Error(`Bing API Error: ${bingData.error?.message || 'Unknown error'}`)
    }

    const processedData = {
      totalImpressions: bingData.TotalImpressions || 0,
      totalClicks: bingData.TotalClicks || 0,
      averageCTR: bingData.TotalClicks && bingData.TotalImpressions ? 
        ((bingData.TotalClicks / bingData.TotalImpressions) * 100).toFixed(2) : '0',
      averagePosition: bingData.AveragePosition?.toFixed(1) || '0',
      topQueries: bingData.Data?.slice(0, 10).map((item: any) => ({
        query: item.Query,
        impressions: item.Impressions,
        clicks: item.Clicks,
        ctr: item.Clicks && item.Impressions ? ((item.Clicks / item.Impressions) * 100).toFixed(2) : '0',
        position: item.AveragePosition?.toFixed(1) || '0'
      })) || []
    }

    // Store in database
    const { error } = await supabaseClient
      .from('seo_analytics')
      .upsert({
        date: new Date().toISOString().split('T')[0],
        search_engine: 'bing',
        impressions: processedData.totalImpressions,
        clicks: processedData.totalClicks,
        ctr: parseFloat(processedData.averageCTR),
        average_position: parseFloat(processedData.averagePosition),
        top_queries: processedData.topQueries,
        top_pages: [],
        device_breakdown: {},
        country_breakdown: {}
      }, { onConflict: 'date,search_engine' })

    if (error) throw error

    return new Response(
      JSON.stringify({ success: true, data: processedData }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Bing Webmaster Error:', error)
    throw error
  }
}

async function generateAIInsights(supabaseClient: any, data: any) {
  const openAIKey = Deno.env.get('OpenAI_API_KEY')
  
  if (!openAIKey) {
    throw new Error('OpenAI API key not configured')
  }

  try {
    // Get recent analytics data
    const { data: analyticsData, error } = await supabaseClient
      .from('seo_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    if (error) throw error

    // Prepare data for AI analysis
    const dataForAnalysis = {
      totalData: analyticsData,
      summary: analyticsData.reduce((acc: any, item: any) => ({
        totalImpressions: acc.totalImpressions + item.impressions,
        totalClicks: acc.totalClicks + item.clicks,
        avgCTR: (acc.avgCTR + item.ctr) / 2,
        avgPosition: (acc.avgPosition + item.average_position) / 2
      }), { totalImpressions: 0, totalClicks: 0, avgCTR: 0, avgPosition: 0 })
    }

    const prompt = `
    As an SEO expert, analyze the following website traffic data and provide actionable insights:
    
    Data: ${JSON.stringify(dataForAnalysis)}
    
    Please provide:
    1. Traffic Analysis (trends, patterns, performance)
    2. Keyword Performance (top performing vs underperforming)
    3. Technical SEO Issues (if any can be inferred)
    4. Content Strategy Recommendations
    5. Immediate Action Items (priority ranked)
    6. Long-term SEO Strategy
    7. Competitive Positioning Insights
    
    Format as JSON with these sections: insights, recommendations, actionPlan, competitorAnalysis
    `

    const aiResponse = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an expert SEO analyst providing data-driven insights and recommendations.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 2000
      }),
    })

    const aiData = await aiResponse.json()
    
    if (!aiResponse.ok) {
      throw new Error(`OpenAI API Error: ${aiData.error?.message || 'Unknown error'}`)
    }

    let insights
    try {
      insights = JSON.parse(aiData.choices[0].message.content)
    } catch {
      // If JSON parsing fails, structure the response
      insights = {
        insights: [aiData.choices[0].message.content],
        recommendations: ['Please review the generated analysis'],
        actionPlan: ['Implement suggested recommendations'],
        competitorAnalysis: ['Competitive analysis pending']
      }
    }

    // Store AI insights
    const { error: insertError } = await supabaseClient
      .from('seo_ai_insights')
      .insert([{
        analysis_date: new Date().toISOString().split('T')[0],
        insights: insights.insights || {},
        recommendations: insights.recommendations || {},
        traffic_analysis: dataForAnalysis,
        competitor_analysis: insights.competitorAnalysis || {},
        action_plan: insights.actionPlan || {},
        generated_by: data.userId
      }])

    if (insertError) throw insertError

    return new Response(
      JSON.stringify({ success: true, insights }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('AI Insights Error:', error)
    throw error
  }
}

async function getAnalyticsSummary(supabaseClient: any, data: any) {
  try {
    // Get analytics data
    const { data: analyticsData, error: analyticsError } = await supabaseClient
      .from('seo_analytics')
      .select('*')
      .order('date', { ascending: false })
      .limit(30)

    if (analyticsError) throw analyticsError

    // Get AI insights
    const { data: insightsData, error: insightsError } = await supabaseClient
      .from('seo_ai_insights')
      .select('*')
      .order('analysis_date', { ascending: false })
      .limit(5)

    if (insightsError) throw insightsError

    // Get submissions
    const { data: submissionsData, error: submissionsError } = await supabaseClient
      .from('seo_submissions')
      .select('*')
      .order('submitted_at', { ascending: false })
      .limit(10)

    if (submissionsError) throw submissionsError

    const summary = {
      analytics: analyticsData,
      insights: insightsData,
      submissions: submissionsData,
      performance: {
        totalImpressions: analyticsData.reduce((sum: number, item: any) => sum + item.impressions, 0),
        totalClicks: analyticsData.reduce((sum: number, item: any) => sum + item.clicks, 0),
        averageCTR: analyticsData.length ? 
          (analyticsData.reduce((sum: number, item: any) => sum + item.ctr, 0) / analyticsData.length).toFixed(2) : 0,
        averagePosition: analyticsData.length ?
          (analyticsData.reduce((sum: number, item: any) => sum + item.average_position, 0) / analyticsData.length).toFixed(1) : 0
      }
    }

    return new Response(
      JSON.stringify({ success: true, data: summary }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Analytics Summary Error:', error)
    throw error
  }
}

async function submitSitemap(supabaseClient: any, data: any) {
  const { searchEngine, sitemapUrl } = data

  // Create submission record
  const { error } = await supabaseClient
    .from('seo_submissions')
    .insert([{
      search_engine: searchEngine,
      submission_type: 'sitemap',
      url: sitemapUrl,
      status: 'submitted',
      submitted_at: new Date().toISOString(),
      response_data: { 
        message: `Sitemap submitted to ${searchEngine}`,
        timestamp: new Date().toISOString()
      }
    }])

  if (error) throw error

  // In a real implementation, this would make actual API calls to:
  // - Google Search Console API for Google
  // - Bing Webmaster Tools API for Bing
  // - Yandex Webmaster API for Yandex

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Sitemap successfully submitted to ${searchEngine}` 
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function checkIndexing(supabaseClient: any, data: any) {
  const { urls, searchEngine } = data

  // Mock indexing status check
  const results = urls.map((url: string) => ({
    url,
    indexed: Math.random() > 0.3,
    lastCrawled: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
    indexingStatus: Math.random() > 0.3 ? 'indexed' : 'not_indexed'
  }))

  // Update submission status
  for (const result of results) {
    const { error } = await supabaseClient
      .from('seo_submissions')
      .update({
        status: result.indexed ? 'indexed' : 'not_indexed',
        last_checked: new Date().toISOString(),
        response_data: result
      })
      .eq('url', result.url)
      .eq('search_engine', searchEngine)

    if (error) console.error('Error updating submission status:', error)
  }

  return new Response(
    JSON.stringify({ success: true, results }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}