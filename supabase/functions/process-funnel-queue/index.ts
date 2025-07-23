import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { Resend } from "npm:resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const resendApiKey = Deno.env.get("RESEND_API_KEY");

const supabase = createClient(supabaseUrl, supabaseServiceKey);

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

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

    for (const item of queueItems || []) {
      try {
        // Mark as sending
        await supabase
          .from("funnel_email_queue")
          .update({ status: "sending" })
          .eq("id", item.id);

        const subscriber = item.funnel_subscribers?.email_subscribers;
        const template = item.email_templates;
        const step = item.funnel_steps;

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
          funnel_name: item.funnel_subscribers?.lead_funnels?.name || "",
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
            from: "BuildDesk <notifications@resend.dev>",
            to: [subscriber.email],
            subject: emailSubject,
            html: `
              <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                ${emailContent}
                <hr style="margin: 20px 0; border: none; border-top: 1px solid #eee;">
                <p style="color: #666; font-size: 12px;">
                  This email was sent as part of your ${item.funnel_subscribers?.lead_funnels?.name || 'Lead'} sequence.
                  <br>
                  <a href="#" style="color: #666;">Unsubscribe</a>
                </p>
              </div>
            `,
          });
        }

        // Mark as sent
        await supabase
          .from("funnel_email_queue")
          .update({ 
            status: "sent",
            sent_at: new Date().toISOString()
          })
          .eq("id", item.id);

        // Update funnel subscriber
        await supabase
          .from("funnel_subscribers")
          .update({
            last_email_sent_at: new Date().toISOString(),
            current_step: item.funnel_subscribers?.current_step + 1,
          })
          .eq("id", item.funnel_subscriber_id);

        // Log analytics
        await supabase
          .from("funnel_analytics")
          .insert({
            funnel_id: item.funnel_subscribers?.funnel_id,
            step_id: item.step_id,
            subscriber_id: item.funnel_subscribers?.subscriber_id,
            event_type: "email_sent",
            event_data: {
              email_template_id: item.email_template_id,
              subject: emailSubject,
            },
          });

        // Schedule next email if exists
        const { data: nextStep } = await supabase
          .from("funnel_steps")
          .select("*")
          .eq("funnel_id", item.funnel_subscribers?.funnel_id)
          .eq("step_order", step.step_order + 1)
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

          await supabase
            .from("funnel_email_queue")
            .insert({
              funnel_subscriber_id: item.funnel_subscriber_id,
              step_id: nextStep.id,
              email_template_id: nextStep.email_template_id,
              scheduled_at: nextScheduledAt.toISOString(),
            });

          // Update next scheduled time
          await supabase
            .from("funnel_subscribers")
            .update({
              next_email_scheduled_at: nextScheduledAt.toISOString(),
            })
            .eq("id", item.funnel_subscriber_id);
        } else {
          // Mark as completed if no more steps
          await supabase
            .from("funnel_subscribers")
            .update({
              status: "completed",
              completed_at: new Date().toISOString(),
              next_email_scheduled_at: null,
            })
            .eq("id", item.funnel_subscriber_id);

          // Log completion
          await supabase
            .from("funnel_analytics")
            .insert({
              funnel_id: item.funnel_subscribers?.funnel_id,
              subscriber_id: item.funnel_subscribers?.subscriber_id,
              event_type: "completed",
            });
        }

        console.log(`Successfully processed email for ${subscriber.email}`);

      } catch (emailError) {
        console.error(`Error processing email ${item.id}:`, emailError);
        
        // Mark as failed and increment retry count
        await supabase
          .from("funnel_email_queue")
          .update({ 
            status: "failed",
            error_message: emailError.message,
            retry_count: (item.retry_count || 0) + 1,
          })
          .eq("id", item.id);
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        processed: queueItems?.length || 0,
        message: "Funnel queue processed successfully" 
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );

  } catch (error: any) {
    console.error("Error processing funnel queue:", error);
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