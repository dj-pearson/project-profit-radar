import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[TIME-TRACKING] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started", { method: req.method });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_ANON_KEY") ?? ""
    );

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    
    const user = userData.user;
    if (!user?.id) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (path === "entries") {
          // Get time entries for the user
          const { data: timeEntries, error: entriesError } = await supabaseClient
            .from('time_entries')
            .select(`
              *,
              projects(name),
              tasks(name),
              cost_codes(code, name)
            `)
            .order('start_time', { ascending: false });

          if (entriesError) throw new Error(`Time entries fetch error: ${entriesError.message}`);
          
          logStep("Time entries retrieved", { count: timeEntries?.length });
          return new Response(JSON.stringify({ timeEntries }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        if (path === "active") {
          // Get current active time entry for the user
          const { data: activeEntry, error: activeError } = await supabaseClient
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
          return new Response(JSON.stringify({ activeEntry }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;

      case "POST":
        if (path === "start") {
          const body = await req.json();
          logStep("Starting time entry", body);

          // Check if user already has an active entry
          const { data: existingEntry } = await supabaseClient
            .from('time_entries')
            .select('id')
            .eq('user_id', user.id)
            .is('end_time', null)
            .maybeSingle();

          if (existingEntry) {
            throw new Error("User already has an active time entry. Please stop the current entry first.");
          }

          const timeEntryData = {
            ...body,
            user_id: user.id,
            start_time: new Date().toISOString()
          };

          const { data: newEntry, error: createError } = await supabaseClient
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
          return new Response(JSON.stringify({ timeEntry: newEntry }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        }

        if (path === "stop") {
          const body = await req.json();
          const { entryId } = body;
          logStep("Stopping time entry", { entryId });

          // Calculate total hours
          const { data: entry, error: fetchError } = await supabaseClient
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

          const { data: updatedEntry, error: updateError } = await supabaseClient
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
          return new Response(JSON.stringify({ timeEntry: updatedEntry }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;
    }

    // If no route matched
    return new Response(JSON.stringify({ error: "Route not found" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 404,
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