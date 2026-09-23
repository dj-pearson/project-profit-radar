/**
 * QuickBooks Disconnect Handler
 *
 * Revokes OAuth tokens and disconnects QuickBooks integration.
 */
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import {
  CLEARED_TOKEN_COLUMNS, getQuickBooksTokenKey, loadQuickBooksTokens,
} from '../_shared/quickbooks-token-crypto.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
const DisconnectSchema = z.object({
  company_id: z.string().uuid(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
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
    console.log("[QUICKBOOKS-DISCONNECT] User authenticated", { userId: user.id });

    const parsed = await validateBody(req, DisconnectSchema, { name: 'quickbooks-disconnect' })
    if (!parsed.ok) return parsed.response
    const { company_id } = parsed.data

    if (!company_id) {
      throw new Error('Company ID is required')
    }

    // RLS decides whether the caller may see this company's integration (admin
    // only). The token columns are not readable by authenticated (US-345), so
    // only the id comes back here and the tokens are loaded with the service
    // client for a row the caller has already been shown.
    const { data: integration, error: fetchError } = await supabaseClient
      .from('quickbooks_integrations')
      .select('id')
      .eq('company_id', company_id)
      .single()

    if (fetchError && fetchError.code !== 'PGRST116') {
      throw new Error('Failed to fetch integration data')
    }

    // Revocation is best-effort, and so is reading the tokens for it: a
    // missing key or unreadable ciphertext must not stop the user
    // disconnecting.
    let stored: { accessToken: string | null; refreshToken: string | null } | null = null
    if (integration?.id) {
      try {
        stored = await loadQuickBooksTokens(createServiceClient(), integration.id, getQuickBooksTokenKey())
      } catch (loadError) {
        console.error('[QUICKBOOKS-DISCONNECT] tokens not readable; skipping revocation:',
          loadError instanceof Error ? loadError.message : String(loadError))
      }
    }

    // Attempt to revoke the token with QuickBooks (optional - best effort)
    if (stored?.accessToken || stored?.refreshToken) {
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
              token: stored.refreshToken || stored.accessToken
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
        ...CLEARED_TOKEN_COLUMNS,
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

    // Log the disconnection. The disconnect itself is checked above, so this
    // is the audit entry rather than the action; its error was discarded
    // (US-300).
    const { error: disconnectLogError } = await supabaseClient
      .from('quickbooks_sync_logs')
      .insert({
        company_id: company_id,
        sync_type: 'disconnection',
        status: 'success',
        message: 'QuickBooks disconnected by user',
        records_processed: {},
        created_at: new Date().toISOString(),
      })

    if (disconnectLogError) {
      console.error(
        `[QUICKBOOKS-DISCONNECT] Company ${company_id} DISCONNECTED but the event was not logged:`,
        disconnectLogError.message,
      )
    }

    console.log(`QuickBooks disconnected for company ${company_id}`)

    return new Response(
      JSON.stringify({ timestamp: new Date().toISOString(), success: true, message: 'Successfully disconnected from QuickBooks' }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      },
    )

  } catch (error) {
    console.error('QuickBooks disconnect error:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)

    return new Response(
      JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: errorMessage }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 400,
      },
    )
  }
})
