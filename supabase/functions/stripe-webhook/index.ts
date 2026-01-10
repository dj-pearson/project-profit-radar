// Stripe Webhook Handler
// Note: This is a webhook endpoint called by Stripe, not user-authenticated
// SECURITY: Webhooks are verified using Stripe signature - no CORS needed for Stripe calls
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

// Webhook endpoints from Stripe don't need CORS (server-to-server)
// But we keep minimal headers for potential health checks
const corsHeaders = {
  "Access-Control-Allow-Origin": "https://build-desk.com",
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

    // Refund events
    case 'charge.refunded':
      await handleChargeRefunded(event.data.object as Stripe.Charge, supabaseClient);
      break;

    case 'refund.created':
    case 'refund.updated':
      await handleRefundEvent(event.data.object as Stripe.Refund, supabaseClient);
      break;

    // Dispute/Chargeback events
    case 'charge.dispute.created':
      await handleDisputeCreated(event.data.object as Stripe.Dispute, supabaseClient);
      break;

    case 'charge.dispute.updated':
      await handleDisputeUpdated(event.data.object as Stripe.Dispute, supabaseClient);
      break;

    case 'charge.dispute.closed':
      await handleDisputeClosed(event.data.object as Stripe.Dispute, supabaseClient);
      break;

    default:
      logStep("Unhandled event type", { type: event.type });
  }
}

async function handleSubscriptionChange(subscription: Stripe.Subscription, supabaseClient: any) {
  // Query subscribers
  const { data: customer } = await supabaseClient
    .from("subscribers")
    .select("*, user_id")
    .eq("stripe_customer_id", subscription.customer)
    .single();

  if (customer) {
    const priceId = subscription.items.data[0].price.id;
    const amount = subscription.items.data[0].price.unit_amount || 0;

    let subscriptionTier = "starter";
    if (amount >= 59900) subscriptionTier = "enterprise";
    else if (amount >= 29900) subscriptionTier = "professional";

    const isActive = subscription.status === "active";
    const billingPeriod = subscription.items.data[0].price.recurring?.interval === "year" ? "annual" : "monthly";
    const subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();

    // Update subscriber
    await supabaseClient
      .from("subscribers")
      .update({
        subscribed: isActive,
        subscription_tier: subscriptionTier,
        subscription_end: subscriptionEnd,
        billing_period: billingPeriod,
        updated_at: new Date().toISOString()
      })
      .eq("stripe_customer_id", subscription.customer);

    logStep("Updated subscriber record", {
      customerId: subscription.customer,
      tier: subscriptionTier,
      status: subscription.status
    });

    // CRITICAL: Also update the company's subscription status
    // Find the company through the user profile
    if (customer.user_id) {
      const { data: userProfile } = await supabaseClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", customer.user_id)
        .single();

      if (userProfile?.company_id) {
        const companyStatus = isActive ? "active" :
          (subscription.status === "past_due" ? "grace_period" :
          (subscription.status === "canceled" ? "suspended" : "pending"));

        await supabaseClient
          .from("companies")
          .update({
            subscription_tier: subscriptionTier,
            subscription_status: companyStatus,
            stripe_customer_id: subscription.customer as string,
            stripe_subscription_id: subscription.id,
            updated_at: new Date().toISOString()
          })
          .eq("id", userProfile.company_id);

        logStep("Updated company subscription status", {
          companyId: userProfile.company_id,
          status: companyStatus,
          tier: subscriptionTier
        });
      }
    }
  }
}

async function handleSubscriptionCancellation(subscription: Stripe.Subscription, supabaseClient: any) {
  // Get subscriber data first to find the company
  const { data: customer } = await supabaseClient
    .from("subscribers")
    .select("*, user_id")
    .eq("stripe_customer_id", subscription.customer)
    .single();

  // Update subscriber
  await supabaseClient
    .from("subscribers")
    .update({
      subscribed: false,
      subscription_tier: null,
      subscription_end: new Date(subscription.ended_at! * 1000).toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq("stripe_customer_id", subscription.customer);

  logStep("Subscription cancelled", { customerId: subscription.customer });

  // Also update the company's subscription status
  if (customer?.user_id) {
    const { data: userProfile } = await supabaseClient
      .from("user_profiles")
      .select("company_id")
      .eq("id", customer.user_id)
      .single();

    if (userProfile?.company_id) {
      await supabaseClient
        .from("companies")
        .update({
          subscription_status: "suspended",
          updated_at: new Date().toISOString()
        })
        .eq("id", userProfile.company_id);

      logStep("Updated company to suspended", { companyId: userProfile.company_id });
    }
  }
}

async function handlePaymentFailure(invoice: Stripe.Invoice, supabaseClient: any, stripe: Stripe) {
  if (!invoice.subscription) return;

  // Query subscriber
  const { data: subscriber } = await supabaseClient
    .from("subscribers")
    .select("*")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (subscriber) {
    // Check if failure already exists
    const { data: existingFailure } = await supabaseClient
      .from("payment_failures")
      .select("*")
      .eq("subscriber_id", subscriber.id)
      .eq("stripe_invoice_id", invoice.id)
      .single();

    if (!existingFailure) {
      // Create new payment failure record
      const nextRetry = new Date();
      nextRetry.setHours(nextRetry.getHours() + 24); // Retry in 24 hours

      await supabaseClient
        .from("payment_failures")
        .insert({
          subscriber_id: subscriber.id,
          stripe_invoice_id: invoice.id,
          failure_reason: invoice.last_finalization_error?.message || "Payment failed",
          attempt_count: 1,
          next_retry_at: nextRetry.toISOString(),
          dunning_status: "active"
        });
    } else {
      // Update existing failure
      const newAttemptCount = existingFailure.attempt_count + 1;
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
        .eq("id", existingFailure.id);
    }
  }
}

async function handlePaymentSuccess(invoice: Stripe.Invoice, supabaseClient: any) {
  if (!invoice.subscription) return;

  // Query subscriber
  const { data: subscriber } = await supabaseClient
    .from("subscribers")
    .select("*")
    .eq("stripe_customer_id", invoice.customer)
    .single();

  if (subscriber) {
    // Resolve any payment failures
    await supabaseClient
      .from("payment_failures")
      .update({
        dunning_status: "resolved",
        resolved_at: new Date().toISOString()
      })
      .eq("subscriber_id", subscriber.id)
      .is("resolved_at", null);
  }
}

async function handleTrialWillEnd(subscription: Stripe.Subscription, supabaseClient: any) {
  // Could trigger email notifications here
  logStep("Trial ending soon", { customerId: subscription.customer, trialEnd: subscription.trial_end });
}

// Refund Handlers
async function handleChargeRefunded(charge: Stripe.Charge, supabaseClient: any) {
  logStep("Charge refunded", { chargeId: charge.id, amountRefunded: charge.amount_refunded });

  // Find and update the refund record
  const { data: refund } = await supabaseClient
    .from("refunds")
    .select("id")
    .eq("stripe_charge_id", charge.id)
    .single();

  if (refund) {
    await supabaseClient
      .from("refunds")
      .update({
        status: "succeeded",
        updated_at: new Date().toISOString()
      })
      .eq("id", refund.id);

    logStep("Updated refund record", { refundId: refund.id });
  }
}

async function handleRefundEvent(refund: Stripe.Refund, supabaseClient: any) {
  logStep("Refund event", { refundId: refund.id, status: refund.status });

  // Find and update the refund record by Stripe refund ID
  const { data: existingRefund } = await supabaseClient
    .from("refunds")
    .select("id")
    .eq("stripe_refund_id", refund.id)
    .single();

  if (existingRefund) {
    const statusMap: Record<string, string> = {
      'succeeded': 'succeeded',
      'pending': 'processing',
      'failed': 'failed',
      'canceled': 'canceled'
    };

    await supabaseClient
      .from("refunds")
      .update({
        status: statusMap[refund.status] || refund.status,
        failure_reason: refund.failure_reason || null,
        updated_at: new Date().toISOString()
      })
      .eq("id", existingRefund.id);

    logStep("Updated refund from webhook", { refundId: existingRefund.id, status: refund.status });
  }
}

// Dispute/Chargeback Handlers
async function handleDisputeCreated(dispute: Stripe.Dispute, supabaseClient: any) {
  logStep("Dispute created", { disputeId: dispute.id, amount: dispute.amount, reason: dispute.reason });

  // Check if dispute already exists
  const { data: existing } = await supabaseClient
    .from("chargebacks")
    .select("id")
    .eq("stripe_dispute_id", dispute.id)
    .single();

  if (!existing) {
    // Create new chargeback record
    await supabaseClient
      .from("chargebacks")
      .insert({
        stripe_dispute_id: dispute.id,
        stripe_charge_id: dispute.charge as string,
        stripe_payment_intent_id: dispute.payment_intent as string,
        amount: dispute.amount / 100,
        currency: dispute.currency,
        reason: dispute.reason,
        status: dispute.status,
        evidence_due_by: dispute.evidence_details?.due_by
          ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
          : null,
        fee_amount: 15.00,
        net_impact: (dispute.amount / 100) + 15.00
      });

    logStep("Created chargeback record", { disputeId: dispute.id });
  }
}

async function handleDisputeUpdated(dispute: Stripe.Dispute, supabaseClient: any) {
  logStep("Dispute updated", { disputeId: dispute.id, status: dispute.status });

  const statusMap: Record<string, string> = {
    'warning_needs_response': 'warning_needs_response',
    'warning_under_review': 'warning_under_review',
    'warning_closed': 'warning_closed',
    'needs_response': 'needs_response',
    'under_review': 'under_review',
    'charge_refunded': 'charge_refunded',
    'won': 'won',
    'lost': 'lost'
  };

  await supabaseClient
    .from("chargebacks")
    .update({
      status: statusMap[dispute.status] || dispute.status,
      evidence_due_by: dispute.evidence_details?.due_by
        ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
        : null,
      updated_at: new Date().toISOString()
    })
    .eq("stripe_dispute_id", dispute.id);
}

async function handleDisputeClosed(dispute: Stripe.Dispute, supabaseClient: any) {
  logStep("Dispute closed", { disputeId: dispute.id, status: dispute.status });

  const isWon = dispute.status === 'won';
  const isLost = dispute.status === 'lost';

  await supabaseClient
    .from("chargebacks")
    .update({
      status: dispute.status,
      resolved_at: new Date().toISOString(),
      fee_applied: isLost,
      updated_at: new Date().toISOString()
    })
    .eq("stripe_dispute_id", dispute.id);

  // If lost, record the chargeback fee
  if (isLost) {
    const { data: chargeback } = await supabaseClient
      .from("chargebacks")
      .select("company_id, amount, fee_amount")
      .eq("stripe_dispute_id", dispute.id)
      .single();

    if (chargeback?.company_id) {
      await supabaseClient
        .from("chargeback_fees")
        .insert({
          company_id: chargeback.company_id,
          chargeback_amount: chargeback.amount,
          fee_type: 'chargeback_loss',
          status: 'applied'
        });
    }
  }

  logStep("Dispute closed and processed", { disputeId: dispute.id, won: isWon, lost: isLost });
}