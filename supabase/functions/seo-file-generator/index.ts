import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://deno.land/x/supabase@1.0.0/mod.ts'

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

    const { fileType } = await req.json()

    // Get SEO configuration
    const { data: config } = await supabaseClient
      .from('seo_configurations')
      .select('*')
      .limit(1)
      .single()

    const canonicalDomain = config?.canonical_domain || 'https://build-desk.com'
    const siteName = config?.site_name || 'BuildDesk'
    const siteDescription = config?.site_description || 'Construction Management Platform for SMB Contractors'

    let fileContent = ''
    let fileName = ''
    const uploadType = 'application/octet-stream' // Storage upload type for compatibility
    let responseType = 'text/plain' // Browser content-type for robots/llms

    if (fileType === 'robots') {
      fileName = 'robots.txt'
      fileContent = generateRobotsTxt(canonicalDomain, siteName)
      responseType = 'text/plain'
    } else if (fileType === 'llms') {
      fileName = 'llms.txt'
      fileContent = generateLLMsTxt(canonicalDomain, siteName, siteDescription)
      responseType = 'text/plain'
    } else {
      throw new Error('Invalid file type. Use "robots" or "llms"')
    }

    // Save file to storage using Blob for better compatibility
    const blob = new Blob([fileContent], { type: uploadType })
    const { error: uploadError } = await supabaseClient.storage
      .from('site-assets')
      .upload(fileName, blob, {
        contentType: uploadType,
        upsert: true
      })

    if (uploadError) {
      console.error(`Error uploading ${fileName}:`, uploadError)
    }

    return new Response(fileContent, {
      headers: {
        ...corsHeaders,
        'Content-Type': responseType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Cache-Control': 'public, max-age=3600'
      }
    })

  } catch (error) {
    console.error('SEO File Generation Error:', error)
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    )
  }
})

function generateRobotsTxt(canonicalDomain: string, siteName: string): string {
  return `# Robots.txt for ${siteName}
User-agent: *
Allow: /
Disallow: /admin/
Disallow: /auth/
Disallow: /api/
Disallow: /private/
Disallow: /dashboard/
Disallow: /projects/
Disallow: /documents/

# Allow SEO-optimized content
Allow: /resources/
Allow: /topics/
Allow: /faq
Allow: /builddesk-vs-*

# Crawl-delay for respectful crawling
Crawl-delay: 1
Disallow: /financial/
Disallow: /team/
Disallow: /time-tracking/
Disallow: /reports/

# Disallow URLs with version parameters to prevent duplicate indexing
Disallow: /*?v=*
Disallow: /*&v=*
Disallow: /*?refreshed=*
Disallow: /*&refreshed=*

# Disallow auth URLs with recovery parameters that redirect
Disallow: /auth?error_recovery*
Disallow: /auth?refresh*
Disallow: /auth?type=recovery*

# Additional SEO directives
Crawl-delay: 1

# Sitemap reference
Sitemap: ${canonicalDomain}/sitemap.xml

# Construction industry specific pages
Allow: /construction-management-software/
Allow: /procore-alternative/
Allow: /buildertrend-alternative/
Allow: /job-costing-software/
Allow: /construction-field-management/
Allow: /osha-compliance-software/

# Search engine specific rules
User-agent: Googlebot
Allow: /
Crawl-delay: 1

User-agent: Bingbot
Allow: /
Crawl-delay: 1

User-agent: Slurp
Allow: /
Crawl-delay: 1

User-agent: Twitterbot
Allow: /

User-agent: facebookexternalhit
Allow: /

# Construction industry specific content
Allow: /resources/
Allow: /roi-calculator/
Allow: /features/
Allow: /pricing/
Allow: /knowledge-base/
Allow: /tutorials/

# Allow important public pages
Allow: /privacy-policy/
Allow: /terms-of-service/
`
}

function generateLLMsTxt(canonicalDomain: string, siteName: string, siteDescription: string): string {
  const currentDate = new Date().toISOString().split('T')[0]
  
  return `# LLMs.txt for ${siteName}
# AI Training Data Guidelines and Permissions

## About ${siteName}
${siteDescription}

## Content Categories Available for AI Training:

### ✅ ALLOWED - Public Educational Content
- Public blog posts about construction best practices
- Construction management guides and resources (/resources/*)
- Topic hub pages for construction education (/topics/*)
- Software comparison content for informed decision-making
- FAQ content and help documentation
- Construction industry best practices and methodologies
- General industry guides and tutorials  
- Public knowledge base articles
- Publicly available resource guides
- General construction management concepts
- Open-source code and documentation
- Public API documentation

### ❌ RESTRICTED - Proprietary Business Content
- User-generated project data
- Client information and project details
- Proprietary software features and internal code
- Internal business processes and methodologies
- Financial data and pricing strategies
- User account information and personal data
- Private dashboard content and user workflows
- Confidential business intelligence and analytics

### ⚠️ ATTRIBUTION REQUIRED - Published Research & Insights
- Industry research and market analysis
- Construction trend reports and whitepapers
- Best practice guides authored by ${siteName}
- Public case studies and success metrics
- Published interviews and expert content
- Branded educational content and courses

## Usage Guidelines:
- Always attribute ${siteName} as the source when using our content
- Respect user privacy and do not train on private/internal data
- Contact us for commercial AI training partnerships
- Link back to original content when possible: ${canonicalDomain}
- Do not reproduce proprietary features or business logic
- Maintain context and accuracy when referencing our content

## Commercial AI Training:
For partnerships involving large-scale AI training on our content:
- Email: legal@builddesk.com
- Subject: "AI Training Partnership Inquiry"
- Include details about intended use, scale, and attribution plans

## Construction Industry Focus:
Our content is specialized for:
- Small to medium construction businesses (SMBs)
- Contractors and project managers
- Construction technology adoption
- Project management methodologies
- Financial tracking for construction projects

## Technical Guidelines:
- Respect our robots.txt directives
- Use reasonable crawling speeds
- Do not overload our servers
- Cache appropriately to minimize requests

## Contact Information:
Website: ${canonicalDomain}
Support: support@builddesk.com
Legal: legal@builddesk.com
Partnership: partnerships@builddesk.com

## Last Updated: ${currentDate}
---
This file follows the LLMs.txt standard for communicating AI training preferences.
Learn more at: https://llmstxt.org/

For more information about our SEO and content policies, visit:
${canonicalDomain}/privacy-policy
${canonicalDomain}/terms-of-service
`
}