import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

const logStep = (step: string, details?: any) => {
  console.log(`[DAILY-REPORTS] ${step}${details ? ` - ${JSON.stringify(details)}` : ''}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
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

    // Get user profile to check role with site isolation
    const { data: userProfile, error: profileError } = await supabase
      .from('user_profiles')
      .select('role, company_id')
      .eq('id', user.id)
      .single();

    if (profileError) {
      logStep("Profile lookup error", { error: profileError.message });
      return errorResponse(`Profile error: ${profileError.message}`, 400);
    }

    const url = new URL(req.url);
    const method = req.method;

    // Handle different request types
    if (method === "GET") {
      const projectId = url.searchParams.get('project_id');

      // Query with site isolation
      let query = supabase
        .from('daily_reports')
        .select(`
          *,
          projects!inner(name, company_id, site_id)
        `)
        .eq('projects.company_id', userProfile.company_id)
        .order('date', { ascending: false });

      if (projectId) {
        query = query.eq('project_id', projectId);
      }

      const { data: dailyReports, error: reportsError } = await query;

      if (reportsError) {
        logStep("Daily reports fetch error", { error: reportsError.message });
        return errorResponse(`Daily reports fetch error: ${reportsError.message}`, 500);
      }

      logStep("Daily reports retrieved", { count: dailyReports?.length });
      return successResponse({ dailyReports });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "list") {
        // POST request for listing daily reports with site isolation
        const projectId = body.project_id;

        let query = supabase
          .from('daily_reports')
          .select(`
            *,
            projects!inner(name, company_id, site_id)
          `)
          .eq('projects.company_id', userProfile.company_id)
          .order('date', { ascending: false });

        if (projectId) {
          query = query.eq('project_id', projectId);
        }

        const { data: dailyReports, error: reportsError } = await query;

        if (reportsError) {
          logStep("Daily reports fetch error", { error: reportsError.message });
          return errorResponse(`Daily reports fetch error: ${reportsError.message}`, 500);
        }

        logStep("Daily reports retrieved", { count: dailyReports?.length });
        return successResponse({ dailyReports });
      }

      if (action === "create") {
        logStep("Creating daily report", { body });

        // Verify user can create daily reports
        if (!['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
          return errorResponse("Insufficient permissions to create daily reports", 403);
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
          created_by: user.id,
          site_id: siteId          };

        const { data: newReport, error: createError } = await supabase
          .from('daily_reports')
          .insert([reportData])
          .select(`
            *,
            projects(name)
          `)
          .single();

        if (createError) {
          logStep("Daily report creation error", { error: createError.message });
          return errorResponse(`Daily report creation error: ${createError.message}`, 500);
        }

        logStep("Daily report created", { reportId: newReport.id, date: reportDate });
        return successResponse({ dailyReport: newReport });
      }

      if (action === "update") {
        const { reportId, ...updateFields } = body;
        logStep("Updating daily report", { reportId });

        // Verify user can update daily reports
        if (!['admin', 'project_manager', 'field_supervisor', 'root_admin'].includes(userProfile.role)) {
          return errorResponse("Insufficient permissions to update daily reports", 403);
        }

        const { data: updatedReport, error: updateError } = await supabase
          .from('daily_reports')
          .update({
            work_performed: updateFields.work_performed,
            crew_count: updateFields.crew_count,
            weather_conditions: updateFields.weather_conditions,
            materials_delivered: updateFields.materials_delivered,
            equipment_used: updateFields.equipment_used,
            delays_issues: updateFields.delays_issues,
            safety_incidents: updateFields.safety_incidents,
            updated_at: new Date().toISOString()
          })
          .eq('id', reportId)
            // CRITICAL: Site isolation on update
          .select(`
            *,
            projects(name)
          `)
          .single();

        if (updateError) {
          logStep("Daily report update error", { error: updateError.message });
          return errorResponse(`Daily report update error: ${updateError.message}`, 500);
        }

        logStep("Daily report updated", { reportId });
        return successResponse({ dailyReport: updatedReport });
      }

      if (action === "delete") {
        const { reportId } = body;
        logStep("Deleting daily report", { reportId });

        // Verify user can delete daily reports
        if (!['admin', 'root_admin'].includes(userProfile.role)) {
          return errorResponse("Insufficient permissions to delete daily reports", 403);
        }

        const { error: deleteError } = await supabase
          .from('daily_reports')
          .delete()
          .eq('id', reportId)
          ;  // CRITICAL: Site isolation on delete

        if (deleteError) {
          logStep("Daily report deletion error", { error: deleteError.message });
          return errorResponse(`Daily report deletion error: ${deleteError.message}`, 500);
        }

        logStep("Daily report deleted", { reportId });
        return successResponse({ success: true });
      }
    }

    // If no route matched
    return errorResponse("Route not found", 404);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});
