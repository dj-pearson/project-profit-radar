import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

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
    const { data: config, error: configError } = await supabaseClient
      .from('seo_configurations')
      .select('*')
      .limit(1)
      .single()

    if (configError) {
      throw new Error('SEO configuration not found')
    }

    // Get all meta tags for dynamic pages
    const { data: metaTags, error: metaError } = await supabaseClient
      .from('seo_meta_tags')
      .select('*')
      .eq('no_index', false)

    if (metaError) throw metaError

    // Generate sitemap XML
    const sitemap = generateSitemapXML(config.canonical_domain, metaTags || [])

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
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSitemapXML(canonicalDomain: string, metaTags: any[]) {
  const staticPages = [
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/features', priority: '0.8', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.8', changefreq: 'weekly' },
    { path: '/resources', priority: '0.6', changefreq: 'weekly' },
    { path: '/faq', priority: '0.5', changefreq: 'monthly' },
    { path: '/topics/construction-management-basics', priority: '0.6', changefreq: 'monthly' },
    { path: '/topics/safety-and-osha-compliance', priority: '0.6', changefreq: 'monthly' },
    
    // Resource Guides
    { path: '/resources/best-construction-management-software-small-business-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/job-costing-construction-setup-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/osha-safety-logs-digital-playbook', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-scheduling-software-prevent-delays', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-daily-logs-best-practices', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/quickbooks-integration-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-mobile-app-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/procore-vs-builddesk-small-contractors', priority: '0.8', changefreq: 'monthly' },
    
    // Comparison Pages
    { path: '/builddesk-vs-buildertrend-comparison', priority: '0.8', changefreq: 'monthly' },
    { path: '/builddesk-vs-coconstruct', priority: '0.8', changefreq: 'monthly' },
  ]

  const allPages = [
    ...staticPages,
    ...metaTags.map(tag => ({
      path: tag.page_path,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: tag.updated_at
    }))
  ]

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

  for (const page of allPages) {
    const url = `${canonicalDomain}${page.path}`
    const lastmod = page.lastmod 
      ? new Date(page.lastmod).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0]

    sitemap += `  <url>
    <loc>${url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
  </url>
`
  }

  sitemap += `</urlset>`

  return sitemap
}