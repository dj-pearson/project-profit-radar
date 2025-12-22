// QuickBooks Connect Edge Function
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[QUICKBOOKS-CONNECT] User authenticated", { userId: user.id });

    const { company_id, redirect_uri } = await req.json()

    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
    const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('QuickBooks credentials not configured')
    }

    // Generate state parameter for security
    const state = crypto.randomUUID()

    // Store the connection attempt with site isolation
    await supabaseClient
      .from('quickbooks_integrations')
      .upsert({  // CRITICAL: Site isolation
        company_id,
        oauth_state: state,
        connection_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    // Build QuickBooks OAuth URL
    const scope = 'com.intuit.quickbooks.accounting'
    const discoveryDocument = 'https://developer.api.intuit.com/.well-known/connect_to_quickbooks'
    
    const authUrl = `https://appcenter.intuit.com/connect/oauth2?` +
      `client_id=${clientId}&` +
      `scope=${encodeURIComponent(scope)}&` +
      `redirect_uri=${encodeURIComponent(redirect_uri)}&` +
      `response_type=code&` +
      `access_type=offline&` +
      `state=${state}`

    return new Response(
      JSON.stringify({ 
        auth_url: authUrl,
        state: state
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('Error in quickbooks-connect:', error)
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})