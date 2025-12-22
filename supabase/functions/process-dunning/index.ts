// Process Dunning Edge Function
// Runs as cron job - processes all sites
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-DUNNING] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Dunning process started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all active sites for multi-tenant processing
    const { data: sites, error: sitesError } = await supabaseClient
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    logStep("Processing dunning for all active sites", { siteCount: sites?.length || 0 });

    const allResults = {
      processed: 0,
      successful_retries: 0,
      failed_retries: 0,
      suspended_accounts: 0,
      sites_processed: 0
    };

    for (const site of sites || []) {
      logStep("Processing site", { siteId: site.id, siteKey: site.key });

      // Get all payment failures that need retry for this site
      const { data: failuresToRetry, error: failuresError } = await supabaseClient
        .from("payment_failures")
        .select(`
          *,
          subscribers!inner(
            stripe_customer_id,
            email,
            user_id
          )
        `)
        .eq("site_id", site.id)  // CRITICAL: Site isolation
        .eq("dunning_status", "active")
        .lte("next_retry_at", new Date().toISOString())
        .lt("attempt_count", 3);

      if (failuresError) {
        logStep("Error fetching payment failures for site", { siteId: site.id, error: failuresError.message });
        continue;
      }

      logStep("Found payment failures for site", { siteId: site.id, count: failuresToRetry?.length || 0 });

      const results = {
        processed: 0,
        successful_retries: 0,
        failed_retries: 0,
        suspended_accounts: 0
      };

      for (const failure of failuresToRetry || []) {
        try {
          logStep("Processing payment failure", {
            failureId: failure.id,
            invoiceId: failure.stripe_invoice_id,
            attemptCount: failure.attempt_count
          });

          // Try to retry the invoice payment
          const invoice = await stripe.invoices.retrieve(failure.stripe_invoice_id);

          if (invoice.status === 'open') {
            // Attempt to pay the invoice
            try {
              await stripe.invoices.pay(failure.stripe_invoice_id);

              // Payment successful - mark as resolved
              await supabaseClient
                .from("payment_failures")
                .update({
                  dunning_status: "resolved",
                  resolved_at: new Date().toISOString()
                })
                .eq("site_id", site.id)  // CRITICAL: Site isolation
                .eq("id", failure.id);

              results.successful_retries++;
              logStep("Payment retry successful", { failureId: failure.id });

              // Send success notification
              await sendDunningNotification(failure, "payment_success", supabaseClient, site.id);

            } catch (paymentError) {
              // Payment failed again
              const newAttemptCount = failure.attempt_count + 1;
              const isMaxAttemptsReached = newAttemptCount >= failure.max_retries;

              let nextRetryAt = null;
              let dunningStatus = "active";

              if (!isMaxAttemptsReached) {
                // Schedule next retry with exponential backoff
                const nextRetry = new Date();
                nextRetry.setDate(nextRetry.getDate() + Math.pow(2, newAttemptCount)); // 2, 4, 8 days
                nextRetryAt = nextRetry.toISOString();
              } else {
                // Max attempts reached - suspend account
                dunningStatus = "suspended";

                // Update subscriber status with site isolation
                await supabaseClient
                  .from("subscribers")
                  .update({
                    subscribed: false,
                    subscription_tier: null,
                    updated_at: new Date().toISOString()
                  })
                  .eq("site_id", site.id)  // CRITICAL: Site isolation
                  .eq("id", failure.subscriber_id);

                results.suspended_accounts++;
                logStep("Account suspended due to payment failures", {
                  siteId: site.id,
                  subscriberId: failure.subscriber_id,
                  totalAttempts: newAttemptCount
                });
              }

              const paymentMsg = paymentError instanceof Error ? paymentError.message : String(paymentError);

              await supabaseClient
                .from("payment_failures")
                .update({
                  attempt_count: newAttemptCount,
                  next_retry_at: nextRetryAt,
                  dunning_status: dunningStatus,
                  failure_reason: `Retry ${newAttemptCount} failed: ${paymentMsg}`
                })
                .eq("site_id", site.id)  // CRITICAL: Site isolation
                .eq("id", failure.id);

              results.failed_retries++;

              // Send appropriate notification
              const notificationType = isMaxAttemptsReached ? "account_suspended" : "payment_retry_failed";
              await sendDunningNotification(failure, notificationType, supabaseClient, site.id);
            }
          } else if (invoice.status === 'paid') {
            // Invoice was already paid - mark as resolved
            await supabaseClient
              .from("payment_failures")
              .update({
                dunning_status: "resolved",
                resolved_at: new Date().toISOString()
              })
              .eq("site_id", site.id)  // CRITICAL: Site isolation
              .eq("id", failure.id);

            results.successful_retries++;
            logStep("Invoice already paid", { siteId: site.id, failureId: failure.id });
          }

          results.processed++;

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logStep("Error processing payment failure", {
            siteId: site.id,
            failureId: failure.id,
            error: errorMessage
          });

          // Mark processing attempt with site isolation
          await supabaseClient
            .from("payment_failures")
            .update({
              failure_reason: `Processing error: ${errorMessage}`
            })
            .eq("site_id", site.id)  // CRITICAL: Site isolation
            .eq("id", failure.id);
        }
      }

      // Aggregate results
      allResults.processed += results.processed;
      allResults.successful_retries += results.successful_retries;
      allResults.failed_retries += results.failed_retries;
      allResults.suspended_accounts += results.suspended_accounts;
      allResults.sites_processed++;

      logStep("Site dunning completed", { siteId: site.id, siteKey: site.key, results });
    }

    logStep("Dunning process completed for all sites", allResults);

    return new Response(JSON.stringify({
      success: true,
      results: allResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-dunning", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendDunningNotification(
  failure: any,
  notificationType: string,
  supabaseClient: any,
  siteId: string
) {
  const notifications = {
    payment_retry_failed: {
      subject: "Payment Retry Failed - Action Required",
      message: `We attempted to process your payment but it failed again. Attempt ${failure.attempt_count} of ${failure.max_retries}.`
    },
    payment_success: {
      subject: "Payment Processed Successfully", 
      message: "Your payment has been processed successfully and your account is now active."
    },
    account_suspended: {
      subject: "Account Suspended - Payment Required",
      message: "Your account has been suspended due to failed payment attempts. Please update your payment method."
    }
  };

  const notification = notifications[notificationType as keyof typeof notifications];
  
  if (notification) {
    logStep("Sending dunning notification", { 
      type: notificationType,
      email: failure.subscribers.email,
      subject: notification.subject
    });

    // Here you would integrate with your email service
    // await supabase.functions.invoke('send-email', {
    //   body: {
    //     to: failure.subscribers.email,
    //     subject: notification.subject,
    //     text: notification.message,
    //     template: 'dunning-notification'
    //   }
    // });
  }
}