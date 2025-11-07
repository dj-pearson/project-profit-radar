// Google Analytics & Search Console OAuth Flow
// Handles OAuth 2.0 authentication for Google platforms

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const GOOGLE_CLIENT_ID = Deno.env.get('GOOGLE_OAUTH_CLIENT_ID') || '';
const GOOGLE_CLIENT_SECRET = Deno.env.get('GOOGLE_OAUTH_CLIENT_SECRET') || '';
const GOOGLE_REDIRECT_URI = Deno.env.get('GOOGLE_OAUTH_REDIRECT_URI') || 'https://your-domain.com/api/oauth/google/callback';

const GOOGLE_AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth';
const GOOGLE_TOKEN_URL = 'https://oauth2.googleapis.com/token';

// Required scopes for Analytics and Search Console
const SCOPES = [
  'https://www.googleapis.com/auth/analytics.readonly',
  'https://www.googleapis.com/auth/webmasters.readonly',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile'
].join(' ');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get the authenticated user
    const {
      data: { user },
    } = await supabaseClient.auth.getUser();

    if (!user) {
      throw new Error('Unauthorized');
    }

    const url = new URL(req.url);
    const action = url.searchParams.get('action');

    // Step 1: Initiate OAuth flow
    if (action === 'initiate') {
      const platform = url.searchParams.get('platform'); // 'google_analytics' or 'google_search_console'
      const state = crypto.randomUUID();

      // Store state in session for verification
      const authUrl = new URL(GOOGLE_AUTH_URL);
      authUrl.searchParams.set('client_id', GOOGLE_CLIENT_ID);
      authUrl.searchParams.set('redirect_uri', GOOGLE_REDIRECT_URI);
      authUrl.searchParams.set('response_type', 'code');
      authUrl.searchParams.set('scope', SCOPES);
      authUrl.searchParams.set('access_type', 'offline');
      authUrl.searchParams.set('prompt', 'consent');
      authUrl.searchParams.set('state', `${state}:${platform}:${user.id}`);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            authorization_url: authUrl.toString(),
            state: state,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 2: Handle OAuth callback
    if (action === 'callback') {
      const { code, state, error } = await req.json();

      if (error) {
        throw new Error(`OAuth error: ${error}`);
      }

      // Parse state to get platform and user ID
      const [stateToken, platform, userId] = state.split(':');

      // Verify user matches
      if (userId !== user.id) {
        throw new Error('State verification failed');
      }

      // Exchange code for tokens
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          code: code,
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          redirect_uri: GOOGLE_REDIRECT_URI,
          grant_type: 'authorization_code',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        throw new Error('Failed to obtain access token');
      }

      // Get user profile info
      const profileResponse = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });
      const profile = await profileResponse.json();

      // Get user's company_id
      const { data: userProfile } = await supabaseClient
        .from('user_profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!userProfile) {
        throw new Error('User profile not found');
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Store connection in database
      const { data: connection, error: dbError } = await supabaseClient
        .from('analytics_platform_connections')
        .upsert({
          company_id: userProfile.company_id,
          platform_name: platform,
          platform_display_name: platform === 'google_analytics' ? 'Google Analytics 4' : 'Google Search Console',
          is_connected: true,
          is_active: true,
          connection_status: 'connected',
          oauth_provider: 'google',
          access_token_encrypted: tokens.access_token, // TODO: Encrypt in production
          refresh_token_encrypted: tokens.refresh_token, // TODO: Encrypt in production
          token_type: tokens.token_type,
          expires_at: expiresAt,
          scope: tokens.scope,
          account_id: profile.id,
          account_name: profile.email,
          auto_sync_enabled: true,
          sync_frequency_hours: 24,
          data_retention_days: 90,
          created_by: user.id,
        }, {
          onConflict: 'company_id,platform_name,property_id'
        })
        .select()
        .single();

      if (dbError) {
        throw dbError;
      }

      // Fetch available properties based on platform
      if (platform === 'google_analytics') {
        // Fetch GA4 properties
        const propertiesResponse = await fetch(
          'https://analyticsadmin.googleapis.com/v1beta/accountSummaries',
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          }
        );

        const propertiesData = await propertiesResponse.json();

        // Store GA4 properties
        if (propertiesData.accountSummaries) {
          for (const account of propertiesData.accountSummaries) {
            for (const propertySummary of account.propertySummaries || []) {
              await supabaseClient.from('ga4_properties').upsert({
                connection_id: connection.id,
                company_id: userProfile.company_id,
                property_id: propertySummary.property.split('/').pop(),
                property_name: propertySummary.displayName,
                parent_account_id: account.account.split('/').pop(),
                parent_account_name: account.displayName,
                is_primary: false,
              });
            }
          }
        }
      } else if (platform === 'google_search_console') {
        // Fetch GSC sites
        const sitesResponse = await fetch(
          'https://www.googleapis.com/webmasters/v3/sites',
          {
            headers: {
              Authorization: `Bearer ${tokens.access_token}`,
            },
          }
        );

        const sitesData = await sitesResponse.json();

        // Check if we already have gsc_properties table, otherwise use connection table
        if (sitesData.siteEntry) {
          for (const site of sitesData.siteEntry) {
            // Update connection with property info
            await supabaseClient
              .from('analytics_platform_connections')
              .update({
                property_id: site.siteUrl,
                property_name: site.siteUrl,
                property_url: site.siteUrl,
              })
              .eq('id', connection.id);

            // Also create in gsc_properties if exists
            await supabaseClient.from('gsc_properties').upsert({
              company_id: userProfile.company_id,
              credentials_id: connection.id,
              property_url: site.siteUrl,
              property_type: site.siteUrl.startsWith('sc-domain:') ? 'DOMAIN' : 'URL_PREFIX',
              permission_level: site.permissionLevel,
              is_verified: true,
              is_active: true,
              is_primary: false,
              auto_sync_enabled: true,
              sync_frequency_hours: 24,
            }).select();
          }
        }
      }

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            connection_id: connection.id,
            platform: platform,
            account: profile.email,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 3: Refresh token
    if (action === 'refresh') {
      const { connection_id } = await req.json();

      // Get connection
      const { data: connection } = await supabaseClient
        .from('analytics_platform_connections')
        .select('*')
        .eq('id', connection_id)
        .single();

      if (!connection || !connection.refresh_token_encrypted) {
        throw new Error('Connection or refresh token not found');
      }

      // Refresh the token
      const tokenResponse = await fetch(GOOGLE_TOKEN_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: GOOGLE_CLIENT_ID,
          client_secret: GOOGLE_CLIENT_SECRET,
          refresh_token: connection.refresh_token_encrypted,
          grant_type: 'refresh_token',
        }),
      });

      const tokens = await tokenResponse.json();

      if (!tokens.access_token) {
        throw new Error('Failed to refresh token');
      }

      const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString();

      // Update connection
      await supabaseClient
        .from('analytics_platform_connections')
        .update({
          access_token_encrypted: tokens.access_token,
          expires_at: expiresAt,
          connection_status: 'connected',
        })
        .eq('id', connection_id);

      return new Response(
        JSON.stringify({
          success: true,
          data: {
            access_token: tokens.access_token,
            expires_at: expiresAt,
          },
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    // Step 4: Disconnect
    if (action === 'disconnect') {
      const { connection_id } = await req.json();

      // Revoke Google token
      const { data: connection } = await supabaseClient
        .from('analytics_platform_connections')
        .select('access_token_encrypted')
        .eq('id', connection_id)
        .single();

      if (connection?.access_token_encrypted) {
        await fetch(
          `https://oauth2.googleapis.com/revoke?token=${connection.access_token_encrypted}`,
          {
            method: 'POST',
          }
        );
      }

      // Update connection status
      await supabaseClient
        .from('analytics_platform_connections')
        .update({
          is_connected: false,
          is_active: false,
          connection_status: 'disconnected',
          access_token_encrypted: null,
          refresh_token_encrypted: null,
        })
        .eq('id', connection_id);

      return new Response(
        JSON.stringify({
          success: true,
        }),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        }
      );
    }

    throw new Error('Invalid action parameter');
  } catch (error) {
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      }
    );
  }
});
