import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const logStep = (step: string, details?: any) => {
  console.log(`[TIME-TRACKING] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { 
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
      }
    });
  }

  try {
    logStep("Function started", { method: req.method });

    // Initialize auth context with site isolation
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, siteId, supabase } = authContext;
    logStep("User authenticated", { userId: user.id, siteId });

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (path === "entries") {
          // Get time entries for the user with site isolation
          const { data: timeEntries, error: entriesError } = await supabase
            .from('time_entries')
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .eq('site_id', siteId)
            .eq('user_id', user.id)
            .order('start_time', { ascending: false });

          if (entriesError) throw new Error(`Time entries fetch error: ${entriesError.message}`);
          
          logStep("Time entries retrieved", { count: timeEntries?.length, siteId });
          return successResponse({ timeEntries });
        }

        if (path === "active") {
          // Get current active time entry for the user with site isolation
          const { data: activeEntry, error: activeError } = await supabase
            .from('time_entries')
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .eq('site_id', siteId)
            .eq('user_id', user.id)
            .is('end_time', null)
            .maybeSingle();

          logStep("Active entry retrieved", { hasActive: !!activeEntry, siteId });
          return successResponse({ activeEntry });
        }

        break;

      case "POST":
        if (path === "start") {
          const body = await req.json();
          logStep("Starting time entry", body);

          // Check if user already has an active entry with site isolation
          const { data: existingEntry } = await supabase
            .from('time_entries')
            .select('id')
            .eq('site_id', siteId)
            .eq('user_id', user.id)
            .is('end_time', null)
            .maybeSingle();

          if (existingEntry) {
            throw new Error("User already has an active time entry. Please stop the current entry first.");
          }

          const timeEntryData = {
            ...body,
            site_id: siteId,
            user_id: user.id,
            start_time: new Date().toISOString()
          };

          const { data: newEntry, error: createError } = await supabase
            .from('time_entries')
            .insert([timeEntryData])
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .single();

          if (createError) throw new Error(`Time entry creation error: ${createError.message}`);

          logStep("Time entry started", { entryId: newEntry.id, siteId });
          return successResponse({ timeEntry: newEntry });
        }

        if (path === "stop") {
          const body = await req.json();
          const { entryId } = body;
          logStep("Stopping time entry", { entryId });

          // Calculate total hours with site isolation
          const { data: entry, error: fetchError } = await supabase
            .from('time_entries')
            .select('start_time, break_duration')
            .eq('id', entryId)
            .eq('site_id', siteId)
            .eq('user_id', user.id)
            .single();

          if (fetchError) throw new Error(`Time entry fetch error: ${fetchError.message}`);

          const endTime = new Date();
          const startTime = new Date(entry.start_time);
          const totalMinutes = Math.floor((endTime.getTime() - startTime.getTime()) / (1000 * 60));
          const breakMinutes = entry.break_duration || 0;
          const totalHours = Math.max(0, totalMinutes - breakMinutes) / 60;

          const { data: updatedEntry, error: updateError } = await supabase
            .from('time_entries')
            .update({
              end_time: endTime.toISOString(),
              total_hours: Number(totalHours.toFixed(2))
            })
            .eq('id', entryId)
            .eq('site_id', siteId)
            .eq('user_id', user.id)
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .single();

          if (updateError) throw new Error(`Time entry update error: ${updateError.message}`);

          logStep("Time entry stopped", { entryId, totalHours, siteId });
          return successResponse({ timeEntry: updatedEntry });
        }

        break;
    }

    // If no route matched
    return errorResponse("Route not found", 404);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});