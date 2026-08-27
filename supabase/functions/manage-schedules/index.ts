// Manage Schedules Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { WRITABLE_SCHEDULE_COLUMNS, pickAllowed } from '../_shared/writable-columns.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[MANAGE-SCHEDULES] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    logStep("User authenticated", { userId: user.id });

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role')
        // CRITICAL: Site isolation
      .eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action, schedule_id, schedule_data } = await req.json();
    logStep("Processing action", {  action, schedule_id });

    switch (action) {
      case 'list': {
        const { data: schedules } = await supabaseClient
          .from('seo_monitoring_schedules')
          .select('*')
            // CRITICAL: Site isolation
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

        // Every branch here answered `success: true` without reading the
        // error. supabase-js returns it rather than throwing, so a rejected
        // write came back as "Schedule created" with `schedule: undefined`, and
        // a rejected delete came back as "Schedule deleted" for a schedule that
        // kept running audits (US-300).
        const { data: created, error: createError } = await supabaseClient
          .from('seo_monitoring_schedules')
          .insert({  // CRITICAL: Site isolation
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

        if (createError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Schedule was not created: ${createError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

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

        // Allowlisted rather than spread — see manage-alert-rules for the
        // reasoning. root_admin only, but the two paths should agree.
        const { data: updated, error: updateError } = await supabaseClient
          .from('seo_monitoring_schedules')
          .update(pickAllowed(schedule_data, WRITABLE_SCHEDULE_COLUMNS))
            // CRITICAL: Site isolation
          .eq('id', schedule_id)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Schedule ${schedule_id} was not updated: ${updateError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

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

        // `.select('id')` so the response can distinguish a schedule that was
        // deleted from one that matched nothing. The policy on this table is
        // FOR ALL, so DELETE ... RETURNING is allowed.
        const { data: deleted, error: deleteError } = await supabaseClient
          .from('seo_monitoring_schedules')
          .delete()
            // CRITICAL: Site isolation
          .eq('id', schedule_id)
          .select('id');

        if (deleteError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Schedule ${schedule_id} was NOT deleted and will keep running audits: ${deleteError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

        return new Response(JSON.stringify({
          success: true,
          message: deleted && deleted.length > 0
            ? 'Schedule deleted'
            : 'No schedule matched that id',
          deleted: deleted?.length ?? 0,
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
