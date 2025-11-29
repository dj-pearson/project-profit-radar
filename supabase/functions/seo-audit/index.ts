// SEO Audit Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface SEOAuditRequest {
  url: string;
  audit_type?: 'full' | 'quick' | 'technical' | 'content';
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    console.log("[SEO-AUDIT] User authenticated", { userId: user.id, siteId });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get request data
    const requestData: SEOAuditRequest = await req.json();
    const { url, audit_type = 'full' } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting ${audit_type} SEO audit for: ${url}`);
    const startTime = Date.now();

    // Initialize audit results
    const auditResults = {
      url,
      audit_type,
      status: 'completed',
      overall_score: 0,
      seo_score: 0,
      performance_score: 0,
      accessibility_score: 0,
      best_practices_score: 0,
      critical_issues: 0,
      warnings: 0,
      notices: 0,
      issues: [] as any[],
      recommendations: [] as any[],
      metrics: {},
    };

    // Fetch the page
    let pageResponse;
    let pageHTML = '';

    try {
      pageResponse = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; SEOAuditBot/1.0)',
        },
      });
      pageHTML = await pageResponse.text();
    } catch (error) {
      return new Response(
        JSON.stringify({
          error: 'Failed to fetch URL',
          message: error.message,
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse HTML to check basic SEO elements
    const titleMatch = pageHTML.match(/<title[^>]*>(.*?)<\/title>/i);
    const metaDescMatch = pageHTML.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
    const h1Matches = pageHTML.match(/<h1[^>]*>.*?<\/h1>/gi);
    const canonicalMatch = pageHTML.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
    const robotsMatch = pageHTML.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);
    const ogImageMatch = pageHTML.match(/<meta[^>]*property=["']og:image["'][^>]*content=["']([^"']*)["']/i);
    const schemaMatch = pageHTML.match(/<script[^>]*type=["']application\/ld\+json["'][^>]*>(.*?)<\/script>/gi);

    // Calculate scores based on findings
    let seoScore = 100;
    let issues = [];
    let recommendations = [];

    // Title tag check
    if (!titleMatch || !titleMatch[1]) {
      seoScore -= 15;
      auditResults.critical_issues++;
      issues.push({
        type: 'missing_title',
        severity: 'critical',
        message: 'Missing title tag',
        impact: 'High negative impact on SEO',
      });
    } else {
      const titleLength = titleMatch[1].length;
      if (titleLength < 30 || titleLength > 60) {
        seoScore -= 5;
        auditResults.warnings++;
        issues.push({
          type: 'title_length',
          severity: 'warning',
          message: `Title length (${titleLength}) is not optimal (30-60 characters)`,
          impact: 'Moderate impact on click-through rate',
        });
      }
    }

    // Meta description check
    if (!metaDescMatch || !metaDescMatch[1]) {
      seoScore -= 10;
      auditResults.warnings++;
      issues.push({
        type: 'missing_meta_description',
        severity: 'warning',
        message: 'Missing meta description',
        impact: 'Moderate negative impact on click-through rate',
      });
    } else {
      const descLength = metaDescMatch[1].length;
      if (descLength < 120 || descLength > 160) {
        seoScore -= 3;
        auditResults.notices++;
        issues.push({
          type: 'meta_description_length',
          severity: 'notice',
          message: `Meta description length (${descLength}) is not optimal (120-160 characters)`,
          impact: 'Minor impact on click-through rate',
        });
      }
    }

    // H1 tag check
    if (!h1Matches || h1Matches.length === 0) {
      seoScore -= 10;
      auditResults.warnings++;
      issues.push({
        type: 'missing_h1',
        severity: 'warning',
        message: 'Missing H1 tag',
        impact: 'Moderate negative impact on content structure',
      });
    } else if (h1Matches.length > 1) {
      seoScore -= 5;
      auditResults.notices++;
      issues.push({
        type: 'multiple_h1',
        severity: 'notice',
        message: `Multiple H1 tags found (${h1Matches.length})`,
        impact: 'Minor impact on content hierarchy',
      });
    }

    // Canonical URL check
    if (!canonicalMatch) {
      seoScore -= 5;
      auditResults.notices++;
      issues.push({
        type: 'missing_canonical',
        severity: 'notice',
        message: 'Missing canonical URL',
        impact: 'May cause duplicate content issues',
      });
      recommendations.push('Add a canonical URL to avoid duplicate content issues');
    }

    // Schema markup check
    if (!schemaMatch || schemaMatch.length === 0) {
      seoScore -= 8;
      auditResults.warnings++;
      issues.push({
        type: 'missing_schema',
        severity: 'warning',
        message: 'No structured data (Schema.org) found',
        impact: 'Missing opportunity for rich results',
      });
      recommendations.push('Add structured data markup for better search visibility');
    }

    // HTTPS check
    if (!url.startsWith('https://')) {
      seoScore -= 15;
      auditResults.critical_issues++;
      issues.push({
        type: 'no_https',
        severity: 'critical',
        message: 'Page not served over HTTPS',
        impact: 'Critical security and ranking factor',
      });
      recommendations.push('Implement HTTPS immediately for security and SEO benefits');
    }

    // Open Graph image check
    if (!ogImageMatch) {
      seoScore -= 3;
      auditResults.notices++;
      issues.push({
        type: 'missing_og_image',
        severity: 'notice',
        message: 'Missing Open Graph image',
        impact: 'Affects social media sharing appearance',
      });
      recommendations.push('Add Open Graph image for better social media presence');
    }

    // Check for PageSpeed Insights data if API key is available
    const pagespeedApiKey = Deno.env.get('PAGESPEED_INSIGHTS_API_KEY');
    let performanceScore = 0;
    let lighthouseData = null;

    if (pagespeedApiKey) {
      try {
        const pagespeedUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(url)}&key=${pagespeedApiKey}&category=PERFORMANCE&category=SEO&category=ACCESSIBILITY&category=BEST_PRACTICES`;
        const pagespeedResponse = await fetch(pagespeedUrl);

        if (pagespeedResponse.ok) {
          const pagespeedData = await pagespeedResponse.json();
          lighthouseData = pagespeedData.lighthouseResult;

          performanceScore = Math.round(lighthouseData.categories.performance.score * 100);
          auditResults.accessibility_score = Math.round(lighthouseData.categories.accessibility.score * 100);
          auditResults.best_practices_score = Math.round(lighthouseData.categories['best-practices'].score * 100);

          if (lighthouseData.categories.seo) {
            const lighthouseSeoScore = Math.round(lighthouseData.categories.seo.score * 100);
            // Blend our SEO score with Lighthouse's SEO score
            seoScore = Math.round((seoScore + lighthouseSeoScore) / 2);
          }
        }
      } catch (error) {
        console.warn('Failed to fetch PageSpeed Insights data:', error);
      }
    }

    auditResults.seo_score = Math.max(0, Math.round(seoScore));
    auditResults.performance_score = performanceScore;
    auditResults.overall_score = Math.round(
      (auditResults.seo_score + auditResults.performance_score +
       auditResults.accessibility_score + auditResults.best_practices_score) / 4
    );
    auditResults.issues = issues;
    auditResults.recommendations = recommendations;
    auditResults.lighthouse_data = lighthouseData;

    const duration = Math.round((Date.now() - startTime) / 1000);

    // Save audit to database with site isolation
    const { data: auditRecord, error: insertError } = await supabaseClient
      .from('seo_audit_history')
      .insert({
        site_id: siteId,  // CRITICAL: Site isolation
        url,
        audit_type,
        status: 'completed',
        overall_score: auditResults.overall_score,
        seo_score: auditResults.seo_score,
        performance_score: auditResults.performance_score,
        accessibility_score: auditResults.accessibility_score,
        best_practices_score: auditResults.best_practices_score,
        critical_issues: auditResults.critical_issues,
        warnings: auditResults.warnings,
        notices: auditResults.notices,
        issues: auditResults.issues,
        recommendations: auditResults.recommendations,
        metrics: auditResults.metrics,
        lighthouse_data: lighthouseData,
        duration_seconds: duration,
        created_by: user.id,
      })
      .select()
      .single();

    if (insertError) {
      console.error('Error saving audit:', insertError);
    }

    console.log(`Audit completed in ${duration}s. Overall score: ${auditResults.overall_score}/100`);

    return new Response(
      JSON.stringify({
        success: true,
        audit: {
          ...auditResults,
          duration_seconds: duration,
          audit_id: auditRecord?.id,
        },
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('SEO Audit Error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});
