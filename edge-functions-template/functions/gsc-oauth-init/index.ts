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

    const clientId = Deno.env.get('GOOGLE_CLIENT_ID');
    const redirectUri = Deno.env.get('GOOGLE_REDIRECT_URI') || `${Deno.env.get('SUPABASE_URL')}/functions/v1/gsc-oauth-callback`;

    if (!clientId) {
      return new Response(JSON.stringify({
        error: 'Google OAuth not configured',
        message: 'Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Supabase secrets'
      }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Generate state token for security
    const state = crypto.randomUUID();

    // Store state in database for verification
    await supabaseClient
      .from('gsc_oauth_credentials')
      .upsert({
        company_id: null,
        user_id: user.id,
        provider: 'google',
        oauth_state: state,
        status: 'pending',
      }, {
        onConflict: 'user_id',
      });

    // Build OAuth URL
    const scopes = [
      'https://www.googleapis.com/auth/webmasters.readonly',
      'https://www.googleapis.com/auth/webmasters',
    ];

    const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');
    authUrl.searchParams.set('client_id', clientId);
    authUrl.searchParams.set('redirect_uri', redirectUri);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', scopes.join(' '));
    authUrl.searchParams.set('access_type', 'offline');
    authUrl.searchParams.set('prompt', 'consent');
    authUrl.searchParams.set('state', state);

    return new Response(JSON.stringify({
      success: true,
      auth_url: authUrl.toString(),
      message: 'Redirect user to this URL to authorize Google Search Console access'
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
