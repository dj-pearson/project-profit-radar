// Send Scheduled Emails Edge Function
// Updated with multi-tenant site_id isolation (cron job pattern)
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-EMAILS] ${step}${detailsStr}`);
};

/**
 * Process email queue and send emails
 * Should be called by a cron job (e.g., every 5-15 minutes)
 * Iterates through all active sites for multi-tenant support
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Email sender started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all active sites
    const { data: sites } = await supabaseClient
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (!sites || sites.length === 0) {
      logStep("No active sites found");
      return new Response(JSON.stringify({ message: "No active sites", sent: 0 }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    let totalSentCount = 0;
    let totalFailedCount = 0;
    const allResults: any[] = [];

    // Process each site
    for (const site of sites) {
      logStep(`Processing site: ${site.key}`);

      // Get pending emails that are ready to send for this site
      const { data: pendingEmails, error: queueError } = await supabaseClient
        .from('email_queue')
        .select(`
          *,
          email_campaigns (*)
        `)
        .eq('site_id', site.id)  // CRITICAL: Site isolation
        .eq('status', 'pending')
        .lte('scheduled_for', new Date().toISOString())
        .order('priority', { ascending: true })
        .order('scheduled_for', { ascending: true })
        .limit(50); // Process max 50 emails per site per run

      if (queueError) {
        logStep(`Error fetching emails for site ${site.key}:`, queueError);
        continue;
      }

      if (!pendingEmails || pendingEmails.length === 0) {
        logStep(`No pending emails for site ${site.key}`);
        continue;
      }

      logStep(`Found ${pendingEmails.length} pending emails for site ${site.key}`);

      let sentCount = 0;
      let failedCount = 0;
      const results: any[] = [];

      for (const queuedEmail of pendingEmails) {
        try {
          // Check if user has unsubscribed with site isolation
          const { data: unsubscribed } = await supabaseClient
            .from('email_unsubscribes')
            .select('id')
            .eq('site_id', site.id)  // CRITICAL: Site isolation
            .eq('email', queuedEmail.recipient_email)
            .eq('is_active', true)
            .single();

        if (unsubscribed) {
          // Mark as cancelled
          await supabaseClient
            .from('email_queue')
            .update({ status: 'cancelled' })
            .eq('id', queuedEmail.id);

          logStep("User unsubscribed, skipping", { email: queuedEmail.recipient_email });
          continue;
        }

        // Check user preferences with site isolation
          const { data: preferences } = await supabaseClient
            .from('email_preferences')
            .select('*')
            .eq('site_id', site.id)  // CRITICAL: Site isolation
            .eq('user_id', queuedEmail.user_id)
            .single();

        // Skip if user disabled trial nurture emails
        if (preferences && !preferences.trial_nurture) {
          await supabaseClient
            .from('email_queue')
            .update({ status: 'cancelled' })
            .eq('id', queuedEmail.id);

          logStep("User disabled trial emails, skipping", { userId: queuedEmail.user_id });
          continue;
        }

        // Generate email HTML from template
        const emailHtml = await generateEmailHtml(
          queuedEmail.email_campaigns.campaign_name,
          queuedEmail.queue_metadata
        );

        // Send email via your email service (SendGrid, Postmark, etc.)
        const sendResult = await sendEmail({
          to: queuedEmail.recipient_email,
          subject: queuedEmail.email_campaigns.subject_line,
          html: emailHtml,
          from: {
            email: queuedEmail.email_campaigns.from_email,
            name: queuedEmail.email_campaigns.from_name,
          },
          replyTo: queuedEmail.email_campaigns.reply_to,
        });

          if (sendResult.success) {
            // Create email send record with site isolation
            const { data: emailSend } = await supabaseClient
              .from('email_sends')
              .insert({
                site_id: site.id,  // CRITICAL: Site isolation
                campaign_id: queuedEmail.campaign_id,
                user_id: queuedEmail.user_id,
                recipient_email: queuedEmail.recipient_email,
                subject: queuedEmail.email_campaigns.subject_line,
                from_email: queuedEmail.email_campaigns.from_email,
                email_provider: 'sendgrid', // or 'postmark', etc.
                email_provider_id: sendResult.messageId,
                status: 'sent',
                sent_at: new Date().toISOString(),
              })
              .select()
              .single();

          // Update queue status
          await supabaseClient
            .from('email_queue')
            .update({
              status: 'sent',
              email_send_id: emailSend.id,
              attempts: queuedEmail.attempts + 1,
              last_attempt_at: new Date().toISOString(),
            })
            .eq('id', queuedEmail.id);

          sentCount++;
          results.push({
            email: queuedEmail.recipient_email,
            campaign: queuedEmail.email_campaigns.campaign_name,
            status: 'sent',
          });

          logStep("Email sent successfully", {
            email: queuedEmail.recipient_email,
            campaign: queuedEmail.email_campaigns.campaign_name,
          });
        } else {
          throw new Error(sendResult.error || 'Failed to send email');
        }

      } catch (error) {
        failedCount++;
        const errorMessage = error instanceof Error ? error.message : String(error);

        logStep("Failed to send email", {
          email: queuedEmail.recipient_email,
          error: errorMessage,
        });

        // Update queue with error
        await supabaseClient
          .from('email_queue')
          .update({
            status: queuedEmail.attempts >= 2 ? 'failed' : 'pending',
            attempts: queuedEmail.attempts + 1,
            last_attempt_at: new Date().toISOString(),
          })
          .eq('id', queuedEmail.id);

          // Create failed email send record with site isolation
          await supabaseClient
            .from('email_sends')
            .insert({
              site_id: site.id,  // CRITICAL: Site isolation
              campaign_id: queuedEmail.campaign_id,
              user_id: queuedEmail.user_id,
              recipient_email: queuedEmail.recipient_email,
              subject: queuedEmail.email_campaigns.subject_line,
              status: 'failed',
              error_message: errorMessage,
              retry_count: queuedEmail.attempts + 1,
            });

          results.push({
            email: queuedEmail.recipient_email,
            campaign: queuedEmail.email_campaigns.campaign_name,
            status: 'failed',
            error: errorMessage,
          });
        }
      }

      totalSentCount += sentCount;
      totalFailedCount += failedCount;
      allResults.push(...results);
      logStep(`Site ${site.key} complete`, { sent: sentCount, failed: failedCount });
    }

    logStep("Email processing complete across all sites", { sent: totalSentCount, failed: totalFailedCount });

    return new Response(JSON.stringify({
      success: true,
      sent: totalSentCount,
      failed: totalFailedCount,
      results: allResults,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in email sender", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

/**
 * Generate email HTML from template
 */
async function generateEmailHtml(campaignName: string, metadata: any): Promise<string> {
  // Import email templates dynamically based on campaign name
  // This is a simplified version - you'll need to import the actual templates

  const data = {
    firstName: metadata.first_name || 'there',
    companyName: metadata.company_name,
    daysRemaining: metadata.days_remaining || 14,
    dashboardUrl: 'https://build-desk.com/dashboard',
    unsubscribeUrl: metadata.unsubscribe_url || 'https://build-desk.com/unsubscribe',
  };

  // Map campaign names to templates
  // In production, you'd import and call the actual template functions
  const templates: Record<string, string> = {
    'trial_day0_welcome': 'Welcome email HTML here',
    'trial_day1_getting_started': 'Getting started email HTML here',
    // ... etc
  };

  // For now, return a simple HTML template
  // In production, import and call the actual template functions from trialSequence.ts
  return `
    <html>
      <body>
        <h1>BuildDesk</h1>
        <p>Hi ${data.firstName},</p>
        <p>This is a ${campaignName} email.</p>
        <p>Dashboard: <a href="${data.dashboardUrl}">Click here</a></p>
        <p><a href="${data.unsubscribeUrl}">Unsubscribe</a></p>
      </body>
    </html>
  `;
}

/**
 * Send email via email service provider
 */
async function sendEmail(options: {
  to: string;
  subject: string;
  html: string;
  from: { email: string; name: string };
  replyTo: string;
}): Promise<{ success: boolean; messageId?: string; error?: string }> {
  // TODO: Implement actual email sending with SendGrid, Postmark, or Resend

  // Example with SendGrid:
  /*
  const sendgridApiKey = Deno.env.get("SENDGRID_API_KEY");

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${sendgridApiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [{
        to: [{ email: options.to }],
      }],
      from: {
        email: options.from.email,
        name: options.from.name,
      },
      reply_to: {
        email: options.replyTo,
      },
      subject: options.subject,
      content: [{
        type: "text/html",
        value: options.html,
      }],
    }),
  });

  if (response.ok) {
    const messageId = response.headers.get("x-message-id");
    return { success: true, messageId: messageId || "unknown" };
  } else {
    const error = await response.text();
    return { success: false, error };
  }
  */

  // For now, just log and return success (for testing)
  logStep("Would send email", {
    to: options.to,
    subject: options.subject,
  });

  return {
    success: true,
    messageId: `test-${Date.now()}`,
  };
}
