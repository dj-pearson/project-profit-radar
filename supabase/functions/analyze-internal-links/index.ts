import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { url, base_domain } = await req.json();
    if (!url) {
      return new Response(JSON.stringify({ error: 'URL required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const response = await fetch(url);
    const html = await response.text();

    // Extract all internal links
    const linkMatches = html.matchAll(/<a[^>]*href=["']([^"']*)["'][^>]*>(.*?)<\/a>/gi);
    const internalLinks: Array<{
      source_url: string;
      target_url: string;
      anchor_text: string;
      link_type: string;
      position: number;
      is_followed: boolean;
    }> = [];

    let position = 0;
    for (const match of linkMatches) {
      const href = match[1];
      const anchorText = match[2].replace(/<[^>]+>/g, '').trim();

      // Skip empty, anchor, or external links if base_domain provided
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) {
        continue;
      }

      let targetUrl: string;
      try {
        targetUrl = new URL(href, url).href;
      } catch {
        continue;
      }

      // Check if internal (same domain)
      const targetDomain = new URL(targetUrl).hostname;
      const sourceDomain = new URL(url).hostname;
      const isInternal = base_domain
        ? targetDomain.includes(base_domain)
        : targetDomain === sourceDomain;

      if (!isInternal) continue;

      // Check if followed
      const fullMatch = match[0];
      const isFollowed = !fullMatch.includes('rel="nofollow"') && !fullMatch.includes("rel='nofollow'");

      internalLinks.push({
        source_url: url,
        target_url: targetUrl,
        anchor_text: anchorText || 'No anchor text',
        link_type: href.startsWith('http') ? 'absolute' : 'relative',
        position: position++,
        is_followed: isFollowed,
      });
    }

    // Calculate metrics
    const totalInternalLinks = internalLinks.length;
    const followedLinks = internalLinks.filter(l => l.is_followed).length;
    const nofollowLinks = totalInternalLinks - followedLinks;

    // Group by target URL to find most linked pages
    const linkCounts: Record<string, number> = {};
    internalLinks.forEach(link => {
      linkCounts[link.target_url] = (linkCounts[link.target_url] || 0) + 1;
    });

    // Save analysis
    const analysisData = {
      url,
      total_internal_links: totalInternalLinks,
      followed_links: followedLinks,
      nofollow_links: nofollowLinks,
      unique_target_pages: Object.keys(linkCounts).length,
      average_links_per_page: totalInternalLinks / Math.max(Object.keys(linkCounts).length, 1),
      most_linked_pages: Object.entries(linkCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 10)
        .map(([url, count]) => ({ url, count })),
      anchor_text_distribution: internalLinks.reduce((acc, link) => {
        acc[link.anchor_text] = (acc[link.anchor_text] || 0) + 1;
        return acc;
      }, {} as Record<string, number>),
      recommendations: [] as string[],
    };

    // Generate recommendations
    if (totalInternalLinks === 0) {
      analysisData.recommendations.push('Add internal links to improve site structure');
    }
    if (nofollowLinks > followedLinks) {
      analysisData.recommendations.push('Too many nofollow links - review internal linking strategy');
    }
    if (Object.keys(linkCounts).length < 3) {
      analysisData.recommendations.push('Increase internal linking to more pages');
    }

    const { data: saved } = await supabaseClient
      .from('seo_link_analysis')
      .insert({
        url,
        link_type: 'internal',
        total_links: totalInternalLinks,
        broken_links: 0,
        redirect_links: 0,
        analysis_data: analysisData,
        recommendations: analysisData.recommendations,
      })
      .select()
      .single();

    return new Response(JSON.stringify({
      success: true,
      internal_link_analysis: saved || analysisData,
      links: internalLinks
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
