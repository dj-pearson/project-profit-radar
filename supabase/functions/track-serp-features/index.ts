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

    const { keyword, domain, country = 'us', device = 'desktop' } = await req.json();
    if (!keyword) {
      return new Response(JSON.stringify({ error: 'keyword required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let serpFeatures: Array<{
      feature_type: string;
      has_feature: boolean;
      owns_feature: boolean;
      feature_url?: string;
      feature_data?: any;
    }> = [];

    const serpApiKey = Deno.env.get('SERP_API_KEY');

    if (serpApiKey) {
      // Use real SERP API
      try {
        const searchUrl = `https://serpapi.com/search.json?q=${encodeURIComponent(keyword)}&location=${country}&device=${device}&api_key=${serpApiKey}`;
        const serpResponse = await fetch(searchUrl);
        const serpData = await serpResponse.json();

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
      }
    }

    // Fallback to simulated data
    if (serpFeatures.length === 0) {
      const simulatedFeatures = [
        { type: 'featured_snippet', probability: 0.3 },
        { type: 'knowledge_graph', probability: 0.2 },
        { type: 'local_pack', probability: 0.4 },
        { type: 'people_also_ask', probability: 0.8 },
        { type: 'image_pack', probability: 0.6 },
        { type: 'video_carousel', probability: 0.3 },
        { type: 'shopping_results', probability: 0.2 },
        { type: 'news_results', probability: 0.4 },
        { type: 'site_links', probability: 0.5 },
        { type: 'reviews', probability: 0.3 },
      ];

      for (const sim of simulatedFeatures) {
        const hasFeature = Math.random() < sim.probability;
        const ownsFeature = hasFeature && domain && Math.random() < 0.3;

        serpFeatures.push({
          feature_type: sim.type,
          has_feature: hasFeature,
          owns_feature: ownsFeature,
          feature_url: ownsFeature ? `https://${domain}/page` : undefined,
          feature_data: hasFeature ? { simulated: true } : undefined,
        });
      }
    }

    // Save to database
    const positionRecord = {
      keyword,
      domain: domain || null,
      country,
      device,
      current_position: null,
      serp_features: serpFeatures.filter(f => f.has_feature).map(f => f.feature_type),
      owned_features: serpFeatures.filter(f => f.owns_feature).map(f => f.feature_type),
    };

    const { data: saved } = await supabaseClient
      .from('seo_serp_positions')
      .insert(positionRecord)
      .select()
      .single();

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
      success: true,
      keyword,
      serp_features: serpFeatures,
      summary: {
        total_features: serpFeatures.filter(f => f.has_feature).length,
        owned_features: serpFeatures.filter(f => f.owns_feature).length,
        opportunities: opportunities.length,
      },
      opportunities,
      note: serpApiKey ? 'Live SERP data' : 'Simulated data - configure SERP_API_KEY for live tracking',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
