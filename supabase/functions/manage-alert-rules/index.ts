import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { WRITABLE_ALERT_RULE_COLUMNS, pickAllowed } from '../_shared/writable-columns.ts';

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: userProfile } = await supabaseClient
      .from('user_profiles').select('role').eq('id', user.id).single();

    if (!userProfile || userProfile.role !== 'root_admin') {
      return new Response(JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { action, rule_id, rule_data } = await req.json();

    switch (action) {
      case 'list': {
        const { data: rules } = await supabaseClient
          .from('seo_alert_rules')
          .select('*')
          .order('created_at', { ascending: false });

        return new Response(JSON.stringify({
          success: true,
          rules: rules || [],
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'create': {
        // Every branch here answered `success: true` without reading the error.
        // supabase-js returns it rather than throwing, so a rejected write came
        // back as "Alert rule created" with `rule: undefined`, and a rejected
        // delete came back as "Alert rule deleted" for a rule that kept firing
        // (US-300).
        const { data: created, error: createError } = await supabaseClient
          .from('seo_alert_rules')
          .insert({
            rule_name: rule_data.rule_name,
            rule_type: rule_data.rule_type,
            threshold: rule_data.threshold,
            severity: rule_data.severity || 'medium',
            notification_channel: rule_data.notification_channel || 'email',
            is_active: rule_data.is_active !== false,
            created_by: user.id,
          })
          .select()
          .single();

        if (createError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Alert rule was not created: ${createError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Alert rule created',
          rule: created,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'update': {
        if (!rule_id) {
          return new Response(JSON.stringify({ error: 'rule_id required for update' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // Allowlisted rather than spread: the raw rule_data let the caller set
        // created_by and id too. This endpoint is root_admin only, so that was
        // hygiene rather than a hole, but the create path already picks its
        // columns explicitly and the two should not disagree.
        const { data: updated, error: updateError } = await supabaseClient
          .from('seo_alert_rules')
          .update(pickAllowed(rule_data, WRITABLE_ALERT_RULE_COLUMNS))
          .eq('id', rule_id)
          .select()
          .single();

        if (updateError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Alert rule ${rule_id} was not updated: ${updateError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

        return new Response(JSON.stringify({
          success: true,
          message: 'Alert rule updated',
          rule: updated,
        }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
      }

      case 'delete': {
        if (!rule_id) {
          return new Response(JSON.stringify({ error: 'rule_id required for delete' }),
            { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
        }

        // `.select('id')` so the response can distinguish a rule that was
        // deleted from one that matched nothing. The policy on this table is
        // FOR ALL, so DELETE ... RETURNING is allowed.
        const { data: deleted, error: deleteError } = await supabaseClient
          .from('seo_alert_rules')
          .delete()
          .eq('id', rule_id)
          .select('id');

        if (deleteError) {
          return new Response(JSON.stringify({
            success: false,
            error: `Alert rule ${rule_id} was NOT deleted and will keep firing: ${deleteError.message}`,
          }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 });
        }

        return new Response(JSON.stringify({
          success: true,
          message: deleted && deleted.length > 0
            ? 'Alert rule deleted'
            : 'No alert rule matched that id',
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
