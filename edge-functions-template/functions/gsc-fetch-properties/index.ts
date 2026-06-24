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

    // Get OAuth credentials with site_id isolation
    const { data: credentials, error: credError } = await supabaseClient
      .from('gsc_oauth_credentials')
      .select('*')
      .eq('site_id', siteId)
      .eq('user_id', user.id)
      .eq('status', 'active')
      .single();

    if (credError || !credentials) {
      return new Response(JSON.stringify({
        error: 'No active Google Search Console connection',
        message: 'Please authenticate with Google Search Console first'
      }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Check if token needs refresh
    const tokenExpiry = new Date(credentials.token_expires_at);
    const now = new Date();
    let accessToken = credentials.access_token;

    if (now >= tokenExpiry) {
      // Token expired, refresh it
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

      if (!refreshResponse.ok) {
        return new Response(JSON.stringify({ error: 'Failed to refresh token' }),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const newTokens = await refreshResponse.json();
      accessToken = newTokens.access_token;

      const expiresAt = new Date();
      expiresAt.setSeconds(expiresAt.getSeconds() + newTokens.expires_in);

      await supabaseClient
        .from('gsc_oauth_credentials')
        .update({
          access_token: accessToken,
          token_expires_at: expiresAt.toISOString(),
        })
        .eq('site_id', siteId)
        .eq('id', credentials.id);
    }

    // Fetch properties from GSC API
    const gscResponse = await fetch('https://www.googleapis.com/webmasters/v3/sites', {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!gscResponse.ok) {
      const errorData = await gscResponse.json();
      return new Response(JSON.stringify({ error: 'Failed to fetch properties', details: errorData }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const gscData = await gscResponse.json();
    const properties = gscData.siteEntry || [];

    // Save properties to database with site_id for multi-tenant isolation
    const propertyRecords = properties.map((site: any) => ({
      site_id: siteId,
      credential_id: credentials.id,
      property_url: site.siteUrl,
      property_type: site.siteUrl.startsWith('sc-domain:') ? 'domain' : 'url_prefix',
      permission_level: site.permissionLevel || 'unknown',
      is_verified: true,
      is_active: true,
    }));

    if (propertyRecords.length > 0) {
      const { data: saved, error: insertError } = await supabaseClient
        .from('gsc_properties')
        .upsert(propertyRecords, {
          onConflict: 'credential_id,property_url',
        })
        .select();

      if (insertError) {
        console.error('Insert error:', insertError);
      }

      return new Response(JSON.stringify({
        success: true,
        properties: saved || propertyRecords,
        total: propertyRecords.length,
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    } else {
      return new Response(JSON.stringify({
        success: true,
        properties: [],
        total: 0,
        message: 'No properties found in Google Search Console'
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
