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
    // Core pages
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/features', priority: '0.9', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/resources', priority: '0.8', changefreq: 'weekly' },
    { path: '/tools/roi-calculator', priority: '0.8', changefreq: 'monthly' },
    { path: '/tools/schedule-builder', priority: '0.8', changefreq: 'monthly' },
    
    // Authentication & onboarding
    { path: '/auth', priority: '0.3', changefreq: 'monthly' },
    { path: '/setup', priority: '0.3', changefreq: 'monthly' },
    
    // Public content pages
    { path: '/blog-manager', priority: '0.6', changefreq: 'weekly' },
    { path: '/knowledge-base', priority: '0.7', changefreq: 'weekly' },
    { path: '/tutorials', priority: '0.7', changefreq: 'weekly' },
    
    // Legal pages
    { path: '/privacy-policy', priority: '0.4', changefreq: 'yearly' },
    { path: '/terms-of-service', priority: '0.4', changefreq: 'yearly' },
    
    // Industry/SEO pages
    { path: '/construction-management-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/procore-alternative', priority: '0.8', changefreq: 'monthly' },
    { path: '/buildertrend-alternative', priority: '0.8', changefreq: 'monthly' },
    { path: '/job-costing-software', priority: '0.8', changefreq: 'monthly' },
    { path: '/construction-field-management', priority: '0.8', changefreq: 'monthly' },
    { path: '/osha-compliance-software', priority: '0.8', changefreq: 'monthly' },

    // Industry pages
    { path: '/residential-contractors', priority: '0.7', changefreq: 'monthly' },
    { path: '/commercial-contractors', priority: '0.7', changefreq: 'monthly' },
    { path: '/electrical-contractor-software', priority: '0.7', changefreq: 'monthly' },
    { path: '/hvac-contractor-software', priority: '0.7', changefreq: 'monthly' },
    { path: '/plumbing-contractor-software', priority: '0.7', changefreq: 'monthly' },

    // Blog/Resource articles with /resources prefix
    { path: '/resources/procore-alternatives-smb-contractors-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/top-10-construction-platforms-august-2025', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-management-software-comparison', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/small-business-construction-software-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-project-management-best-practices', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-roi-calculator-guide', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-scheduling-templates', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-cost-estimation-methods', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-compliance-checklist', priority: '0.7', changefreq: 'monthly' },
    { path: '/resources/construction-crm-implementation-guide', priority: '0.7', changefreq: 'monthly' },
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