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
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const { schedule_id } = await req.json();

    // Get due schedules if no specific schedule provided
    let schedules = [];
    if (schedule_id) {
      const { data } = await supabaseClient
        .from('seo_monitoring_schedules')
        .select('*')
        .eq('id', schedule_id)
        .eq('is_active', true)
        .single();
      if (data) schedules = [data];
    } else {
      // Get all due schedules
      const { data } = await supabaseClient
        .from('seo_monitoring_schedules')
        .select('*')
        .eq('is_active', true)
        .lte('next_run_at', new Date().toISOString());
      schedules = data || [];
    }

    if (schedules.length === 0) {
      return new Response(JSON.stringify({
        success: true,
        message: 'No schedules due for execution',
        schedules_checked: schedule_id ? 1 : 'all',
      }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });
    }

    const results = [];

    for (const schedule of schedules) {
      try {
        const auditResult = {
          schedule_id: schedule.id,
          schedule_name: schedule.schedule_name,
          url: schedule.target_url,
          audit_type: schedule.audit_type,
          success: false,
          error: null as string | null,
        };

        // Execute the appropriate audit type
        let auditData: any = null;

        switch (schedule.audit_type) {
          case 'full':
            // Run full SEO audit
            const auditResponse = await supabaseClient.functions.invoke('seo-audit', {
              body: {
                url: schedule.target_url,
                audit_type: 'full',
              },
            });
            auditData = auditResponse.data;
            auditResult.success = !auditResponse.error;
            auditResult.error = auditResponse.error?.message || null;
            break;

          case 'performance':
            // Run Core Web Vitals check
            const perfResponse = await supabaseClient.functions.invoke('check-core-web-vitals', {
              body: {
                url: schedule.target_url,
                device: 'both',
              },
            });
            auditData = perfResponse.data;
            auditResult.success = !perfResponse.error;
            auditResult.error = perfResponse.error?.message || null;
            break;

          case 'broken_links':
            // Run broken links check
            const linksResponse = await supabaseClient.functions.invoke('check-broken-links', {
              body: {
                url: schedule.target_url,
              },
            });
            auditData = linksResponse.data;
            auditResult.success = !linksResponse.error;
            auditResult.error = linksResponse.error?.message || null;
            break;

          case 'content':
            // Run content analysis
            const contentResponse = await supabaseClient.functions.invoke('analyze-content', {
              body: {
                url: schedule.target_url,
              },
            });
            auditData = contentResponse.data;
            auditResult.success = !contentResponse.error;
            auditResult.error = contentResponse.error?.message || null;
            break;

          case 'security':
            // Run security headers check
            const securityResponse = await supabaseClient.functions.invoke('check-security-headers', {
              body: {
                url: schedule.target_url,
              },
            });
            auditData = securityResponse.data;
            auditResult.success = !securityResponse.error;
            auditResult.error = securityResponse.error?.message || null;
            break;

          default:
            auditResult.error = `Unknown audit type: ${schedule.audit_type}`;
        }

        // Check alert rules and trigger notifications if needed
        if (auditResult.success && auditData) {
          const { data: alertRules } = await supabaseClient
            .from('seo_alert_rules')
            .select('*')
            .eq('is_active', true);

          for (const rule of alertRules || []) {
            let shouldAlert = false;
            let alertMessage = '';

            // Evaluate rule condition
            switch (rule.rule_type) {
              case 'score_drop':
                if (auditData.overall_score < rule.threshold) {
                  shouldAlert = true;
                  alertMessage = `SEO score dropped to ${auditData.overall_score} (threshold: ${rule.threshold})`;
                }
                break;

              case 'critical_issue':
                if (auditData.critical_issues > 0) {
                  shouldAlert = true;
                  alertMessage = `${auditData.critical_issues} critical SEO issues detected`;
                }
                break;

              case 'performance_drop':
                if (auditData.performance_score < rule.threshold) {
                  shouldAlert = true;
                  alertMessage = `Performance score dropped to ${auditData.performance_score} (threshold: ${rule.threshold})`;
                }
                break;

              case 'broken_links':
                if (auditData.broken_links && auditData.broken_links > 0) {
                  shouldAlert = true;
                  alertMessage = `${auditData.broken_links} broken links detected`;
                }
                break;
            }

            if (shouldAlert) {
              // Create alert
              await supabaseClient.from('seo_alerts').insert({
                rule_id: rule.id,
                alert_type: rule.rule_type,
                severity: rule.severity,
                title: rule.rule_name,
                message: alertMessage,
                affected_url: schedule.target_url,
                alert_data: auditData,
                status: 'open',
              });

              // Send notification
              await supabaseClient.functions.invoke('send-seo-notification', {
                body: {
                  notification_type: rule.notification_channel,
                  subject: `SEO Alert: ${rule.rule_name}`,
                  message: alertMessage,
                  severity: rule.severity,
                  data: {
                    url: schedule.target_url,
                    audit_type: schedule.audit_type,
                    ...auditData,
                  },
                },
              });
            }
          }
        }

        // Calculate next run time based on frequency
        const nextRun = new Date();
        switch (schedule.frequency) {
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

        // Update schedule
        await supabaseClient
          .from('seo_monitoring_schedules')
          .update({
            last_run_at: new Date().toISOString(),
            next_run_at: nextRun.toISOString(),
            last_run_status: auditResult.success ? 'success' : 'failed',
            run_count: schedule.run_count + 1,
          })
          .eq('id', schedule.id);

        results.push(auditResult);

      } catch (error) {
        results.push({
          schedule_id: schedule.id,
          schedule_name: schedule.schedule_name,
          success: false,
          error: error.message,
        });
      }
    }

    // Log execution
    await supabaseClient
      .from('seo_monitoring_log')
      .insert({
        log_type: 'scheduled_audit',
        severity: 'info',
        message: `Executed ${results.length} scheduled audits`,
        details: { results },
      });

    return new Response(JSON.stringify({
      success: true,
      schedules_executed: results.length,
      results,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
