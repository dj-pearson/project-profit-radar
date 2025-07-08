import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://cdn.skypack.dev/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[DAILY-REPORTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    // Get user profile to check role
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);

    const url = new URL(req.url);
    const method = req.method;
    
    // Handle different request types
    if (method === "GET") {
      const projectId = url.searchParams.get('project_id');
      
      let query = supabaseClient
        .from('daily_reports')
        .select(`
          *,
          projects(name)
        `)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: dailyReports, error: reportsError } = await query;

      if (reportsError) throw new Error(`Daily reports fetch error: ${reportsError.message}`);
      
      logStep("Daily reports retrieved", { count: dailyReports?.length });
      return new Response(JSON.stringify({ dailyReports }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "list") {
        // POST request for listing daily reports
        const projectId = body.project_id;
        
        let query = supabaseClient
          .from('daily_reports')
          .select(`
            *,
            projects(name)
          `)
          .order('date', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data: dailyReports, error: reportsError } = await query;

        if (reportsError) throw new Error(`Daily reports fetch error: ${reportsError.message}`);
        
        logStep("Daily reports retrieved", { count: dailyReports?.length });
        return new Response(JSON.stringify({ dailyReports }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      if (action === "create") {
        logStep("Creating daily report", body);

        // Verify user can create daily reports
        if (!['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
          throw new Error("Insufficient permissions to create daily reports");
        }

        const reportDate = body.date || new Date().toISOString().split('T')[0];
        
        const reportData = {
          project_id: body.project_id,
          work_performed: body.work_performed,
          crew_count: body.crew_count,
          weather_conditions: body.weather_conditions,
          materials_delivered: body.materials_delivered,
          equipment_used: body.equipment_used,
          delays_issues: body.delays_issues,
          safety_incidents: body.safety_incidents,
          date: reportDate,
          created_by: user.id
        };

        const { data: newReport, error: createError } = await supabaseClient
          .from('daily_reports')
          .insert([reportData])
          .select(`
            *,
            projects(name)
          `)
          .single();

        if (createError) throw new Error(`Daily report creation error: ${createError.message}`);

        logStep("Daily report created", { reportId: newReport.id, date: reportDate });
        return new Response(JSON.stringify({ dailyReport: newReport }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });
      }
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