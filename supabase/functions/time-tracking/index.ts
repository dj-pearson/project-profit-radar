import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const authHeader = req.headers.get("Authorization")!;
    const token = authHeader.replace("Bearer ", "");
    const { data } = await supabaseClient.auth.getUser(token);
    const user = data.user;
    
    if (!user) {
      throw new Error("User not authenticated");
    }

    const { method } = req;
    const url = new URL(req.url);
    const action = url.searchParams.get("action");

    switch (method) {
      case "GET":
        if (action === "active") {
          // Get currently active time entry for user
          const { data: activeEntry, error } = await supabaseClient
            .from('time_entries')
            .select(`
              *,
              tasks (
                name,
                projects (name)
              )
            `)
            .eq('user_id', user.id)
            .is('end_time', null)
            .order('start_time', { ascending: false })
            .limit(1)
            .single();

          if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" errors
          
          return new Response(JSON.stringify(activeEntry || null), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // Get time entries for date range
          const startDate = url.searchParams.get("start_date") || new Date().toISOString().split('T')[0];
          const endDate = url.searchParams.get("end_date") || startDate;

          const { data: entries, error } = await supabaseClient
            .from('time_entries')
            .select(`
              *,
              tasks (
                name,
                project_phases (
                  name,
                  projects (name, id)
                )
              )
            `)
            .eq('user_id', user.id)
            .gte('start_time', startDate)
            .lte('start_time', endDate + 'T23:59:59')
            .order('start_time', { ascending: false });

          if (error) throw error;
          return new Response(JSON.stringify(entries), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      case "POST":
        const entryData = await req.json();
        
        if (action === "clock-in") {
          // Check for existing active entry
          const { data: existingEntry } = await supabaseClient
            .from('time_entries')
            .select('id')
            .eq('user_id', user.id)
            .is('end_time', null)
            .single();

          if (existingEntry) {
            throw new Error("You already have an active time entry. Please clock out first.");
          }

          // Create new time entry
          const { data: newEntry, error } = await supabaseClient
            .from('time_entries')
            .insert({
              user_id: user.id,
              task_id: entryData.task_id,
              start_time: new Date().toISOString(),
              gps_location: entryData.gps_location,
              notes: entryData.notes
            })
            .select(`
              *,
              tasks (
                name,
                project_phases (
                  name,
                  projects (name, id)
                )
              )
            `)
            .single();

          if (error) throw error;
          return new Response(JSON.stringify(newEntry), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });

        } else if (action === "clock-out") {
          // Find active entry
          const { data: activeEntry, error: findError } = await supabaseClient
            .from('time_entries')
            .select('*')
            .eq('user_id', user.id)
            .is('end_time', null)
            .single();

          if (findError) throw new Error("No active time entry found");

          // Calculate total hours
          const startTime = new Date(activeEntry.start_time);
          const endTime = new Date();
          const totalHours = (endTime.getTime() - startTime.getTime()) / (1000 * 60 * 60);

          // Update entry with end time
          const { data: updatedEntry, error } = await supabaseClient
            .from('time_entries')
            .update({
              end_time: endTime.toISOString(),
              total_hours: Math.round(totalHours * 100) / 100, // Round to 2 decimal places
              gps_location_end: entryData.gps_location,
              notes: entryData.notes || activeEntry.notes
            })
            .eq('id', activeEntry.id)
            .select(`
              *,
              tasks (
                name,
                project_phases (
                  name,
                  projects (name, id)
                )
              )
            `)
            .single();

          if (error) throw error;

          // Update job costs with labor time
          await updateJobCosts(supabaseClient, activeEntry.task_id, totalHours, user.id);

          return new Response(JSON.stringify(updatedEntry), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });

        } else {
          // Manual time entry
          const { data: newEntry, error } = await supabaseClient
            .from('time_entries')
            .insert({
              user_id: user.id,
              task_id: entryData.task_id,
              start_time: entryData.start_time,
              end_time: entryData.end_time,
              total_hours: entryData.total_hours,
              notes: entryData.notes,
              is_manual_entry: true
            })
            .select(`
              *,
              tasks (
                name,
                project_phases (
                  name,
                  projects (name, id)
                )
              )
            `)
            .single();

          if (error) throw error;

          // Update job costs
          await updateJobCosts(supabaseClient, entryData.task_id, entryData.total_hours, user.id);

          return new Response(JSON.stringify(newEntry), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        }

      case "PUT":
        const updateData = await req.json();
        const entryId = url.pathname.split('/').pop();

        if (!entryId) {
          throw new Error("Time entry ID required for update");
        }

        const { data: updatedEntry, error } = await supabaseClient
          .from('time_entries')
          .update(updateData)
          .eq('id', entryId)
          .eq('user_id', user.id)
          .select()
          .single();

        if (error) throw error;
        return new Response(JSON.stringify(updatedEntry), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error(`Method ${method} not allowed`);
    }

  } catch (error) {
    console.error("Error in time-tracking function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

// Helper function to update job costs with labor hours
async function updateJobCosts(supabaseClient: any, taskId: string, hours: number, userId: string) {
  try {
    // Get task details to find project
    const { data: task } = await supabaseClient
      .from('tasks')
      .select(`
        project_phases (
          project_id
        )
      `)
      .eq('id', taskId)
      .single();

    if (!task) return;

    const projectId = task.project_phases.project_id;

    // Get or create labor cost code entry for this project
    const laborCostCode = "LABOR-GENERAL";
    
    const { data: existingCost, error: findError } = await supabaseClient
      .from('job_costs')
      .select('*')
      .eq('project_id', projectId)
      .eq('cost_code', laborCostCode)
      .single();

    const laborRate = 35.00; // Default labor rate - should come from user profile or company settings
    const totalCost = hours * laborRate;

    if (existingCost) {
      // Update existing cost entry
      await supabaseClient
        .from('job_costs')
        .update({
          actual_quantity: (existingCost.actual_quantity || 0) + hours,
          actual_amount: (existingCost.actual_amount || 0) + totalCost
        })
        .eq('id', existingCost.id);
    } else {
      // Create new cost entry
      await supabaseClient
        .from('job_costs')
        .insert({
          project_id: projectId,
          cost_code: laborCostCode,
          description: "General Labor",
          category: "labor",
          budgeted_quantity: 0,
          budgeted_amount: 0,
          actual_quantity: hours,
          actual_amount: totalCost,
          unit_of_measure: "hours"
        });
    }
  } catch (error) {
    console.error("Error updating job costs:", error);
    // Don't throw - this is a background operation
  }
}