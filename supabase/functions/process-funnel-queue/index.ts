import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { requireSystemOrAdmin } from "../_shared/system-auth.ts";
import { captureException } from "../_shared/observability.ts";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await requireSystemOrAdmin(req);
  if (denied) return denied;

  try {
    console.log("Processing funnel email queue...");

    // Get emails scheduled to be sent now or in the past
    const { data: queueItems, error: queueError } = await supabase
      .from("funnel_email_queue")
      .select(`
        id,
        funnel_subscriber_id,
        step_id,
        email_template_id,
        scheduled_at,
        funnel_subscribers (
          id,
          funnel_id,
          subscriber_id,
          current_step,
          status,
          email_subscribers (
            email,
            first_name,
            last_name
          ),
          lead_funnels (
            name,
            company_id
          )
        ),
        funnel_steps (
          name,
          step_order
        ),
        email_templates (
          name,
          subject,
          content,
          variables
        )
      `)
      .eq("status", "scheduled")
      .lte("scheduled_at", new Date().toISOString())
      .limit(50);

    if (queueError) {
      console.error("Error fetching queue items:", queueError);
      throw queueError;
    }

    console.log(`Found ${queueItems?.length || 0} emails to process`);

    let sent = 0;
    let skipped = 0;
    // Writes that failed AFTER the email went out. They cannot fail the item -
    // that would mark it failed and resend to a real person - so they are
    // reported instead of swallowed (US-300).
    const bookkeepingFailures: Array<{ queue_item: string; problem: string }> = [];
    const recordFailure = (queueItem: string, problem: string) => {
      console.error(`[FUNNEL-QUEUE] ${queueItem}: ${problem}`);
      bookkeepingFailures.push({ queue_item: queueItem, problem });
    };

    for (const item of queueItems || []) {
      try {
        // Claim the item. This used to be a plain `update({ status: "sending" })`
        // with its error discarded; supabase-js returns the error rather than
        // throwing, so a failed claim left the row at "scheduled" and the next
        // cron run - or a run overlapping this one - sent the same email to the
        // same subscriber again. Matching on the old status makes the claim
        // atomic, and an empty result means somebody else has it (US-300).
        const { data: claimed, error: claimError } = await supabase
          .from("funnel_email_queue")
          .update({ status: "sending" })
          .eq("id", item.id)
          .eq("status", "scheduled")
          .select("id");

        if (claimError) {
          throw new Error(`Could not claim queue item: ${claimError.message}`);
        }

        if (!claimed || claimed.length === 0) {
          console.log(`Skipping item ${item.id} - already claimed by another run`);
          skipped++;
          continue;
        }

        // Extract data from Supabase relations (TypeScript treats them as arrays)
        const funnelSubscriber = Array.isArray(item.funnel_subscribers) ? item.funnel_subscribers[0] : item.funnel_subscribers;
        const subscriber = Array.isArray(funnelSubscriber?.email_subscribers) ? funnelSubscriber.email_subscribers[0] : funnelSubscriber?.email_subscribers;
        const template = Array.isArray(item.email_templates) ? item.email_templates[0] : item.email_templates;
        const step = Array.isArray(item.funnel_steps) ? item.funnel_steps[0] : item.funnel_steps;
        const leadFunnel = Array.isArray(funnelSubscriber?.lead_funnels) ? funnelSubscriber.lead_funnels[0] : funnelSubscriber?.lead_funnels;

        if (!subscriber || !template || !step) {
          console.log(`Skipping item ${item.id} - missing data`);
          continue;
        }

        // Replace template variables
        let emailContent = template.content;
        let emailSubject = template.subject;

        // Basic variable replacement
        const variables = {
          first_name: subscriber.first_name || "Friend",
          last_name: subscriber.last_name || "",
          email: subscriber.email,
          step_name: step.name,
          funnel_name: leadFunnel?.name || "",
        };

        Object.entries(variables).forEach(([key, value]) => {
          const regex = new RegExp(`{{${key}}}`, 'g');
          emailContent = emailContent.replace(regex, String(value));
          emailSubject = emailSubject.replace(regex, String(value));
        });

        // Send email using Resend if API key is available
        if (resendApiKey) {
          const resend = new Resend(resendApiKey);
          
          await resend.emails.send({
            from: "Brikly <notifications@resend.dev>",
            to: [subscriber.email],
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${emailContent}
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  This email was sent as part of your ${leadFunnel?.name || 'Lead'} sequence.
                  <br>
                  <a href="#" style="color: #666;">Unsubscribe</a>
                </p>
              </div>
            `,
          });
        }

        // The email has left the building. Nothing below may throw: the catch
        // marks the item failed, and a failed item is retried, which would send
        // this same email to this same person a second time. So every write
        // from here on reports rather than raises (US-300).
        sent++;

        // Mark as sent
        const { error: markSentError } = await supabase
          .from("funnel_email_queue")
          .update({
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", item.id);

        if (markSentError) {
          recordFailure(
            item.id,
            `SENT BUT STILL MARKED sending - ${subscriber.email} received this email and the queue does not know: ${markSentError.message}`,
          );
        }

        // Update funnel subscriber
        const { error: subscriberError } = await supabase
          .from("funnel_subscribers")
          .update({
            last_email_sent_at: new Date().toISOString(),
            current_step: (funnelSubscriber?.current_step || 0) + 1,
          })
          .eq("id", item.funnel_subscriber_id);

        if (subscriberError) {
          recordFailure(
            item.id,
            `subscriber ${item.funnel_subscriber_id} did not advance past step ${funnelSubscriber?.current_step ?? 0}: ${subscriberError.message}`,
          );
        }

        // Log analytics
        const { error: sentAnalyticsError } = await supabase
          .from("funnel_analytics")
          .insert({
            funnel_id: funnelSubscriber?.funnel_id,
            step_id: item.step_id,
            subscriber_id: funnelSubscriber?.subscriber_id,
            event_type: "email_sent",
            event_data: {
              email_template_id: item.email_template_id,
              subject: emailSubject,
            },
          });

        if (sentAnalyticsError) {
          recordFailure(item.id, `email_sent analytics not recorded: ${sentAnalyticsError.message}`);
        }

        // Schedule next email if exists
        const { data: nextStep } = await supabase
          .from("funnel_steps")
          .select("*")
          .eq("funnel_id", funnelSubscriber?.funnel_id)
          .eq("step_order", (step.step_order || 0) + 1)
          .eq("is_active", true)
          .single();

        if (nextStep) {
          const nextScheduledAt = new Date();
          nextScheduledAt.setTime(
            nextScheduledAt.getTime() + 
            (nextStep.delay_amount * 
              (nextStep.delay_unit === "minutes" ? 60000 :
               nextStep.delay_unit === "hours" ? 3600000 :
               nextStep.delay_unit === "days" ? 86400000 :
               nextStep.delay_unit === "weeks" ? 604800000 : 86400000))
          );

          // This row IS the rest of the sequence. A lost insert drops the
          // subscriber out of the funnel silently - no error, no completion,
          // they simply never hear from us again (US-300).
          const { error: nextQueueError } = await supabase
            .from("funnel_email_queue")
            .insert({
              funnel_subscriber_id: item.funnel_subscriber_id,
              step_id: nextStep.id,
              email_template_id: nextStep.email_template_id,
              scheduled_at: nextScheduledAt.toISOString(),
            });

          if (nextQueueError) {
            recordFailure(
              item.id,
              `subscriber ${item.funnel_subscriber_id} DROPPED OUT of the funnel - step ${nextStep.id} was never queued: ${nextQueueError.message}`,
            );
          }

          // Update next scheduled time
          const { error: nextScheduleError } = await supabase
            .from("funnel_subscribers")
            .update({
              next_email_scheduled_at: nextScheduledAt.toISOString(),
            })
            .eq("id", item.funnel_subscriber_id);

          if (nextScheduleError) {
            recordFailure(
              item.id,
              `next_email_scheduled_at not updated for ${item.funnel_subscriber_id}: ${nextScheduleError.message}`,
            );
          }
        } else {
          // Mark as completed if no more steps
          const { error: completedError } = await supabase
            .from("funnel_subscribers")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              next_email_scheduled_at: null,
            })
            .eq("id", item.funnel_subscriber_id);

          if (completedError) {
            recordFailure(
              item.id,
              `subscriber ${item.funnel_subscriber_id} finished the funnel but was not marked completed: ${completedError.message}`,
            );
          }

          // Log completion
          const { error: completionAnalyticsError } = await supabase
            .from("funnel_analytics")
            .insert({
              funnel_id: funnelSubscriber?.funnel_id,
              subscriber_id: funnelSubscriber?.subscriber_id,
              event_type: "completed",
            });

          if (completionAnalyticsError) {
            recordFailure(item.id, `completed analytics not recorded: ${completionAnalyticsError.message}`);
          }
        }

        console.log(`Successfully processed email for ${subscriber.email}`);

      } catch (emailError) {
        console.error(`Error processing email ${item.id}:`, emailError);
        
        // Mark as failed and increment retry count
        const errorMessage = emailError instanceof Error ? emailError.message : String(emailError);
        const currentRetryCount = (item as any).retry_count || 0;
        // If this write is lost the item stays at "sending" and is never
        // retried and never reported - the subscriber's sequence just stops
        // (US-300).
        const { error: markFailedError } = await supabase
          .from("funnel_email_queue")
          .update({
            status: "failed",
            error_message: errorMessage,
            retry_count: currentRetryCount + 1,
          })
          .eq("id", item.id);

        if (markFailedError) {
          recordFailure(
            item.id,
            `STUCK at "sending" - the send failed and marking it failed also failed, so it will never be retried: ${markFailedError.message}`,
          );
        }
      }
    }

    // `processed` used to be the number of rows fetched, which counted items
    // that were skipped or failed as processed. It is the number actually sent
    // now, and the bookkeeping failures ride along rather than living only in
    // the logs (US-300).
    return new Response(
      JSON.stringify({
        success: bookkeepingFailures.length === 0,
        processed: sent,
        fetched: queueItems?.length || 0,
        skipped,
        bookkeeping_failures: bookkeepingFailures,
        message: bookkeepingFailures.length === 0
          ? "Funnel queue processed successfully"
          : `Sent ${sent} email(s), but ${bookkeepingFailures.length} write(s) after sending failed`,
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error processing funnel queue:", error);
    // Cron-driven: a stalled queue looks like nothing happening (US-251).
    await captureException(error, { fn: 'process-funnel-queue' });
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);