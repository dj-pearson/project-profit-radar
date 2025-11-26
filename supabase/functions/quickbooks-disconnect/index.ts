/**
 * QuickBooks Disconnect Handler
 *
 * Revokes OAuth tokens and disconnects QuickBooks integration.
 */
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    )

    // Verify user authentication
    const authHeader = req.headers.get('Authorization')!
    const token = authHeader.replace('Bearer ', '')
    const { data: { user } } = await supabaseClient.auth.getUser(token)

    if (!user) {
      throw new Error('Unauthorized')
    }

    const { company_id } = await req.json()

    if (!company_id) {
      throw new Error('Company ID is required')
    }

    // Get current integration data to revoke the token
    const { data: integration, error: fetchError } = await supabaseClient
      .from('quickbooks_integrations')
      .select('access_token, refresh_token')
      .eq('company_id', company_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error('Failed to fetch integration data')
    }

    // Attempt to revoke the token with QuickBooks (optional - best effort)
    if (integration?.access_token) {
      try {
        const clientId = Deno.env.get('QUICKBOOKS_CLIENT_ID')
        const clientSecret = Deno.env.get('QUICKBOOKS_CLIENT_SECRET')

        if (clientId && clientSecret) {
          const credentials = btoa(`${clientId}:${clientSecret}`)

          await fetch('https://developer.api.intuit.com/v2/oauth2/tokens/revoke', {
            method: 'POST',
            headers: {
              'Authorization': `Basic ${credentials}`,
              'Accept': 'application/json',
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              token: integration.refresh_token || integration.access_token
            }),
          })
        }
      } catch (revokeError) {
        // Log but don't fail - token revocation is best-effort
        console.error('Token revocation failed:', revokeError)
      }
    }

    // Clear integration data in database
    const { error: updateError } = await supabaseClient
      .from('quickbooks_integrations')
      .update({
        access_token: null,
        refresh_token: null,
        access_token_expires_at: null,
        refresh_token_expires_at: null,
        realm_id: null,
        is_connected: false,
        connection_status: 'disconnected',
        qb_company_name: null,
        oauth_state: null,
        last_sync_at: null,
        last_sync_status: 'never',
        last_error_message: null,
        updated_at: new Date().toISOString(),
      })
      .eq('company_id', company_id)

    if (updateError) {
      throw new Error('Failed to disconnect: ' + updateError.message)
    }

    // Log the disconnection
    await supabaseClient
      .from('quickbooks_sync_logs')
      .insert({
        company_id: company_id,
        sync_type: 'disconnection',
        status: 'success',
        message: 'QuickBooks disconnected by user',
        records_processed: {},
        created_at: new Date().toISOString(),
      })

    console.log(`QuickBooks disconnected for company ${company_id}`)

    return new Response(
      JSON.stringify({ success: true, message: 'Successfully disconnected from QuickBooks' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('QuickBooks disconnect error:', error)
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
