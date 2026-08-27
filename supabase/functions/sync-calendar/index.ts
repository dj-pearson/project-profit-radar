// Sync Calendar Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

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

    const body = await req.json();
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

    // Get integration details
    const { data: integration, error: integrationError } = await supabaseClient
      .from('calendar_integrations')
      .select('*')
      .eq('id', integration_id)
      .eq('company_id', company_id)
      .single();

    if (integrationError || !integration) {
      throw new Error("Integration not found");
    }

    let events = [];

    if (integration.provider === 'google') {
      events = await syncGoogleCalendar(integration);
    } else if (integration.provider === 'outlook') {
      events = await syncOutlookCalendar(integration);
    } else {
      throw new Error(`Unsupported provider: ${integration.provider}`);
    }

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
      const { error: lastSyncError } = await supabaseClient
        .from('calendar_integrations')
        .update({ last_sync: new Date().toISOString() })
        .eq('id', integration_id);

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
      success: storeFailures.length === 0,
      events_fetched: events.length,
      events_synced: storedCount,
      failures: storeFailures.length,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function syncGoogleCalendar(integration: any) {
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${new Date().toISOString()}`, {
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Google Calendar API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.items.map((event: any) => ({
    title: event.summary || 'No Title',
    start_time: event.start.dateTime || event.start.date,
    end_time: event.end.dateTime || event.end.date,
    description: event.description || '',
    external_id: event.id,
  }));
}

async function syncOutlookCalendar(integration: any) {
  const response = await fetch(`https://graph.microsoft.com/v1.0/me/events?$filter=start/dateTime ge '${new Date().toISOString()}'`, {
    headers: {
      Authorization: `Bearer ${integration.access_token}`,
    },
  });

  if (!response.ok) {
    throw new Error(`Microsoft Graph API error: ${response.statusText}`);
  }

  const data = await response.json();
  
  return data.value.map((event: any) => ({
    title: event.subject || 'No Title',
    start_time: event.start.dateTime,
    end_time: event.end.dateTime,
    description: event.bodyPreview || '',
    external_id: event.id,
  }));
}