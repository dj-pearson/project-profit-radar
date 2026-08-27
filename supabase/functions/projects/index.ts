import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { handleCorsPreflightRequest } from '../_shared/secure-cors.ts';
import { z } from "npm:zod@3";
import { validateBody } from '../_shared/validate-body.ts';
import { checkEntitlement } from '../_shared/entitlements.ts';

/**
 * Columns a caller may write on `projects`. Both handlers below used to spread
 * the raw body into insert()/update(), so any writable column was settable —
 * including id, created_by and created_at. RLS blocks the cross-tenant case
 * (projects_update has no WITH CHECK, so Postgres applies its USING clause to
 * the new row too), but nothing stopped a caller rewriting provenance columns
 * inside their own company. The allowlist is applied unconditionally, not
 * gated on INPUT_VALIDATION_MODE: dropping a column a client should never have
 * been writing is not the kind of tightening that breaks an older client.
 */
const WRITABLE_PROJECT_COLUMNS = [
  'name', 'description', 'status', 'project_type',
  'client_name', 'client_email',
  'site_address', 'site_latitude', 'site_longitude', 'geofence_radius_meters',
  'start_date', 'end_date',
  'budget', 'total_budget', 'profit_margin',
  'estimated_hours', 'actual_hours', 'completion_percentage',
  'project_manager_id', 'opportunity_id', 'permit_numbers', 'created_from',
] as const;

function pickWritable(body: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of WRITABLE_PROJECT_COLUMNS) {
    if (k in body) out[k] = body[k];
  }
  return out;
}

const ProjectWriteSchema = z.object({
  name: z.string().min(1).max(500).optional(),
  description: z.string().max(20000).optional().nullable(),
  status: z.string().max(50).optional().nullable(),
  project_type: z.string().max(100).optional().nullable(),
  client_name: z.string().max(500).optional().nullable(),
  client_email: z.string().email().max(255).optional().nullable(),
  site_address: z.string().max(1000).optional().nullable(),
  site_latitude: z.number().optional().nullable(),
  site_longitude: z.number().optional().nullable(),
  geofence_radius_meters: z.number().optional().nullable(),
  start_date: z.string().optional().nullable(),
  end_date: z.string().optional().nullable(),
  budget: z.number().optional().nullable(),
  total_budget: z.number().optional().nullable(),
  profit_margin: z.number().optional().nullable(),
  estimated_hours: z.number().optional().nullable(),
  actual_hours: z.number().optional().nullable(),
  completion_percentage: z.number().optional().nullable(),
  project_manager_id: z.string().uuid().optional().nullable(),
  opportunity_id: z.string().uuid().optional().nullable(),
  permit_numbers: z.array(z.string()).optional().nullable(),
  created_from: z.string().max(100).optional().nullable(),
}).passthrough();

const logStep = (step: string, details?: any) => {
  console.log(`[PROJECTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
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

    // Get user profile to check role and company
    const { data: userProfile, error: profileError } = await supabase
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
            .eq('company_id', userProfile.company_id)
            .order('created_at', { ascending: false });

          if (projectsError) throw new Error(`Projects fetch error: ${projectsError.message}`);
          
          logStep("Projects retrieved", { count: projects?.length });
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
            .eq('company_id', userProfile.company_id)
            .single();

          if (projectError) throw new Error(`Project fetch error: ${projectError.message}`);
          
          logStep("Project detail retrieved", { projectId });
          return successResponse({ project });
        }

        break;

      case "POST":
        if (path === "create") {
          const parsed = await validateBody(req, ProjectWriteSchema, { name: 'projects:create' });
          if (!parsed.ok) return parsed.response;
          const body = parsed.data as Record<string, unknown>;
          logStep("Creating project", body);

          // Verify user can create projects
          if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to create projects");
          }

          // Enforce plan limits server-side. The client checkLimit() only gates
          // the UI and is bypassable by calling this endpoint directly, so the
          // server is the authoritative gate (US-199).
          const entitlement = await checkEntitlement(
            supabase,
            userProfile.company_id,
            'projects',
            { userId: user.id }
          );
          if (!entitlement.allowed) {
            logStep("Project limit reached", entitlement);
            return errorResponse(
              entitlement.reason || 'Project limit reached for your plan',
              403,
              req
            );
          }

          const projectData = {
            ...pickWritable(body),
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

          logStep("Project created", { projectId: newProject.id });
          return successResponse({ project: newProject });
        }

        break;

      case "PUT":
        if (path?.length === 36) { // UUID length
          const projectId = path;
          const parsed = await validateBody(req, ProjectWriteSchema, { name: 'projects:update' });
          if (!parsed.ok) return parsed.response;
          const body = parsed.data as Record<string, unknown>;
          logStep("Updating project", { projectId, body });

          // Verify user can update this project
          if (!['admin', 'project_manager', 'root_admin'].includes(userProfile.role)) {
            throw new Error("Insufficient permissions to update projects");
          }

          const { data: updatedProject, error: updateError } = await supabase
            .from('projects')
            .update(pickWritable(body))
            .eq('id', projectId)
            .eq('company_id', userProfile.company_id)
            .select()
            .single();

          if (updateError) throw new Error(`Project update error: ${updateError.message}`);

          logStep("Project updated", { projectId });
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
            .eq('company_id', userProfile.company_id);

          if (deleteError) throw new Error(`Project deletion error: ${deleteError.message}`);

          logStep("Project deleted", { projectId });
          return successResponse({ success: true });
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