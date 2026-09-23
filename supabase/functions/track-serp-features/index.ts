// Track SERP Features Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import {
  findDomainPosition,
  isSerpConfigured,
  serpNotConfiguredResponse,
  toSerpFeaturesRow,
} from '../_shared/keyword-positions.ts';
import { resolveSeoSiteId } from '../_shared/seo-site.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// root_admin only; no caller in src/. keyword and domain go into a search-API
// query string built here, not a fetch target of their own.
const SerpFeaturesSchema = z.object({
  keyword: z.string().min(1).max(200),
  domain: z.string().min(1).max(255),
  country: z.string().max(10).optional(),
  device: z.string().max(20).optional(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[TRACK-SERP-FEATURES] User authenticated", { userId: user.id });

    // Check for root_admin role with site isolation
    const { data: userProfile } = await supabaseClient
      .from('user_profiles')
      .select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id)
      .single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const parsed = await validateBody(req, SerpFeaturesSchema, { name: 'track-serp-features' });
    if (!parsed.ok) return parsed.response;
    const { keyword, domain, country = 'us', device = 'desktop' } = parsed.data;
    if (!keyword) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'keyword required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const serpFeatures: Array<{
      feature_type: string;
      has_feature: boolean;
      owns_feature: boolean;
      feature_url?: string;
      feature_data?: any;
    }> = [];

    // No simulated path. Without SERP_API_KEY this used to pick each feature's
    // presence and ownership at random and insert it as the SERP
    // (see _shared/keyword-positions.ts). No key is now an error, and so is a
    // failed lookup: an empty feature list would read as "no features".
    const serpApiKey = Deno.env.get('SERP_API_KEY');
    if (!isSerpConfigured(serpApiKey)) {
      console.error('[TRACK-SERP-FEATURES] SERP_API_KEY is not set');
      return serpNotConfiguredResponse(corsHeaders);
    }

    // deno-lint-ignore no-explicit-any
    let serpData: any = null;
    try {
      const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&location=${encodeURIComponent(country)}&device=${encodeURIComponent(device)}&api_key=${serpApiKey}`;
      const serpResponse = await fetch(searchUrl);
      if (!serpResponse.ok) throw new Error(`SerpApi returned ${serpResponse.status}`);
      serpData = await serpResponse.json();

      // Check for various SERP features
      const featureTypes = [
        'featured_snippet',
        'knowledge_graph',
        'local_pack',
        'people_also_ask',
        'image_pack',
        'video_carousel',
        'shopping_results',
        'news_results',
        'twitter_results',
        'reviews',
        'site_links',
      ];

      for (const featureType of featureTypes) {
        const snakeCase = featureType.toLowerCase().replace(/ /g, '_');
        const hasFeature = !!serpData[snakeCase];
        let ownsFeature = false;
        let featureUrl = null;
        let featureData = null;

        if (hasFeature && domain) {
          const featureContent = serpData[snakeCase];
          featureData = featureContent;

          // Check if domain owns this feature
          if (Array.isArray(featureContent)) {
            ownsFeature = featureContent.some((item: any) =>
              item.link?.includes(domain) || item.displayed_link?.includes(domain)
            );
            const ownedItem = featureContent.find((item: any) =>
              item.link?.includes(domain) || item.displayed_link?.includes(domain)
            );
            if (ownedItem) {
              featureUrl = ownedItem.link || ownedItem.displayed_link;
            }
          } else if (featureContent.link) {
            ownsFeature = featureContent.link.includes(domain);
            featureUrl = featureContent.link;
          }
        }

        serpFeatures.push({
          feature_type: featureType,
          has_feature: hasFeature,
          owns_feature: ownsFeature,
          feature_url: featureUrl || undefined,
          feature_data: featureData,
        });
      }
    } catch (error) {
      console.error('SERP API error:', error);
      return new Response(JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: `SERP lookup failed: ${error instanceof Error ? error.message : String(error)}`,
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Save to database. The row used to carry domain, country,
    // current_position, serp_features and owned_features, none of which are
    // columns of seo_serp_positions, and no site_id, so it never stored.
    const organic = findDomainPosition(serpData?.organic_results, domain);
    const siteId = await resolveSeoSiteId(supabaseClient, user.id);
    const positionRecord = toSerpFeaturesRow({
      keyword,
      presentFeatures: serpFeatures.filter(f => f.has_feature).map(f => f.feature_type),
      position: organic.position,
      url: organic.url,
    }, { country, device, siteId });

    // The insert's error was discarded and supabase-js returns it rather than
    // throwing. The `saved || <data>` fallback below then hid the consequence
    // perfectly: when the insert failed, `saved` was null and the response fell
    // back to the in-memory object, so the caller received what looked like a
    // stored analysis record while the table it is supposed to live in stayed
    // empty (US-300). The computed analysis is still returned - one caller uses
    // it inline - but `stored` now says whether it was persisted.
    const { data: saved, error: saveError } = await supabaseClient
      .from('seo_serp_positions')
      .insert(positionRecord)
      .select()
      .single();

    if (saveError) {
      console.error(
        '[TRACK-SERP-FEATURES] Analysis completed but was NOT stored:',
        saveError.message,
      );
    }

    // Calculate opportunities
    const opportunities = serpFeatures
      .filter(f => f.has_feature && !f.owns_feature)
      .map(f => ({
        feature_type: f.feature_type,
        current_owner: f.feature_url ? new URL(f.feature_url).hostname : 'unknown',
        opportunity_type: 'capture',
        priority: ['featured_snippet', 'knowledge_graph', 'local_pack'].includes(f.feature_type)
          ? 'high'
          : 'medium',
      }));

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: true,
      stored: !saveError,
      storage_error: saveError?.message ?? null,
      stored_id: saved?.id ?? null,
      keyword,
      serp_features: serpFeatures,
      summary: {
        total_features: serpFeatures.filter(f => f.has_feature).length,
        owned_features: serpFeatures.filter(f => f.owns_feature).length,
        opportunities: opportunities.length,
      },
      opportunities,
      note: 'Live SERP data',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
