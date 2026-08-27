// Sync Analytics Data Edge Function
// Triggers data synchronization for a connected analytics platform
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SYNC-ANALYTICS-DATA] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const body = await req.json();
    const { connection_id, platform, date_range } = body;

    if (!connection_id || !platform) {
      return errorResponse('connection_id and platform are required', 400, req);
    }

    logStep("Syncing analytics", { connection_id, platform, date_range });

    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get the platform connection details
    const { data: connection, error: connError } = await serviceClient
      .from('analytics_platform_connections')
      .select('*')
      .eq('id', connection_id)
      .single();

    if (connError || !connection) {
      return errorResponse('Analytics connection not found', 404, req);
    }

    // Update connection status to syncing. The error was discarded and
    // supabase-js returns it rather than throwing, so the UI could show the
    // connection idle throughout a sync that was actually running (US-300).
    const { error: syncingError } = await serviceClient
      .from('analytics_platform_connections')
      .update({
        sync_status: 'syncing',
        last_sync_started_at: new Date().toISOString(),
      })
      .eq('id', connection_id);

    if (syncingError) {
      logStep("Could not mark connection as syncing", { connection_id, error: syncingError.message });
    }

    // Delegate to platform-specific sync functions
    let syncResult = { records_synced: 0, status: 'success' };
    let syncErrorMessage: string | null = null;

    try {
      if (platform === 'google_analytics') {
        // Delegate to google-analytics-api function
        const { data, error } = await serviceClient.functions.invoke('google-analytics-api', {
          body: {
            action: 'sync',
            connection_id,
            date_range,
          },
        });
        if (error) throw new Error(error.message || 'GA sync failed');
        syncResult = data || syncResult;
      } else if (platform === 'google_search_console') {
        // Delegate to google-search-console-api function
        const { data, error } = await serviceClient.functions.invoke('google-search-console-api', {
          body: {
            action: 'sync',
            connection_id,
            date_range,
          },
        });
        if (error) throw new Error(error.message || 'GSC sync failed');
        syncResult = data || syncResult;
      } else {
        logStep("Platform sync not yet implemented", { platform });
        syncResult = { records_synced: 0, status: 'not_implemented' };
      }
    } catch (syncError) {
      logStep("Sync error for platform", { platform, error: syncError.message });
      // Stored below instead of the fixed string 'Sync failed', which told
      // whoever read the row nothing about why.
      syncErrorMessage = syncError.message || 'Sync failed';
      syncResult = { records_synced: 0, status: 'failed' };
    }

    // Update connection with sync results. This is the write that takes the
    // connection back out of 'syncing'. Its error was discarded, so a lost
    // write stranded the connection mid-sync: a permanent spinner in the UI,
    // for a sync that had already finished (US-300).
    const { error: syncResultError } = await serviceClient
      .from('analytics_platform_connections')
      .update({
        sync_status: syncResult.status === 'success' ? 'synced' : 'error',
        last_sync_completed_at: new Date().toISOString(),
        last_sync_error: syncErrorMessage,
      })
      .eq('id', connection_id);

    if (syncResultError) {
      throw new Error(
        `Sync of connection ${connection_id} finished as ${syncResult.status} but the connection is STUCK at 'syncing': ${syncResultError.message}`,
      );
    }

    logStep("Sync completed", syncResult);
    return successResponse(syncResult, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
