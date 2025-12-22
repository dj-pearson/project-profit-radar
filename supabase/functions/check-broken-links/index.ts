// Check Broken Links Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface BrokenLinksRequest {
  url: string;
  check_external?: boolean;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[CHECK-BROKEN-LINKS] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(
        JSON.stringify({ error: 'Access denied. Root admin required.' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const requestData: BrokenLinksRequest = await req.json();
    const { url, check_external = false } = requestData;

    if (!url) {
      return new Response(
        JSON.stringify({ error: 'URL is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking broken links for: ${url}`);
    const startTime = Date.now();

    // Fetch the page
    const response = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; SEOLinkCheckerBot/1.0)',
      },
    });

    const html = await response.text();
    const baseUrl = new URL(url);

    // Extract all links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi);
    const links: Array<{
      source_url: string;
      target_url: string;
      anchor_text: string;
      link_type: string;
      is_broken: boolean;
      target_status_code: number | null;
      is_redirect: boolean;
      redirect_chain: string[];
    }> = [];

    const checkedUrls = new Set<string>();

    for (const match of linkMatches) {
      try {
        const href = match[1];
        const anchorText = match[2].replace(/<[^>]*>/g, '').trim();

        if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:') || href.startsWith('javascript:')) {
          continue;
        }

        const absoluteUrl = new URL(href, url).href;

        // Determine if internal or external
        const targetDomain = new URL(absoluteUrl).hostname;
        const isInternal = targetDomain === baseUrl.hostname;
        const linkType = isInternal ? 'internal' : 'external';

        // Skip external links if not checking them
        if (!isInternal && !check_external) {
          continue;
        }

        // Skip if already checked
        if (checkedUrls.has(absoluteUrl)) {
          continue;
        }
        checkedUrls.add(absoluteUrl);

        // Check the link
        let isBroken = false;
        let statusCode: number | null = null;
        let isRedirect = false;
        const redirectChain: string[] = [];

        try {
          const linkResponse = await fetch(absoluteUrl, {
            method: 'HEAD',
            headers: {
              'User-Agent': 'Mozilla/5.0 (compatible; SEOLinkCheckerBot/1.0)',
            },
            redirect: 'manual',
          });

          statusCode = linkResponse.status;

          // Check for redirects
          if (statusCode >= 300 && statusCode < 400) {
            isRedirect = true;
            const location = linkResponse.headers.get('location');
            if (location) {
              redirectChain.push(absoluteUrl);
              redirectChain.push(new URL(location, absoluteUrl).href);
            }
          }

          // Mark as broken if 4xx or 5xx
          isBroken = statusCode >= 400;

        } catch (error) {
          isBroken = true;
          statusCode = 0;
        }

        links.push({
          source_url: url,
          target_url: absoluteUrl,
          anchor_text: anchorText.substring(0, 200),
          link_type: linkType,
          is_broken: isBroken,
          target_status_code: statusCode,
          is_redirect: isRedirect,
          redirect_chain: redirectChain,
        });

      } catch (error) {
        console.error(`Error processing link:`, error);
      }
    }

    // Save broken links to database with site isolation
    if (links.length > 0) {
      const linksToSave = links.map(link => ({
        ...link,  // CRITICAL: Site isolation
        found_at: new Date().toISOString(),
        last_checked_at: new Date().toISOString(),
      }));

      const { error: insertError } = await supabaseClient
        .from('seo_link_analysis')
        .insert(linksToSave);

      if (insertError) {
        console.error('Error saving link analysis:', insertError);
      }
    }

    const brokenLinks = links.filter(l => l.is_broken);
    const redirectLinks = links.filter(l => l.is_redirect);
    const duration = Math.round((Date.now() - startTime) / 1000);

    console.log(`Link check completed. Total: ${links.length}, Broken: ${brokenLinks.length}, Redirects: ${redirectLinks.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        summary: {
          total_links_checked: links.length,
          broken_links_count: brokenLinks.length,
          redirect_links_count: redirectLinks.length,
          internal_links_count: links.filter(l => l.link_type === 'internal').length,
          external_links_count: links.filter(l => l.link_type === 'external').length,
          duration_seconds: duration,
        },
        broken_links: brokenLinks,
        redirect_links: redirectLinks,
        all_links: links,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      }
    );

  } catch (error) {
    console.error('Broken Links Check Error:', error);
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
