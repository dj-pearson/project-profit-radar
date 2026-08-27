import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { WRITABLE_TIME_ENTRY_COLUMNS, pickAllowed } from '../_shared/writable-columns.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateBody } from '../_shared/validate-body.ts';

const ClockInSchema = z.object({
  project_id: z.string().uuid(),
  task_id: z.string().uuid().optional().nullable(),
  cost_code_id: z.string().uuid().optional().nullable(),
  description: z.string().max(10000).optional().nullable(),
  location: z.string().max(1000).optional().nullable(),
  location_accuracy: z.number().optional().nullable(),
  gps_latitude: z.number().min(-90).max(90).optional().nullable(),
  gps_longitude: z.number().min(-180).max(180).optional().nullable(),
  geofence_id: z.string().uuid().optional().nullable(),
  is_geofence_verified: z.boolean().optional().nullable(),
  geofence_breach_detected: z.boolean().optional().nullable(),
  geofence_distance_meters: z.number().optional().nullable(),
  break_duration: z.number().optional().nullable(),
}).passthrough();

const ClockOutSchema = z.object({
  entryId: z.string().uuid(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  console.log(`[TIME-TRACKING] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return handleCorsPreflightRequest(req);
  }

  try {
    logStep("Function started", { method: req.method });

    // Initialize auth context with site isolation
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

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
            .eq('user_id', user.id)
            .order('start_time', { ascending: false });

          if (entriesError) throw new Error(`Time entries fetch error: ${entriesError.message}`);
          
          logStep("Time entries retrieved", { count: timeEntries?.length });
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
            .eq('user_id', user.id)
            .is('end_time', null)
            .maybeSingle();

          logStep("Active entry retrieved", { hasActive: !!activeEntry });
          return successResponse({ activeEntry });
        }

        break;

      case "POST":
        if (path === "start") {
          const parsed = await validateBody(req, ClockInSchema, { name: 'time-tracking:start' });
          if (!parsed.ok) return parsed.response;
          const body = parsed.data as Record<string, unknown>;
          logStep("Starting time entry", body);

          // Check if user already has an active entry with site isolation
          const { data: existingEntry } = await supabase
            .from('time_entries')
            .select('id')
            .eq('user_id', user.id)
            .is('end_time', null)
            .maybeSingle();

          if (existingEntry) {
            throw new Error("User already has an active time entry. Please stop the current entry first.");
          }

          // Allowlisted rather than spread: the raw body let a caller set the
          // approval columns, so a worker could clock in already-approved and
          // walk past timesheet review. RLS only checks company_id and user_id.
          const timeEntryData = {
            ...pickAllowed(body, WRITABLE_TIME_ENTRY_COLUMNS),
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

          logStep("Time entry started", { entryId: newEntry.id });
          return successResponse({ timeEntry: newEntry });
        }

        if (path === "stop") {
          const parsed = await validateBody(req, ClockOutSchema, { name: 'time-tracking:stop' });
          if (!parsed.ok) return parsed.response;
          const { entryId } = parsed.data as Record<string, any>;
          logStep("Stopping time entry", { entryId });

          // Calculate total hours with site isolation
          const { data: entry, error: fetchError } = await supabase
            .from('time_entries')
            .select('start_time, break_duration')
            .eq('id', entryId)
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
            .eq('user_id', user.id)
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .single();

          if (updateError) throw new Error(`Time entry update error: ${updateError.message}`);

          logStep("Time entry stopped", { entryId, totalHours });
          return successResponse({ timeEntry: updatedEntry });
        }

        break;
    }

    // If no route matched
    return errorResponse("Route not found", 404);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return safeErrorResponse(req);
  }
});