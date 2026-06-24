// Manage Schedules Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SCHEDULES] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    logStep("User authenticated", { userId: user.id, siteId });

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action, schedule_id, schedule_data } = await req.json();
    logStep("Processing action", { siteId, action, schedule_id });

    switch (action) {
      case 'list': {
        const { data: schedules } = await supabaseClient
          .from('seo_monitoring_schedules')
          .select('*')
          .eq('site_id', siteId)  // CRITICAL: Site isolation
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          schedules: schedules || [],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'create': {
        // Calculate next run time
        const now = new Date();
        const nextRun = new Date(now);
        switch (schedule_data.frequency) {
          case 'hourly':
            nextRun.setHours(nextRun.getHours() + 1);
            break;
          case 'daily':
            nextRun.setDate(nextRun.getDate() + 1);
            break;
          case 'weekly':
            nextRun.setDate(nextRun.getDate() + 7);
            break;
          case 'monthly':
            nextRun.setMonth(nextRun.getMonth() + 1);
            break;
        }

        const { data: created } = await supabaseClient
          .from('seo_monitoring_schedules')
          .insert({
            site_id: siteId,  // CRITICAL: Site isolation
            schedule_name: schedule_data.schedule_name,
            target_url: schedule_data.target_url,
            audit_type: schedule_data.audit_type || 'full',
            frequency: schedule_data.frequency,
            is_active: schedule_data.is_active !== false,
            next_run_at: nextRun.toISOString(),
            created_by: user.id,
          })
          .select()
          .single();

        return new Response(JSON.stringify({
          success: true,
          message: 'Schedule created',
          schedule: created,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'update': {
        if (!schedule_id) {
          return new Response(JSON.stringify({ error: 'schedule_id required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        const { data: updated } = await supabaseClient
          .from('seo_monitoring_schedules')
          .update(schedule_data)
          .eq('site_id', siteId)  // CRITICAL: Site isolation
          .eq('id', schedule_id)
          .select()
          .single();

        return new Response(JSON.stringify({
          success: true,
          message: 'Schedule updated',
          schedule: updated,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'delete': {
        if (!schedule_id) {
          return new Response(JSON.stringify({ error: 'schedule_id required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        await supabaseClient
          .from('seo_monitoring_schedules')
          .delete()
          .eq('site_id', siteId)  // CRITICAL: Site isolation
          .eq('id', schedule_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Schedule deleted',
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      default:
        return new Response(JSON.stringify({ error: 'Invalid action. Use: list, create, update, delete' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
