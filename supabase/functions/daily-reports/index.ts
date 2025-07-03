import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        // Default GET request or explicit list request
        if (!path || path === "daily-reports" || path === "list") {
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

        if (path === "today") {
          const projectId = url.searchParams.get('project_id');
          if (!projectId) throw new Error("Project ID is required");

          const today = new Date().toISOString().split('T')[0];
          
          const { data: todaysReport, error: reportError } = await supabaseClient
            .from('daily_reports')
            .select(`
              *,
              projects(name)
            `)
            .eq('project_id', projectId)
            .eq('date', today)
            .maybeSingle();

          logStep("Today's report retrieved", { projectId, hasReport: !!todaysReport });
          return new Response(JSON.stringify({ dailyReport: todaysReport }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;

      case "POST":
        if (path === "create") {
          const body = await req.json();
          logStep("Creating daily report", body);

          // Verify user can create daily reports
          if (!['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to create daily reports");
          }

          const reportDate = body.date || new Date().toISOString().split('T')[0];
          
          const reportData = {
            ...body,
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