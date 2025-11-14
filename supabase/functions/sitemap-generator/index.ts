import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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

    // Get published blog posts
    const { data: blogPosts, error: blogError } = await supabaseClient
      .from('blog_posts')
      .select('slug, updated_at')
      .eq('status', 'published')

    if (blogError) {
      console.error('Error fetching blog posts:', blogError)
    }

    // Generate sitemap XML
    const sitemap = generateSitemapXML(config.canonical_domain, metaTags || [], blogPosts || [])

    return new Response(sitemap, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/xml',
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('Sitemap Generation Error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateSitemapXML(canonicalDomain: string, metaTags: any[], blogPosts: any[]) {
  const staticPages = [
    // Core pages
    { path: '/', priority: '1.0', changefreq: 'daily' },
    { path: '/features', priority: '0.9', changefreq: 'weekly' },
    { path: '/pricing', priority: '0.9', changefreq: 'weekly' },
    { path: '/support', priority: '0.7', changefreq: 'monthly' },
    { path: '/knowledge-base', priority: '0.7', changefreq: 'weekly' },
    { path: '/tutorials', priority: '0.7', changefreq: 'weekly' },
    { path: '/resources', priority: '0.8', changefreq: 'weekly' },
    { path: '/tools', priority: '0.7', changefreq: 'monthly' },
    { path: '/roi-calculator', priority: '0.8', changefreq: 'monthly' },
    { path: '/tools/schedule-builder', priority: '0.8', changefreq: 'monthly' },
    
    // Authentication & onboarding
    { path: '/auth', priority: '0.3', changefreq: 'monthly' },
    { path: '/setup', priority: '0.3', changefreq: 'monthly' },
    
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

    // SEO-optimized feature pages (high priority for search)
    { path: '/features/job-costing', priority: '0.9', changefreq: 'weekly' },
    { path: '/features/real-time-budgeting', priority: '0.9', changefreq: 'weekly' },
    { path: '/features/financial-management', priority: '0.9', changefreq: 'weekly' },

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

    // Financial Intelligence Pillar (Phase 2 SEO - high priority content)
    { path: '/resources/financial-intelligence-guide', priority: '0.9', changefreq: 'weekly' },
    { path: '/resources/real-cost-delayed-job-costing', priority: '0.8', changefreq: 'monthly' },

    // Financial Intelligence Supporting Articles (Phase 3 - Content Velocity)
    { path: '/resources/budget-vs-actual-tracking-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/quickbooks-limitations-construction', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/cash-flow-management-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/calculate-true-project-profitability', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/reading-financial-statements-guide', priority: '0.8', changefreq: 'monthly' },
    { path: '/resources/construction-roi-calculator-guide', priority: '0.8', changefreq: 'monthly' },

    // Phase 4: Comparison & Competitive Content
    { path: '/resources/best-construction-software-small-business-2025', priority: '0.9', changefreq: 'monthly' },
    { path: '/resources/quickbooks-vs-construction-software', priority: '0.9', changefreq: 'monthly' },
    { path: '/resources/job-costing-software-comparison', priority: '0.9', changefreq: 'monthly' },
    { path: '/resources/procore-alternative-complete-guide', priority: '0.9', changefreq: 'monthly' },
    { path: '/resources/buildertrend-alternative-complete-guide', priority: '0.9', changefreq: 'monthly' },
  ]

  const allPages = [
    ...staticPages,
    ...metaTags.map(tag => ({
      path: tag.page_path,
      priority: '0.6',
      changefreq: 'weekly',
      lastmod: tag.updated_at
    })),
    ...blogPosts.map(post => ({
      path: `/resources/${post.slug}`,
      priority: '0.8',
      changefreq: 'monthly',
      lastmod: post.updated_at
    }))
  ]

  let sitemap = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
`

  for (const page of allPages) {
    const url = `${canonicalDomain}${page.path}`
    const lastmod = 'lastmod' in page && page.lastmod
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