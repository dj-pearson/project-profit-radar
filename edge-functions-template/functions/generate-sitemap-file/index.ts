import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.3'

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

    // Get SEO configuration
    const { data: config } = await supabaseClient
      .from('seo_configurations')
      .select('*')
      .limit(1)
      .single()

    const canonicalDomain = config?.canonical_domain || 'https://build-desk.com'

    // Generate comprehensive sitemap
    const sitemap = generateComprehensiveSitemap(canonicalDomain)

    // Save sitemap to storage using Blob for better compatibility
    const blob = new Blob([sitemap], { type: 'application/octet-stream' })
    const { error: uploadError } = await supabaseClient.storage
      .from('site-assets')
      .upload('sitemap.xml', blob, {
        contentType: 'application/octet-stream',
        upsert: true
      })

    if (uploadError) {
      console.error('Error uploading sitemap:', uploadError)
    }

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Sitemap Generation Error:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateComprehensiveSitemap(canonicalDomain: string) {
  const currentDate = new Date().toISOString().split('T')[0]
  
  const pages = [
    // Main pages
    { path: '/', priority: '1.0', changefreq: 'daily', lastmod: currentDate },
    { path: '/auth', priority: '0.3', changefreq: 'monthly', lastmod: currentDate },
    
    // Marketing pages
    { path: '/features', priority: '0.9', changefreq: 'weekly', lastmod: currentDate },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly', lastmod: currentDate },
    { path: '/resources', priority: '0.8', changefreq: 'weekly', lastmod: currentDate },
    { path: '/roi-calculator', priority: '0.7', changefreq: 'monthly', lastmod: currentDate },
    
    // Public content
    { path: '/knowledge-base', priority: '0.6', changefreq: 'weekly', lastmod: currentDate },
    { path: '/tutorials', priority: '0.6', changefreq: 'weekly', lastmod: currentDate },
    { path: '/blog-manager', priority: '0.5', changefreq: 'weekly', lastmod: currentDate },
    
    // Legal pages
    { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly', lastmod: currentDate },
    { path: '/terms-of-service', priority: '0.4', changefreq: 'yearly', lastmod: currentDate },
    
    // Industry-specific pages
    { path: '/construction-management', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
    { path: '/project-management', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
    { path: '/contractor-software', priority: '0.8', changefreq: 'monthly', lastmod: currentDate },
  ]

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">
`

  for (const page of pages) {
    const url = `${canonicalDomain}${page.path}`
    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${page.lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
  }

  sitemap += `</urlset>`

  return sitemap
}