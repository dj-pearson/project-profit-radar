// Crawl Site Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface CrawlRequest {
  start_url: string;
  max_pages?: number;
  max_depth?: number;
  audit_id?: string;
}

serve(async (req) => {
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
    console.log("[CRAWL-SITE] User authenticated", { userId: user.id, siteId });

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

    const requestData: CrawlRequest = await req.json();
    const { start_url, max_pages = 50, max_depth = 3, audit_id } = requestData;

    if (!start_url) {
      return new Response(
        JSON.stringify({ error: 'start_url is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Starting crawl from: ${start_url}, max_pages: ${max_pages}, max_depth: ${max_depth}`);
    const startTime = Date.now();

    const crawledPages: any[] = [];
    const visitedUrls = new Set<string>();
    const queuedUrls: Array<{ url: string; depth: number; parent: string | null }> = [
      { url: start_url, depth: 0, parent: null }
    ];

    const baseUrl = new URL(start_url);
    const baseDomain = baseUrl.hostname;

    while (queuedUrls.length > 0 && crawledPages.length < max_pages) {
      const current = queuedUrls.shift()!;

      if (visitedUrls.has(current.url) || current.depth > max_depth) {
        continue;
      }

      visitedUrls.add(current.url);

      try {
        const response = await fetch(current.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; SEOCrawlerBot/1.0)',
          },
        });

        const html = await response.text();
        const statusCode = response.status;

        // Parse basic page elements
        const titleMatch = html.match(/<title[^>]*>(.*?)<\/title>/i);
        const metaDescMatch = html.match(/<meta[^>]*name=["']description["'][^>]*content=["']([^"']*)["']/i);
        const h1Matches = html.match(/<h1[^>]*>(.*?)<\/h1>/gi);
        const canonicalMatch = html.match(/<link[^>]*rel=["']canonical["'][^>]*href=["']([^"']*)["']/i);
        const robotsMatch = html.match(/<meta[^>]*name=["']robots["'][^>]*content=["']([^"']*)["']/i);

        // Extract internal links
        const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["']/gi);
        const internalLinks: string[] = [];
        let internalLinksCount = 0;
        let externalLinksCount = 0;

        for (const match of linkMatches) {
          try {
            const href = match[1];
            if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
              continue;
            }

            const absoluteUrl = new URL(href, current.url).href;
            const linkDomain = new URL(absoluteUrl).hostname;

            if (linkDomain === baseDomain) {
              internalLinksCount++;
              if (current.depth < max_depth && !visitedUrls.has(absoluteUrl)) {
                internalLinks.push(absoluteUrl);
              }
            } else {
              externalLinksCount++;
            }
          } catch (e) {
            // Invalid URL, skip
          }
        }

        // Count images
        const imageMatches = html.match(/<img[^>]*>/gi);
        const imagesCount = imageMatches ? imageMatches.length : 0;

        // Count scripts and stylesheets
        const scriptMatches = html.match(/<script[^>]*>/gi);
        const stylesMatches = html.match(/<link[^>]*rel=["']stylesheet["']/gi);

        const pageData = {
          site_id: siteId,  // CRITICAL: Site isolation
          url: current.url,
          canonical_url: canonicalMatch ? canonicalMatch[1] : null,
          status_code: statusCode,
          page_title: titleMatch ? titleMatch[1] : null,
          meta_description: metaDescMatch ? metaDescMatch[1] : null,
          h1_tags: h1Matches || [],
          word_count: html.replace(/<[^>]*>/g, '').split(/\s+/).length,
          load_time_ms: null,
          page_size_bytes: html.length,
          resource_count: (scriptMatches?.length || 0) + (stylesMatches?.length || 0) + imagesCount,
          has_title: !!titleMatch,
          has_meta_description: !!metaDescMatch,
          has_h1: !!(h1Matches && h1Matches.length > 0),
          has_canonical: !!canonicalMatch,
          has_robots_meta: !!robotsMatch,
          robots_directives: robotsMatch ? robotsMatch[1].split(',').map(d => d.trim()) : [],
          internal_links_count: internalLinksCount,
          external_links_count: externalLinksCount,
          images_count: imagesCount,
          scripts_count: scriptMatches?.length || 0,
          stylesheets_count: stylesMatches?.length || 0,
          is_indexable: !robotsMatch || !robotsMatch[1].toLowerCase().includes('noindex'),
          is_crawlable: !robotsMatch || !robotsMatch[1].toLowerCase().includes('nofollow'),
          has_errors: statusCode >= 400,
          error_type: statusCode >= 400 ? (statusCode >= 500 ? 'server_error' : 'client_error') : null,
          error_message: statusCode >= 400 ? `HTTP ${statusCode}` : null,
          crawl_depth: current.depth,
          parent_url: current.parent,
          discovered_via: current.parent ? 'link' : 'direct',
          audit_id: audit_id,
        };

        crawledPages.push(pageData);

        // Add internal links to queue
        for (const link of internalLinks.slice(0, 10)) {
          if (!visitedUrls.has(link)) {
            queuedUrls.push({
              url: link,
              depth: current.depth + 1,
              parent: current.url
            });
          }
        }

      } catch (error) {
        console.error(`Error crawling ${current.url}:`, error);
        crawledPages.push({
          site_id: siteId,  // CRITICAL: Site isolation
          url: current.url,
          status_code: 0,
          has_errors: true,
          error_type: 'fetch_error',
          error_message: error.message,
          crawl_depth: current.depth,
          parent_url: current.parent,
          audit_id: audit_id,
        });
      }
    }

    // Save all crawled pages to database
    if (crawledPages.length > 0) {
      const { error: insertError } = await supabaseClient
        .from('seo_crawl_results')
        .insert(crawledPages);

      if (insertError) {
        console.error('Error saving crawl results:', insertError);
      }
    }

    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`Crawl completed. Pages: ${crawledPages.length}, Duration: ${duration}s`);

    return new Response(
      JSON.stringify({
        success: true,
        crawl_summary: {
          pages_crawled: crawledPages.length,
          max_depth_reached: Math.max(...crawledPages.map(p => p.crawl_depth || 0)),
          duration_seconds: duration,
          pages_with_errors: crawledPages.filter(p => p.has_errors).length,
          indexable_pages: crawledPages.filter(p => p.is_indexable).length,
        },
        pages: crawledPages,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Crawl Site Error:', error);
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
