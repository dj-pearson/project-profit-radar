import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, stripe-signature",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Webhook received");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
    
    if (!stripeKey || !webhookSecret) {
      throw new Error("Missing Stripe configuration");
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const signature = req.headers.get("stripe-signature");
    if (!signature) {
      throw new Error("Missing stripe-signature header");
    }

    const body = await req.text();
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      const errorObj = err as Error;
      logStep("Webhook signature verification failed", { error: errorObj.message });
      return new Response(`Webhook Error: ${errorObj.message}`, { status: 400 });
    }

    logStep("Processing event", { type: event.type, id: event.id });

    // Log webhook event
    await supabaseClient
      .from("webhook_events")
      .upsert({
        stripe_event_id: event.id,
        event_type: event.type,
        event_data: event.data,
        processed: false,
        processing_attempts: 0
      }, { onConflict: "stripe_event_id" });

    try {
      await processWebhookEvent(event, supabaseClient, stripe);
      
      // Mark as processed
      await supabaseClient
        .from("webhook_events")
        .update({
          processed: true,
          processed_at: new Date().toISOString()
        })
        .eq("stripe_event_id", event.id);

      logStep("Event processed successfully", { type: event.type });
      return new Response(JSON.stringify({ received: true }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });

    } catch (error) {
      const errorObj = error as Error;
      logStep("Error processing event", { type: event.type, error: errorObj.message });
      
      // Update processing attempt
      await supabaseClient
        .from("webhook_events")
        .update({
          processing_attempts: 1,
          last_processing_error: errorObj.message
        })
        .eq("stripe_event_id", event.id);

      throw error;
    }

  } catch (error) {
    const errorObj = error as Error;
    logStep("Webhook error", { error: errorObj.message });
    return new Response(JSON.stringify({ error: errorObj.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function processWebhookEvent(event: Stripe.Event, supabaseClient: any, stripe: Stripe) {
  switch (event.type) {
    case 'customer.subscription.created':
    case 'customer.subscription.updated':
      await handleSubscriptionChange(event.data.object as Stripe.Subscription, supabaseClient);
      break;
      
    case 'customer.subscription.deleted':
      await handleSubscriptionCancellation(event.data.object as Stripe.Subscription, supabaseClient);
      break;
      
    case 'invoice.payment_failed':
      await handlePaymentFailure(event.data.object as Stripe.Invoice, supabaseClient, stripe);
      break;
      
    case 'invoice.payment_succeeded':
      await handlePaymentSuccess(event.data.object as Stripe.Invoice, supabaseClient);
      break;
      
    case 'customer.subscription.trial_will_end':
      await handleTrialWillEnd(event.data.object as Stripe.Subscription, supabaseClient);
      break;
      
    default:
      logStep("Unhandled event type", { type: event.type });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabaseClient: any) {
  const customer = await supabaseClient
    .from("subscribers")
    .select("*")
    .eq("stripe_customer_id", subscription.customer)
    .single();

  if (customer.data) {
    const priceId = subscription.items.data[0].price.id;
    const amount = subscription.items.data[0].price.unit_amount || 0;
    
    let subscriptionTier = "starter";
    if (amount >= 59900) subscriptionTier = "enterprise";
    else if (amount >= 29900) subscriptionTier = "professional";

    await supabaseClient
      .from("subscribers")
      .update({
        subscribed: subscription.status === "active",
        subscription_tier: subscriptionTier,
        subscription_end: new Date(subscription.current_period_end * 1000).toISOString(),
        billing_period: subscription.items.data[0].price.recurring?.interval === "year" ? "annual" : "monthly",
        updated_at: new Date().toISOString()
      })
      .eq("stripe_customer_id", subscription.customer);
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabaseClient: any) {
  await supabaseClient
    .from("subscribers")
    .update({
      subscribed: false,
      subscription_tier: null,
      subscription_end: new Date(subscription.ended_at! * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("stripe_customer_id", subscription.customer);
}

async function handlePaymentFailure(invoice: Stripe.Invoice, supabaseClient: any, stripe: Stripe) {
  if (!invoice.subscription) return;

  const subscriber = await supabaseClient
    .from("subscribers")
    .select("*")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (subscriber.data) {
    // Check if failure already exists
    const existingFailure = await supabaseClient
      .from("payment_failures")
      .select("*")
      .eq("subscriber_id", subscriber.data.id)
      .eq("stripe_invoice_id", invoice.id)
      .single();

    if (!existingFailure.data) {
      // Create new payment failure record
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + 24); // Retry in 24 hours

      await supabaseClient
        .from("payment_failures")
        .insert({
          subscriber_id: subscriber.data.id,
          stripe_invoice_id: invoice.id,
          failure_reason: invoice.last_finalization_error?.message || "Payment failed",
          attempt_count: 1,
          next_retry_at: nextRetry.toISOString(),
          dunning_status: "active"
        });
    } else {
      // Update existing failure
      const newAttemptCount = existingFailure.data.attempt_count + 1;
      const nextRetry = new Date();
      nextRetry.setDate(nextRetry.getDate() + newAttemptCount); // Exponential backoff

      await supabaseClient
        .from("payment_failures")
        .update({
          attempt_count: newAttemptCount,
          next_retry_at: newAttemptCount >= 3 ? null : nextRetry.toISOString(),
          dunning_status: newAttemptCount >= 3 ? "suspended" : "active",
          failure_reason: invoice.last_finalization_error?.message || "Payment failed"
        })
        .eq("id", existingFailure.data.id);
    }
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice, supabaseClient: any) {
  if (!invoice.subscription) return;

  const subscriber = await supabaseClient
    .from("subscribers")
    .select("*")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (subscriber.data) {
    // Resolve any payment failures
    await supabaseClient
      .from("payment_failures")
      .update({
        dunning_status: "resolved",
        resolved_at: new Date().toISOString()
      })
      .eq("subscriber_id", subscriber.data.id)
      .is("resolved_at", null);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription, supabaseClient: any) {
  // Could trigger email notifications here
  logStep("Trial ending soon", { customerId: subscription.customer, trialEnd: subscription.trial_end });
}