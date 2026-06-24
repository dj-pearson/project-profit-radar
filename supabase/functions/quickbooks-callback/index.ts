/**
 * QuickBooks OAuth Callback Handler
 *
 * Exchanges authorization code for access/refresh tokens
 * and stores them in the database.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
  x_refresh_token_expires_in?: number;
}

interface CompanyInfo {
  CompanyInfo: {
    CompanyName: string;
    LegalName?: string;
    Country?: string;
    CompanyAddr?: {
      City?: string;
      CountrySubDivisionCode?: string;
    };
  };
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    console.log("[QUICKBOOKS-CALLBACK] User authenticated", { userId: user.id });

    const { code, state, realm_id, company_id, redirect_uri } = await req.json()

    // Validate required parameters
    if (!code || !state || !company_id || !redirect_uri) {
      throw new Error('Missing required parameters')
    }

    // Get QuickBooks credentials
    const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
    const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')

    if (!clientId || !clientSecret) {
      throw new Error('QuickBooks credentials not configured')
    }

    // Verify state parameter matches stored state
    const { data: integration, error: stateError } = await supabaseClient
      .from('quickbooks_integrations')
      .select('oauth_state')
      .eq('company_id', company_id)
      .single()

    if (stateError || !integration) {
      throw new Error('No pending connection found. Please try connecting again.')
    }

    if (integration.oauth_state !== state) {
      throw new Error('Invalid state parameter. This may be a security issue.')
    }

    // Exchange authorization code for tokens
    const tokenUrl = 'https://oauth.platform.intuit.com/oauth2/v1/tokens/bearer'
    const credentials = btoa(`${clientId}:${clientSecret}`)

    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Authorization': `Basic ${credentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code,
        redirect_uri: redirect_uri,
      }).toString(),
    })

    if (!tokenResponse.ok) {
      const errorText = await tokenResponse.text()
      console.error('Token exchange failed:', errorText)
      throw new Error(`Token exchange failed: ${tokenResponse.status}`)
    }

    const tokens: TokenResponse = await tokenResponse.json()

    // Calculate token expiration times
    const now = new Date()
    const accessTokenExpires = new Date(now.getTime() + (tokens.expires_in * 1000))
    const refreshTokenExpires = tokens.x_refresh_token_expires_in
      ? new Date(now.getTime() + (tokens.x_refresh_token_expires_in * 1000))
      : new Date(now.getTime() + (100 * 24 * 60 * 60 * 1000)) // Default 100 days

    // Fetch company info from QuickBooks
    let companyName = 'QuickBooks Company'

    if (realm_id) {
      try {
        const baseUrl = Deno.env.get('QUICKBOOKS_ENVIRONMENT') === 'production'
          ? 'https://quickbooks.api.intuit.com'
          : 'https://sandbox-quickbooks.api.intuit.com'

        const companyResponse = await fetch(
          `${baseUrl}/v3/company/${realm_id}/companyinfo/${realm_id}?minorversion=65`,
          {
            headers: {
              'Authorization': `Bearer ${tokens.access_token}`,
              'Accept': 'application/json',
            },
          }
        )

        if (companyResponse.ok) {
          const companyData: CompanyInfo = await companyResponse.json()
          companyName = companyData.CompanyInfo?.CompanyName || companyName
        }
      } catch (companyError) {
        console.error('Failed to fetch company info:', companyError)
        // Continue without company name - not critical
      }
    }

    // Update integration record with tokens
    const { error: updateError } = await supabaseClient
      .from('quickbooks_integrations')
      .update({
        realm_id: realm_id,
        access_token: tokens.access_token,
        refresh_token: tokens.refresh_token,
        access_token_expires_at: accessTokenExpires.toISOString(),
        refresh_token_expires_at: refreshTokenExpires.toISOString(),
        is_connected: true,
        connection_status: 'connected',
        qb_company_name: companyName,
        oauth_state: null, // Clear state after successful auth
        last_sync_status: 'never',
        updated_at: now.toISOString(),
      })
      .eq('company_id', company_id)

    if (updateError) {
      console.error('Failed to update integration:', updateError)
      throw new Error('Failed to save connection. Please try again.')
    }

    // Log the successful connection
    await supabaseClient
      .from('quickbooks_sync_logs')
      .insert({
        company_id: company_id,
        sync_type: 'connection',
        status: 'success',
        message: `Connected to QuickBooks: ${companyName}`,
        records_processed: {},
        created_at: now.toISOString(),
      })

    console.log(`QuickBooks connected successfully for company ${company_id}`)

    return new Response(
      JSON.stringify({
        success: true,
        company_name: companyName,
        realm_id: realm_id,
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('QuickBooks callback error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
