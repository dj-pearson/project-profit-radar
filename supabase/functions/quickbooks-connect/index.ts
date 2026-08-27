// QuickBooks Connect Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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

    // Store the connection attempt with site isolation.
    // quickbooks-callback compares what Intuit returns against this oauth_state
    // row, so without it there is nothing to verify against. The error was
    // discarded and supabase-js returns it rather than throwing, so the user
    // was sent to Intuit, authorised there, and came back to a rejection with
    // no explanation. Fail before the redirect instead (US-300).
    const { error: stateError } = await supabaseClient
      .from('quickbooks_integrations')
      .upsert({  // CRITICAL: Site isolation
        company_id,
        oauth_state: state,
        connection_status: 'pending',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })

    if (stateError) {
      throw new Error(
        `Could not store the OAuth state, so the QuickBooks connection was not started: ${stateError.message}`,
      )
    }

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