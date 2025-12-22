// Sync Calendar Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[SYNC-CALENDAR] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
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
    const { integration_id, company_id } = body;

    if (!integration_id || !company_id) {
      throw new Error("Integration ID and Company ID are required");
    }

    // Get integration details with site isolation
    const { data: integration, error: integrationError } = await supabaseClient
      .from('calendar_integrations')
      .select('*')
        // CRITICAL: Site isolation
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

    // Store events in database with site isolation
    for (const event of events) {
      await supabaseClient
        .from('calendar_events')
        .upsert({  // CRITICAL: Site isolation
          company_id,
          title: event.title,
          start_time: event.start_time,
          end_time: event.end_time,
          description: event.description,
          calendar_provider: integration.provider,
          external_id: event.external_id,
          integration_id,
        }, {
          onConflict: 'external_id,integration_id,site_id'
        });
    }

    // Update last sync time with site isolation
    await supabaseClient
      .from('calendar_integrations')
      .update({ last_sync: new Date().toISOString() })
        // CRITICAL: Site isolation
      .eq('id', integration_id);

    logStep("Sync completed", { eventsCount: events.length });

    return new Response(JSON.stringify({ 
      success: true, 
      events_synced: events.length 
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