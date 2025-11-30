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

    // Extract site_id from JWT metadata for multi-tenant isolation
    const siteId = user.app_metadata?.site_id || user.user_metadata?.site_id;
    if (!siteId) {
      return new Response(JSON.stringify({ error: 'Site ID not found in user context' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('site_id', siteId).eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { property_id, start_date, end_date } = await req.json();
    if (!property_id) {
      return new Response(JSON.stringify({ error: 'property_id required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Get property and credentials with site_id isolation
    const { data: property, error: propError } = await supabaseClient
      .from('gsc_properties')
      .select('*, gsc_oauth_credentials(*)')
      .eq('site_id', siteId)
      .eq('id', property_id)
      .single();

    if (propError || !property) {
      return new Response(JSON.stringify({ error: 'Property not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const credentials = property.gsc_oauth_credentials;
    let accessToken = credentials.access_token;

    // Check token expiry and refresh if needed
    const tokenExpiry = new Date(credentials.token_expires_at);
    const now = new Date();

    if (now >= tokenExpiry) {
      const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
      const clientSecret = Deno.env.get('GOOGLE_CLIENT_SECRET');

      const refreshResponse = await fetch('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({
          client_id: clientId!,
          client_secret: clientSecret!,
          refresh_token: credentials.refresh_token,
          grant_type: 'refresh_token',
        }),
      });

      if (refreshResponse.ok) {
        const newTokens = await refreshResponse.json();
        accessToken = newTokens.access_token;
      }
    }

    // Calculate date range
    const endDate = end_date || new Date().toISOString().split('T')[0];
    const startDate = start_date || (() => {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      return d.toISOString().split('T')[0];
    })();

    // Fetch query (keyword) performance
    const queryRequest = {
      startDate,
      endDate,
      dimensions: ['query'],
      rowLimit: 1000,
    };

    const queryResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property.property_url)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(queryRequest),
      }
    );

    if (!queryResponse.ok) {
      const errorData = await queryResponse.json();
      return new Response(JSON.stringify({ error: 'Failed to fetch query data', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const queryData = await queryResponse.json();
    const keywordRecords = (queryData.rows || []).map((row: any) => ({
      site_id: siteId,
      property_id,
      query: row.keys[0],
      impressions: row.impressions,
      clicks: row.clicks,
      ctr: row.ctr,
      position: row.position,
      date: endDate,
    }));

    // Fetch page performance
    const pageRequest = {
      startDate,
      endDate,
      dimensions: ['page'],
      rowLimit: 1000,
    };

    const pageResponse = await fetch(
      `https://www.googleapis.com/webmasters/v3/sites/${encodeURIComponent(property.property_url)}/searchAnalytics/query`,
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(pageRequest),
      }
    );

    let pageRecords: any[] = [];
    if (pageResponse.ok) {
      const pageData = await pageResponse.json();
      pageRecords = (pageData.rows || []).map((row: any) => ({
        site_id: siteId,
        property_id,
        page_url: row.keys[0],
        impressions: row.impressions,
        clicks: row.clicks,
        ctr: row.ctr,
        position: row.position,
        date: endDate,
      }));
    }

    // Save to database
    const results = {
      keywords_synced: 0,
      pages_synced: 0,
    };

    if (keywordRecords.length > 0) {
      const { error: keywordError } = await supabaseClient
        .from('gsc_keyword_performance')
        .upsert(keywordRecords, {
          onConflict: 'property_id,query,date',
        });

      if (!keywordError) {
        results.keywords_synced = keywordRecords.length;
      }
    }

    if (pageRecords.length > 0) {
      const { error: pageError } = await supabaseClient
        .from('gsc_page_performance')
        .upsert(pageRecords, {
          onConflict: 'property_id,page_url,date',
        });

      if (!pageError) {
        results.pages_synced = pageRecords.length;
      }
    }

    // Update property last sync time with site_id isolation
    await supabaseClient
      .from('gsc_properties')
      .update({
        last_sync_at: new Date().toISOString(),
        next_sync_at: (() => {
          const next = new Date();
          next.setHours(next.getHours() + 24);
          return next.toISOString();
        })(),
      })
      .eq('site_id', siteId)
      .eq('id', property_id);

    return new Response(JSON.stringify({
      success: true,
      sync_results: results,
      date_range: { start: startDate, end: endDate },
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
