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

    // Get user profile to check company and role
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (!profile?.company_id) {
      throw new Error("User not associated with a company");
    }

    const { method } = req;
    const url = new URL(req.url);
    const projectId = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (projectId && projectId !== "projects") {
          // Get single project with details
          const { data: project, error } = await supabaseClient
            .from('projects')
            .select(`
              *,
              project_phases (
                *,
                tasks (
                  *,
                  time_entries (*)
                )
              ),
              change_orders (*),
              job_costs (*)
            `)
            .eq('id', projectId)
            .eq('company_id', profile.company_id)
            .single();

          if (error) throw error;
          return new Response(JSON.stringify(project), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // List all projects for company
          const { data: projects, error } = await supabaseClient
            .from('projects')
            .select('*')
            .eq('company_id', profile.company_id)
            .order('created_at', { ascending: false });

          if (error) throw error;
          return new Response(JSON.stringify(projects), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      case "POST":
        const projectData = await req.json();
        
        // Check if user can create projects
        if (!['admin', 'project_manager', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to create projects");
        }

        const { data: newProject, error: createError } = await supabaseClient
          .from('projects')
          .insert({
            ...projectData,
            company_id: profile.company_id,
            created_by: user.id
          })
          .select()
          .single();

        if (createError) throw createError;

        // Create default project phases if not provided
        if (projectData.create_default_phases !== false) {
          const defaultPhases = [
            { name: "Planning", order_index: 1, status: "active" },
            { name: "Pre-Construction", order_index: 2, status: "pending" },
            { name: "Construction", order_index: 3, status: "pending" },
            { name: "Final Inspection", order_index: 4, status: "pending" },
            { name: "Project Closeout", order_index: 5, status: "pending" }
          ];

          await supabaseClient
            .from('project_phases')
            .insert(
              defaultPhases.map(phase => ({
                ...phase,
                project_id: newProject.id
              }))
            );
        }

        return new Response(JSON.stringify(newProject), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });

      case "PUT":
        if (!projectId) {
          throw new Error("Project ID required for update");
        }

        const updateData = await req.json();
        
        // Check if user can update projects
        if (!['admin', 'project_manager', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to update projects");
        }

        const { data: updatedProject, error: updateError } = await supabaseClient
          .from('projects')
          .update(updateData)
          .eq('id', projectId)
          .eq('company_id', profile.company_id)
          .select()
          .single();

        if (updateError) throw updateError;
        return new Response(JSON.stringify(updatedProject), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "DELETE":
        if (!projectId) {
          throw new Error("Project ID required for deletion");
        }

        // Check if user can delete projects
        if (!['admin', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to delete projects");
        }

        const { error: deleteError } = await supabaseClient
          .from('projects')
          .delete()
          .eq('id', projectId)
          .eq('company_id', profile.company_id);

        if (deleteError) throw deleteError;
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error(`Method ${method} not allowed`);
    }

  } catch (error) {
    console.error("Error in projects function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});