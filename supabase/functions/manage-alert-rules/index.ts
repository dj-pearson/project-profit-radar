import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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
        const { data: created } = await supabaseClient
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

        const { data: updated } = await supabaseClient
          .from('seo_alert_rules')
          .update(rule_data)
          .eq('id', rule_id)
          .select()
          .single();

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

        await supabaseClient
          .from('seo_alert_rules')
          .delete()
          .eq('id', rule_id);

        return new Response(JSON.stringify({
          success: true,
          message: 'Alert rule deleted',
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
