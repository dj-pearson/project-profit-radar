import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  console.log(`[PROJECTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    // Get user profile to check role and company
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("User profile retrieved", { role: userProfile.role, companyId: userProfile.company_id });

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (path === "list") {
          // List all projects for the user's company
          const { data: projects, error: projectsError } = await supabaseClient
            .from('projects')
            .select(`
              *,
              project_phases(*),
              tasks(count),
              job_costs(sum:total_cost),
              change_orders(count)
            `)
            .order('created_at', { ascending: false });

          if (projectsError) throw new Error(`Projects fetch error: ${projectsError.message}`);
          
          logStep("Projects retrieved", { count: projects?.length });
          return new Response(JSON.stringify({ projects }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        if (path?.length === 36) { // UUID length
          // Get single project with full details
          const projectId = path;
          const { data: project, error: projectError } = await supabaseClient
            .from('projects')
            .select(`
              *,
              project_phases(*),
              tasks(*),
              job_costs(*),
              change_orders(*),
              documents(*),
              daily_reports(*)
            `)
            .eq('id', projectId)
            .single();

          if (projectError) throw new Error(`Project fetch error: ${projectError.message}`);
          
          logStep("Project detail retrieved", { projectId });
          return new Response(JSON.stringify({ project }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;

      case "POST":
        if (path === "create") {
          const body = await req.json();
          logStep("Creating project", body);

          // Verify user can create projects
          if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to create projects");
          }

          const projectData = {
            ...body,
            company_id: userProfile.company_id,
            created_by: user.id,
            project_manager_id: body.project_manager_id || user.id
          };

          const { data: newProject, error: createError } = await supabaseClient
            .from('projects')
            .insert([projectData])
            .select()
            .single();

          if (createError) throw new Error(`Project creation error: ${createError.message}`);

          logStep("Project created", { projectId: newProject.id });
          return new Response(JSON.stringify({ project: newProject }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 201,
          });
        }

        break;

      case "PUT":
        if (path?.length === 36) { // UUID length
          const projectId = path;
          const body = await req.json();
          logStep("Updating project", { projectId, body });

          // Verify user can update this project
          if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to update projects");
          }

          const { data: updatedProject, error: updateError } = await supabaseClient
            .from('projects')
            .update(body)
            .eq('id', projectId)
            .select()
            .single();

          if (updateError) throw new Error(`Project update error: ${updateError.message}`);

          logStep("Project updated", { projectId });
          return new Response(JSON.stringify({ project: updatedProject }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          });
        }

        break;

      case "DELETE":
        if (path?.length === 36) { // UUID length
          const projectId = path;
          logStep("Deleting project", { projectId });

          // Verify user can delete projects
          if (!['admin', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to delete projects");
          }

          const { error: deleteError } = await supabaseClient
            .from('projects')
            .delete()
            .eq('id', projectId);

          if (deleteError) throw new Error(`Project deletion error: ${deleteError.message}`);

          logStep("Project deleted", { projectId });
          return new Response(JSON.stringify({ success: true }), {
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