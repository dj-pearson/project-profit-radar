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

    // Get user profile
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
    const reportId = url.pathname.split('/').pop();

    switch (method) {
      case "GET":
        const projectId = url.searchParams.get("project_id");
        const reportDate = url.searchParams.get("report_date");
        
        let query = supabaseClient
          .from('daily_reports')
          .select(`
            *,
            projects (name, company_id),
            user_profiles!daily_reports_submitted_by_fkey (first_name, last_name)
          `);

        if (reportId && reportId !== "daily-reports") {
          // Get single report
          const { data: report, error } = await query
            .eq('id', reportId)
            .single();

          if (error) throw error;
          
          // Check access
          if (report.projects.company_id !== profile.company_id) {
            throw new Error("Access denied");
          }

          return new Response(JSON.stringify(report), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        } else {
          // List reports with filters
          if (projectId) {
            query = query.eq('project_id', projectId);
          }
          if (reportDate) {
            query = query.eq('report_date', reportDate);
          }
          
          const { data: reports, error } = await query
            .order('report_date', { ascending: false });

          if (error) throw error;

          // Filter by company access
          const filteredReports = reports.filter(report => 
            report.projects.company_id === profile.company_id
          );

          return new Response(JSON.stringify(filteredReports), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          });
        }

      case "POST":
        const reportData = await req.json();
        
        // Verify project belongs to user's company
        const { data: project } = await supabaseClient
          .from('projects')
          .select('company_id')
          .eq('id', reportData.project_id)
          .single();

        if (!project || project.company_id !== profile.company_id) {
          throw new Error("Invalid project or access denied");
        }

        // Check if report already exists for this project and date
        const { data: existingReport } = await supabaseClient
          .from('daily_reports')
          .select('id')
          .eq('project_id', reportData.project_id)
          .eq('report_date', reportData.report_date)
          .single();

        if (existingReport) {
          throw new Error("Daily report already exists for this project and date");
        }

        // Create new daily report
        const { data: newReport, error } = await supabaseClient
          .from('daily_reports')
          .insert({
            ...reportData,
            submitted_by: user.id
          })
          .select(`
            *,
            projects (name),
            user_profiles!daily_reports_submitted_by_fkey (first_name, last_name)
          `)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(newReport), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 201,
        });

      case "PUT":
        if (!reportId) {
          throw new Error("Report ID required for update");
        }

        const updateData = await req.json();
        
        // Check permissions and ownership
        const { data: existingReport } = await supabaseClient
          .from('daily_reports')
          .select(`
            *,
            projects (company_id)
          `)
          .eq('id', reportId)
          .single();

        if (!existingReport || existingReport.projects.company_id !== profile.company_id) {
          throw new Error("Report not found or access denied");
        }

        // Only allow updates by the original submitter or admins
        if (existingReport.submitted_by !== user.id && 
            !['admin', 'project_manager', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to update this report");
        }

        const { data: updatedReport, error } = await supabaseClient
          .from('daily_reports')
          .update(updateData)
          .eq('id', reportId)
          .select(`
            *,
            projects (name),
            user_profiles!daily_reports_submitted_by_fkey (first_name, last_name)
          `)
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(updatedReport), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      case "DELETE":
        if (!reportId) {
          throw new Error("Report ID required for deletion");
        }

        // Check permissions - only admins or original submitter can delete
        const { data: reportToDelete } = await supabaseClient
          .from('daily_reports')
          .select(`
            submitted_by,
            projects (company_id)
          `)
          .eq('id', reportId)
          .single();

        if (!reportToDelete || reportToDelete.projects.company_id !== profile.company_id) {
          throw new Error("Report not found or access denied");
        }

        if (reportToDelete.submitted_by !== user.id && 
            !['admin', 'root_admin'].includes(profile.role)) {
          throw new Error("Insufficient permissions to delete this report");
        }

        const { error: deleteError } = await supabaseClient
          .from('daily_reports')
          .delete()
          .eq('id', reportId);

        if (deleteError) throw deleteError;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });

      default:
        throw new Error(`Method ${method} not allowed`);
    }

  } catch (error) {
    console.error("Error in daily-reports function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});