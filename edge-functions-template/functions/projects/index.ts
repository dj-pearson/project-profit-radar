import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const logStep = (step: string, details?: any) => {
  console.log(`[PROJECTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    // Get user profile to check role and company
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('*')
      .eq('id', user.id)
      .eq('site_id', siteId)
      .single();

    if (profileError) throw new Error(`Profile error: ${profileError.message}`);
    logStep("User profile retrieved", { role: userProfile.role, companyId: userProfile.company_id, siteId });

    const url = new URL(req.url);
    const method = req.method;
    const path = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        if (path === "list") {
          // List all projects for the user's company with site isolation
          const { data: projects, error: projectsError } = await supabase
            .from('projects')
            .select(`
              *,
              project_phases(*),
              tasks(count),
              job_costs(sum:total_cost),
              change_orders(count)
            `)
            .eq('site_id', siteId)
            .eq('company_id', userProfile.company_id)
            .order('created_at', { ascending: false });

          if (projectsError) throw new Error(`Projects fetch error: ${projectsError.message}`);
          
          logStep("Projects retrieved", { count: projects?.length, siteId });
          return successResponse({ projects });
        }

        if (path?.length === 36) { // UUID length
          // Get single project with full details and site isolation
          const projectId = path;
          const { data: project, error: projectError } = await supabase
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
            .eq('site_id', siteId)
            .eq('company_id', userProfile.company_id)
            .single();

          if (projectError) throw new Error(`Project fetch error: ${projectError.message}`);
          
          logStep("Project detail retrieved", { projectId, siteId });
          return successResponse({ project });
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
            site_id: siteId,
            company_id: userProfile.company_id,
            created_by: user.id,
            project_manager_id: body.project_manager_id || user.id
          };

          const { data: newProject, error: createError } = await supabase
            .from('projects')
            .insert([projectData])
            .select()
            .single();

          if (createError) throw new Error(`Project creation error: ${createError.message}`);

          logStep("Project created", { projectId: newProject.id, siteId });
          return successResponse({ project: newProject });
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

          const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update(body)
            .eq('id', projectId)
            .eq('site_id', siteId)
            .eq('company_id', userProfile.company_id)
            .select()
            .single();

          if (updateError) throw new Error(`Project update error: ${updateError.message}`);

          logStep("Project updated", { projectId, siteId });
          return successResponse({ project: updatedProject });
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

          const { error: deleteError } = await supabase
            .from('projects')
            .delete()
            .eq('id', projectId)
            .eq('site_id', siteId)
            .eq('company_id', userProfile.company_id);

          if (deleteError) throw new Error(`Project deletion error: ${deleteError.message}`);

          logStep("Project deleted", { projectId, siteId });
          return successResponse({ success: true });
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