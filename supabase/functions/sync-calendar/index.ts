// Sync Calendar Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { createServiceClient } from '../_shared/service-client.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import {
  CALENDAR_TOKEN_COLUMNS,
  calendarTokenColumnsForWrite,
  getCalendarTokenKey,
  isCalendarProvider,
  needsEncryptionBackfill,
  readCalendarTokens,
  refreshCalendarToken,
  withFreshToken,
  type CalendarProvider,
  type OAuthClientCreds,
  type ProviderCall,
  type StoredCalendarTokenRow,
} from '../_shared/calendar-oauth.ts';
import { captureException } from '../_shared/observability.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// company_id is accepted but ignored; the handler derives it from the caller.
const SyncCalendarSchema = z.object({
  integration_id: z.string().uuid(),
  company_id: z.string().uuid().nullish(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-CALENDAR] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const parsed = await validateBody(req, SyncCalendarSchema, { name: 'sync-calendar' });
    if (!parsed.ok) return parsed.response;
    const body = parsed.data;
    const { integration_id } = body;

    if (!integration_id) {
      throw new Error("Integration ID is required");
    }

    // SECURITY: company_id used to come from the body, and calendar_events
    // carries a permissive "System can manage calendar events" FOR ALL
    // USING (true) policy — one of the four US-237 deferred — so RLS was not
    // scoping the upsert and any authenticated user could write calendar events
    // into another company. Derive it from the caller's own profile instead.
    const { data: callerProfile } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const company_id = callerProfile?.company_id;
    if (!company_id) {
      throw new Error("Could not resolve the caller company");
    }
    if (body.company_id && body.company_id !== company_id) {
      logStep("Ignoring caller-supplied company_id", { claimed: body.company_id, actual: company_id });
    }

    // Get integration details. This read carries the caller's JWT, so RLS
    // decides whether they may see the row at all. The token columns are read
    // afterwards with the service-role client, only for a row that came back
    // here (US-395).
    const { data: integration, error: integrationError } = await supabaseClient
      .from('calendar_integrations')
      .select('id, company_id, provider, account_email, token_expires_at')
      .eq('id', integration_id)
      .eq('company_id', company_id)
      .single();

    if (integrationError || !integration) {
      throw new Error("Integration not found");
    }

    const provider = integration.provider;
    if (!isCalendarProvider(provider)) {
      throw new Error(`Unsupported provider: ${provider}`);
    }

    const serviceClient = createServiceClient();
    const tokenKey = getCalendarTokenKey();
    const { data: tokenRow, error: tokenError } = await serviceClient
      .from('calendar_integrations')
      .select(CALENDAR_TOKEN_COLUMNS)
      .eq('id', integration.id)
      .single();
    if (tokenError || !tokenRow) {
      throw new Error("Calendar tokens could not be loaded");
    }
    const stored = tokenRow as StoredCalendarTokenRow;
    const tokens = await readCalendarTokens(stored, tokenKey);

    // A row connected before US-395 holds plaintext only; write its ciphertext
    // now so release N+1 can stop reading the plaintext columns.
    if (tokens.accessToken && needsEncryptionBackfill(stored)) {
      const cols = await calendarTokenColumnsForWrite(
        { accessToken: tokens.accessToken, refreshToken: tokens.refreshToken },
        tokenKey,
      );
      const { error: backfillError } = await serviceClient
        .from('calendar_integrations')
        .update(cols)
        .eq('id', integration.id);
      if (backfillError) {
        logStep("Token ciphertext backfill failed", { error: backfillError.message });
      }
    }

    const creds = oauthCreds(provider);
    const result = await withFreshToken({
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: stored.token_expires_at,
      now: Date.now(),
      refresh: (rt) => refreshCalendarToken(provider, rt, creds),
      call: (token) => provider === 'google' ? fetchGoogleEvents(token) : fetchOutlookEvents(token),
    });

    // Persist a refreshed token pair whatever happened next. Microsoft rotates
    // the refresh token, so losing the new one here means invalid_grant on the
    // next run.
    if (result.refreshed) {
      const cols = await calendarTokenColumnsForWrite(
        {
          accessToken: result.refreshed.accessToken,
          refreshToken: result.refreshed.refreshToken,
          expiresAt: result.refreshed.expiresAt,
        },
        tokenKey,
      );
      const { error: persistError } = await serviceClient
        .from('calendar_integrations')
        .update({ ...cols, reauth_required_at: null })
        .eq('id', integration.id);
      if (persistError) {
        throw new Error(`Calendar token was refreshed but could not be saved: ${persistError.message}`);
      }
      logStep("Access token refreshed", { integrationId: integration.id, rotated: result.refreshed.rotated });
    }

    if (result.kind === 'reauth_required') {
      const { error: markError } = await serviceClient
        .from('calendar_integrations')
        .update({ reauth_required_at: new Date().toISOString(), last_sync_error: result.reason })
        .eq('id', integration.id);
      if (markError) {
        logStep("Could not record reauth_required", { error: markError.message });
      }
      await writeAuditLog(serviceClient, {
        actorUserId: user.id,
        companyId: company_id,
        action: 'calendar_integration.reauth_required',
        entityType: 'calendar_integration',
        entityId: integration.id,
        after: { provider, reason: result.reason },
        riskLevel: 'low',
      });
      logStep("Reconnect required", { integrationId: integration.id, reason: result.reason });
      return new Response(JSON.stringify({
        success: false,
        timestamp: new Date().toISOString(),
        error: `Your ${provider === 'google' ? 'Google' : 'Outlook'} calendar connection has expired. Reconnect it to resume syncing.`,
        reauth_required: true,
        data: { reauth_required: true },
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 409,
      });
    }

    if (result.kind === 'failed') {
      const { error: noteError } = await serviceClient
        .from('calendar_integrations')
        .update({ last_sync_error: result.reason })
        .eq('id', integration.id);
      if (noteError) {
        logStep("Could not record last_sync_error", { error: noteError.message });
      }
      throw new Error(result.reason);
    }

    const events = result.value;

    // Store events in database. Each upsert discarded its error and supabase-js
    // returns it rather than throwing, while the response reported
    // events_synced: events.length - the number FETCHED from the provider. A
    // sync could answer "42 events synced" having stored none of them (US-300).
    let storedCount = 0;
    const storeFailures: string[] = [];
    for (const event of events) {
      const { error: eventError } = await supabaseClient
        .from('calendar_events')
        .upsert({
          company_id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: event.description,
          calendar_provider: integration.provider,
          external_id: event.external_id,
          integration_id,
        }, {
          onConflict: 'external_id,integration_id'
        });

      if (eventError) {
        storeFailures.push(`${event.external_id}: ${eventError.message}`);
      } else {
        storedCount++;
      }
    }

    // Update last sync time. Only advance it when everything landed - stamping
    // a successful sync over a partial one is what makes the gap permanent
    // (US-300).
    if (storeFailures.length === 0) {
      // Service role: non-admins may sync (they can read the row), but only the
      // admin policy lets a user-JWT client update it, so this write used to
      // fail for everyone else and last_sync never moved.
      const { error: lastSyncError } = await serviceClient
        .from('calendar_integrations')
        .update({ last_sync: new Date().toISOString(), last_sync_error: null, reauth_required_at: null })
        .eq('id', integration.id);

      if (lastSyncError) {
        logStep("Events stored but last_sync was not advanced", { error: lastSyncError.message });
      }
    } else {
      logStep("Sync incomplete, last_sync deliberately not advanced", {
        fetched: events.length,
        stored: storedCount,
        failures: storeFailures.slice(0, 5),
      });
    }

    logStep("Sync completed", { fetched: events.length, stored: storedCount });

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: storeFailures.length === 0,
      events_fetched: events.length,
      events_synced: storedCount,
      failures: storeFailures.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    await captureException(error, { fn: 'sync-calendar', req });
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

function oauthCreds(provider: CalendarProvider): OAuthClientCreds {
  const clientId = provider === 'google'
    ? Deno.env.get("GOOGLE_OAUTH_CLIENT_ID")
    : Deno.env.get("MICROSOFT_CLIENT_ID");
  const clientSecret = provider === 'google'
    ? Deno.env.get("GOOGLE_OAUTH_CLIENT_SECRET")
    : Deno.env.get("MICROSOFT_CLIENT_SECRET");
  if (!clientId || !clientSecret) {
    throw new Error(`${provider === 'google' ? 'Google' : 'Microsoft'} OAuth credentials not configured`);
  }
  return { clientId, clientSecret };
}

interface SyncedEvent {
  title: string;
  start_time: string;
  end_time: string;
  description: string;
  external_id: string;
}

async function fetchGoogleEvents(accessToken: string): Promise<ProviderCall<SyncedEvent[]>> {
  const url = new URL('https://www.googleapis.com/calendar/v3/calendars/primary/events');
  url.searchParams.set('timeMin', new Date().toISOString());
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // deno-lint-ignore no-explicit-any
  const items: any[] = Array.isArray(data?.items) ? data.items : [];
  return {
    unauthorized: false,
    value: items.map((event) => ({
      title: event.summary || 'No Title',
      start_time: event.start?.dateTime || event.start?.date,
      end_time: event.end?.dateTime || event.end?.date,
      description: event.description || '',
      external_id: event.id,
    })),
  };
}

async function fetchOutlookEvents(accessToken: string): Promise<ProviderCall<SyncedEvent[]>> {
  const url = new URL('https://graph.microsoft.com/v1.0/me/events');
  url.searchParams.set('$filter', `start/dateTime ge '${new Date().toISOString()}'`);
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (response.status === 401) return { unauthorized: true };
  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  // deno-lint-ignore no-explicit-any
  const items: any[] = Array.isArray(data?.value) ? data.value : [];
  return {
    unauthorized: false,
    value: items.map((event) => ({
      title: event.subject || 'No Title',
      start_time: event.start?.dateTime,
      end_time: event.end?.dateTime,
      description: event.bodyPreview || '',
      external_id: event.id,
    })),
  };
}
