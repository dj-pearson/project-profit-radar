import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { requireInternalCaller } from '../_shared/internal-only.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { captureException } from '../_shared/observability.ts';
import { sendEmail } from '../_shared/ses-email-service.ts';

// Request body (US-241), report mode by default - see _shared/validate-body.ts.
// The one caller, run-scheduled-audit, sends { notification_type, subject,
// message, severity, data }. notification_type comes from a stored alert rule,
// so it stays a string rather than an enum.
const SeoNotificationSchema = z.object({
  alert_id: z.string().max(255).nullish(),
  notification_type: z.string().max(20).optional(),
  recipient_email: z.string().email().max(255).nullish(),
  slack_webhook_url: z.string().url().max(2048).nullish(),
  subject: z.string().min(1).max(500),
  message: z.string().min(1).max(20000),
  severity: z.string().max(20).optional(),
  data: z.record(z.unknown()).optional(),
}).passthrough();

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders });

  try {
    // Internal only: invoked by run-scheduled-audit with a service-role client.
    // verify_jwt = true is a signature check the publishable anon key
    // satisfies, not authentication (US-241).
    const denied = requireInternalCaller(req);
    if (denied) return denied;

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
    );

    const parsed = await validateBody(req, SeoNotificationSchema, { name: 'send-seo-notification' });
    if (!parsed.ok) return parsed.response;
    const {
      alert_id,
      notification_type = 'email',
      recipient_email,
      slack_webhook_url,
      subject,
      message,
      severity = 'info',
      data = {},
    } = parsed.data;

    if (!subject || !message) {
      return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: 'Subject and message required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const results = {
      email_sent: false,
      slack_sent: false,
      webhook_sent: false,
      errors: [] as string[],
    };

    // Send email notification
    if (notification_type === 'email' || notification_type === 'all') {
      if (!recipient_email) {
        results.errors.push('Email notification requested but no recipient_email provided');
      } else {
        // US-253: SES through the shared sender. This used SendGrid, which
        // nothing else in Brikly uses.
        const delivery = await sendEmail({
          to: recipient_email,
          from: 'seo@brikly.net',
          fromName: 'Brikly SEO',
          subject,
          html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                      <h2 style="color: ${severity === 'critical' ? '#dc2626' : severity === 'high' ? '#ea580c' : '#3b82f6'};">
                        SEO Alert: ${subject}
                      </h2>
                      <p>${message}</p>
                      ${data.url ? `<p><strong>URL:</strong> <a href="${data.url}">${data.url}</a></p>` : ''}
                      ${data.metric ? `<p><strong>Metric:</strong> ${data.metric}</p>` : ''}
                      ${data.value ? `<p><strong>Value:</strong> ${data.value}</p>` : ''}
                      <hr style="margin: 20px 0; border: none; border-top: 1px solid #e5e7eb;" />
                      <p style="color: #6b7280; font-size: 12px;">
                        This is an automated notification from your SEO monitoring system.
                      </p>
                    </div>
                  `,
          template: 'seo_alert',
          source: 'send-seo-notification',
        });

        if (delivery.success) {
          results.email_sent = true;
        } else {
          results.errors.push(`Email failed: ${delivery.error ?? 'unknown error'}`);
        }
      }
    }

    // Send Slack notification
    if (notification_type === 'slack' || notification_type === 'all') {
      const webhookUrl = slack_webhook_url || Deno.env.get('SLACK_WEBHOOK_URL');

      if (!webhookUrl) {
        results.errors.push('Slack notification requested but no webhook URL provided');
      } else {
        try {
          const slackResponse = await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              text: subject,
              blocks: [
                {
                  type: 'header',
                  text: {
                    type: 'plain_text',
                    text: subject,
                  },
                },
                {
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: message,
                  },
                },
                ...(data.url ? [{
                  type: 'section',
                  text: {
                    type: 'mrkdwn',
                    text: `*URL:* <${data.url}|${data.url}>`,
                  },
                }] : []),
                {
                  type: 'context',
                  elements: [{
                    type: 'mrkdwn',
                    text: `Severity: *${severity.toUpperCase()}*`,
                  }],
                },
              ],
            }),
          });

          if (slackResponse.ok) {
            results.slack_sent = true;
          } else {
            results.errors.push(`Slack failed: ${slackResponse.statusText}`);
          }
        } catch (error) {
          results.errors.push(`Slack error: ${error.message}`);
        }
      }
    }

    // Send webhook notification
    if (notification_type === 'webhook' || notification_type === 'all') {
      const customWebhookUrl = Deno.env.get('CUSTOM_WEBHOOK_URL');

      if (customWebhookUrl) {
        try {
          const webhookResponse = await fetch(customWebhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              alert_id,
              subject,
              message,
              severity,
              timestamp: new Date().toISOString(),
              data,
            }),
          });

          if (webhookResponse.ok) {
            results.webhook_sent = true;
          } else {
            results.errors.push(`Webhook failed: ${webhookResponse.statusText}`);
          }
        } catch (error) {
          results.errors.push(`Webhook error: ${error.message}`);
        }
      }
    }

    // Log notification. The notifications have already gone out by here, so
    // this row is the record that they did - and its error was discarded
    // (US-300).
    const { error: logError } = await supabaseClient
      .from('seo_monitoring_log')
      .insert({
        log_type: 'notification',
        severity,
        message: subject,
        details: { ...data, notification_results: results },
        related_url: data.url || null,
      });

    if (logError) {
      console.error(
        '[SEO-NOTIFICATION] Notifications were SENT but not logged:',
        logError.message,
      );
    }

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(),
      success: results.email_sent || results.slack_sent || results.webhook_sent,
      results,
      message: results.errors.length > 0
        ? 'Notification sent with some errors'
        : 'Notification sent successfully',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    await captureException(error, { fn: 'send-seo-notification', req });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
