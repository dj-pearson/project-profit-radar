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

    const { action } = await req.json()

    switch (action) {
      case 'sync_seo_pages':
        return await syncSEOPages(supabaseClient)
      case 'update_schema_markup':
        return await updateSchemaMarkup(supabaseClient)
      case 'refresh_seo_config':
        return await refreshSEOConfig(supabaseClient)
      default:
        throw new Error('Invalid action')
    }

  } catch (error) {
    console.error('SEO Backend Integration Error:', error)
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

async function syncSEOPages(supabaseClient: any) {
  // Define all our new SEO-optimized pages
  const seoPages = [
    // Homepage
    {
      page_path: '/',
      title: 'Construction Management Software for Small & Mid GC Teams | BuildDesk',
      description: 'Job costing, scheduling, daily logs, OSHA reporting, and time tracking in one simple tool for U.S. contractors. Simple setup, fast onboarding, clear dashboards for jobs, crews, and costs.',
      keywords: ['construction management software', 'construction software for small business', 'job costing software construction', 'procore alternative small contractors'],
      schema_markup: generateHomepageSchema(),
      priority: 1.0,
      change_frequency: 'daily'
    },

    // Resource Guides
    {
      page_path: '/resources/best-construction-management-software-small-business-2025',
      title: 'Best Construction Management Software for Small Business (2025) | BuildDesk',
      description: 'Complete guide to choosing construction management software for small contractors. Compare features, pricing, and ROI of top 10 platforms.',
      keywords: ['best construction management software', 'construction software small business', 'contractor software comparison'],
      schema_markup: generateArticleSchema('Best Construction Management Software for Small Business (2025)'),
      priority: 0.8,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/job-costing-construction-setup-guide',
      title: 'Job Costing in Construction: Setup Guide & Common Mistakes | BuildDesk',
      description: 'Master job costing with our step-by-step guide. Learn to track costs, improve margins, and avoid costly mistakes.',
      keywords: ['job costing construction', 'construction cost tracking', 'construction profit margins'],
      schema_markup: generateHowToSchema('Job Costing Setup'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/osha-safety-logs-digital-playbook',
      title: 'OSHA Safety Logs: Digital Playbook for Construction Teams | BuildDesk',
      description: 'Complete guide to OSHA compliance. Templates, workflows, and digital tools to keep your team safe and compliant.',
      keywords: ['OSHA safety logs', 'construction safety compliance', 'OSHA digital forms'],
      schema_markup: generateHowToSchema('OSHA Compliance'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/construction-scheduling-software-prevent-delays',
      title: 'Construction Scheduling Software: Stop Project Delays | BuildDesk',
      description: 'Simple scheduling rules that prevent delays. Learn how small contractors can improve project timelines.',
      keywords: ['construction scheduling software', 'project scheduling construction', 'prevent construction delays'],
      schema_markup: generateArticleSchema('Construction Scheduling Software Guide'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/construction-daily-logs-best-practices',
      title: 'Construction Daily Logs: What to Track and Why It Pays | BuildDesk',
      description: 'Essential guide to daily logs that reduce rework and improve project outcomes. Templates and best practices included.',
      keywords: ['construction daily logs', 'construction field reports', 'daily log templates'],
      schema_markup: generateHowToSchema('Daily Log Management'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/quickbooks-integration-guide',
      title: 'QuickBooks Integration Guide for Construction Companies | BuildDesk',
      description: 'Step-by-step guide to integrate QuickBooks with construction management software. Eliminate double entry, sync job costs automatically.',
      keywords: ['quickbooks construction integration', 'construction accounting software', 'job cost accounting'],
      schema_markup: generateHowToSchema('QuickBooks Integration'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    {
      page_path: '/resources/construction-mobile-app-guide',
      title: 'Best Construction Mobile Apps 2025 | Field Management Software',
      description: 'Discover the top construction mobile apps for field teams. Compare features, pricing, and benefits of leading construction management mobile solutions.',
      keywords: ['construction mobile app', 'field management software', 'construction app offline'],
      schema_markup: generateArticleSchema('Construction Mobile App Guide'),
      priority: 0.7,
      change_frequency: 'monthly'
    },

    // Comparison Pages
    {
      page_path: '/resources/procore-vs-builddesk-small-contractors',
      title: 'Procore vs BuildDesk: Which is Better for Small GC Teams? | 2025 Comparison',
      description: 'Honest comparison of Procore and BuildDesk for small contractors. Features, pricing, and ease of use compared.',
      keywords: ['procore vs builddesk', 'procore alternative', 'construction software comparison'],
      schema_markup: generateComparisonSchema('Procore vs BuildDesk'),
      priority: 0.8,
      change_frequency: 'monthly'
    },

    {
      page_path: '/builddesk-vs-buildertrend-comparison',
      title: 'BuildDesk vs Buildertrend: Feature & Pricing Comparison 2025',
      description: 'Side-by-side comparison of BuildDesk and Buildertrend for residential and commercial contractors.',
      keywords: ['builddesk vs buildertrend', 'buildertrend alternative', 'residential construction software'],
      schema_markup: generateComparisonSchema('BuildDesk vs Buildertrend'),
      priority: 0.8,
      change_frequency: 'monthly'
    },

    {
      page_path: '/builddesk-vs-coconstruct',
      title: 'BuildDesk vs CoConstruct 2025: Which is Better for Your Construction Business?',
      description: 'Compare BuildDesk and CoConstruct construction management software. See pricing, features, pros and cons.',
      keywords: ['builddesk vs coconstruct', 'coconstruct alternative', 'construction management software comparison'],
      schema_markup: generateComparisonSchema('BuildDesk vs CoConstruct'),
      priority: 0.8,
      change_frequency: 'monthly'
    },

    // Topic Hubs
    {
      page_path: '/topics/construction-management-basics',
      title: 'Construction Management Basics: Complete Guide for Small Contractors',
      description: 'Master construction management fundamentals: project planning, cost control, team management, and execution strategies.',
      keywords: ['construction management basics', 'construction project management', 'contractor management guide'],
      schema_markup: generateTopicHubSchema('Construction Management Basics'),
      priority: 0.6,
      change_frequency: 'monthly'
    },

    {
      page_path: '/topics/safety-and-osha-compliance',
      title: 'Safety & OSHA Compliance Hub: Construction Safety Management',
      description: 'Comprehensive safety management resources: OSHA compliance, digital safety tools, incident reporting, and best practices.',
      keywords: ['construction safety management', 'OSHA compliance', 'construction safety tools'],
      schema_markup: generateTopicHubSchema('Safety & OSHA Compliance'),
      priority: 0.6,
      change_frequency: 'monthly'
    },

    // Core Pages
    {
      page_path: '/faq',
      title: 'Frequently Asked Questions | BuildDesk Construction Management',
      description: 'Get answers to common questions about BuildDesk construction management software. Pricing, features, implementation, and more.',
      keywords: ['builddesk faq', 'construction software questions', 'construction management help'],
      schema_markup: generateFAQSchema(),
      priority: 0.5,
      change_frequency: 'monthly'
    }
  ]

  // Upsert all SEO pages to the database
  for (const page of seoPages) {
    const { error } = await supabaseClient
      .from('seo_meta_tags')
      .upsert({
        ...page,
        no_index: false,
        no_follow: false,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'page_path'
      })

    if (error) {
      console.error(`Error upserting page ${page.page_path}:`, error)
    }
  }

  return new Response(
    JSON.stringify({ 
      success: true, 
      message: `Synced ${seoPages.length} SEO pages to database`,
      pages: seoPages.length
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function updateSchemaMarkup(supabaseClient: any) {
  // Update global schema configurations
  const globalSchemas = {
    organization: generateOrganizationSchema(),
    software: generateSoftwareSchema(),
    website: generateWebsiteSchema()
  }

  const { error } = await supabaseClient
    .from('seo_configurations')
    .upsert({
      id: 1,
      canonical_domain: 'https://builddesk.com',
      site_name: 'BuildDesk',
      site_description: 'Construction Management Platform for SMB Contractors',
      global_schema: globalSchemas,
      updated_at: new Date().toISOString()
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'Schema markup updated' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

async function refreshSEOConfig(supabaseClient: any) {
  // Refresh SEO configuration with latest optimizations
  const seoConfig = {
    meta_defaults: {
      title_suffix: ' | BuildDesk',
      og_type: 'website',
      twitter_card: 'summary_large_image',
      twitter_site: '@builddesk'
    },
    performance_thresholds: {
      lcp: 2500,
      fid: 100,
      cls: 0.1,
      fcp: 1800,
      ttfb: 600
    },
    ai_search_optimization: true,
    local_seo_enabled: true,
    service_areas: ['Colorado', 'Wyoming', 'Utah', 'New Mexico']
  }

  const { error } = await supabaseClient
    .from('seo_configurations')
    .upsert({
      id: 1,
      ...seoConfig,
      updated_at: new Date().toISOString()
    })

  if (error) throw error

  return new Response(
    JSON.stringify({ success: true, message: 'SEO configuration refreshed' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  )
}

// Schema generation functions
function generateHomepageSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BuildDesk Construction Management",
    "applicationCategory": "Construction Management Software",
    "operatingSystem": "Web, iOS, Android",
    "description": "Construction management platform built for growing teams. Real-time project visibility without enterprise complexity.",
    "offers": {
      "@type": "Offer",
      "price": "149",
      "priceCurrency": "USD"
    },
    "aggregateRating": {
      "@type": "AggregateRating",
      "ratingValue": "4.8",
      "reviewCount": "247"
    }
  }
}

function generateArticleSchema(title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": title,
    "author": {
      "@type": "Organization",
      "name": "BuildDesk"
    },
    "publisher": {
      "@type": "Organization",
      "name": "BuildDesk",
      "logo": {
        "@type": "ImageObject",
        "url": "https://builddesk.com/logo.png"
      }
    },
    "datePublished": new Date().toISOString(),
    "dateModified": new Date().toISOString()
  }
}

function generateHowToSchema(name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "HowTo",
    "name": `How to ${name}`,
    "description": `Complete guide to ${name} for construction contractors`,
    "publisher": {
      "@type": "Organization",
      "name": "BuildDesk"
    }
  }
}

function generateComparisonSchema(title: string) {
  return {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `https://builddesk.com#${title.replace(/\s+/g, '-').toLowerCase()}`,
    "headline": title,
    "description": `Detailed comparison of construction management software platforms`,
    "author": {
      "@type": "Organization",
      "name": "BuildDesk"
    }
  }
}

function generateTopicHubSchema(name: string) {
  return {
    "@context": "https://schema.org",
    "@type": "WebPage",
    "name": `${name} Hub`,
    "description": `Comprehensive resources and guides for ${name}`,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        {
          "@type": "ListItem",
          "position": 1,
          "name": "Home",
          "item": "https://builddesk.com"
        },
        {
          "@type": "ListItem",
          "position": 2,
          "name": "Topics",
          "item": "https://builddesk.com/topics"
        },
        {
          "@type": "ListItem",
          "position": 3,
          "name": name
        }
      ]
    }
  }
}

function generateFAQSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": [
      {
        "@type": "Question",
        "name": "How much does BuildDesk cost?",
        "acceptedAnswer": {
          "@type": "Answer",
          "text": "BuildDesk pricing starts at $149/month for unlimited users with core features."
        }
      }
    ]
  }
}

function generateOrganizationSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    "name": "BuildDesk",
    "url": "https://builddesk.com",
    "logo": "https://builddesk.com/logo.png",
    "sameAs": [
      "https://linkedin.com/company/builddesk",
      "https://twitter.com/builddesk"
    ]
  }
}

function generateSoftwareSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    "name": "BuildDesk",
    "applicationCategory": "Construction Management Software",
    "operatingSystem": "Web, iOS, Android"
  }
}

function generateWebsiteSchema() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "name": "BuildDesk",
    "url": "https://builddesk.com",
    "potentialAction": {
      "@type": "SearchAction",
      "target": "https://builddesk.com/search?q={search_term_string}",
      "query-input": "required name=search_term_string"
    }
  }
}