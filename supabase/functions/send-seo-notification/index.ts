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

    const {
      alert_id,
      notification_type = 'email',
      recipient_email,
      slack_webhook_url,
      subject,
      message,
      severity = 'info',
      data = {},
    } = await req.json();

    if (!subject || !message) {
      return new Response(JSON.stringify({ error: 'Subject and message required' }),
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
        // In production, integrate with email service (SendGrid, AWS SES, etc.)
        const emailApiKey = Deno.env.get('SENDGRID_API_KEY');

        if (emailApiKey) {
          try {
            const emailResponse = await fetch('https://api.sendgrid.com/v3/mail/send', {
              method: 'POST',
              headers: {
                'Authorization': `Bearer ${emailApiKey}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({
                personalizations: [{
                  to: [{ email: recipient_email }],
                  subject,
                }],
                from: { email: Deno.env.get('FROM_EMAIL') || 'seo@builddesk.com' },
                content: [{
                  type: 'text/html',
                  value: `
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
                }],
              }),
            });

            if (emailResponse.ok) {
              results.email_sent = true;
            } else {
              const errorData = await emailResponse.json();
              results.errors.push(`Email failed: ${JSON.stringify(errorData)}`);
            }
          } catch (error) {
            results.errors.push(`Email error: ${error.message}`);
          }
        } else {
          results.errors.push('Email requested but SENDGRID_API_KEY not configured');
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

    // Log notification
    await supabaseClient
      .from('seo_monitoring_log')
      .insert({
        log_type: 'notification',
        severity,
        message: subject,
        details: { ...data, notification_results: results },
        related_url: data.url || null,
      });

    return new Response(JSON.stringify({
      success: results.email_sent || results.slack_sent || results.webhook_sent,
      results,
      message: results.errors.length > 0
        ? 'Notification sent with some errors'
        : 'Notification sent successfully',
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 });

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
