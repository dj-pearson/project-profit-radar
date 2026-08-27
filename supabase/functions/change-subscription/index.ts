// Change Subscription Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { z } from "npm:zod@3";
import { validateBody } from '../_shared/validate-body.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import { createServiceClient } from '../_shared/service-client.ts';

interface SubscriptionChangeRequest {
  new_tier: 'starter' | 'professional' | 'enterprise';
  new_billing_period?: 'monthly' | 'annual';
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}

const SubscriptionChangeSchema = z.object({
  new_tier: z.enum(['starter', 'professional', 'enterprise']),
  new_billing_period: z.enum(['monthly', 'annual']).optional(),
  proration_behavior: z.enum(['create_prorations', 'none', 'always_invoice']).optional(),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-CHANGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Subscription change started");

        const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id });

    const parsed = await validateBody(req, SubscriptionChangeSchema, { name: 'change-subscription' });
    if (!parsed.ok) return parsed.response;
    const changeRequest = parsed.data as SubscriptionChangeRequest;
    logStep("Change request received", {
      newTier: changeRequest.new_tier,
      newBilling: changeRequest.new_billing_period
    });

    // Get user's current subscription with site isolation
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('*')
        // CRITICAL: Site isolation
      .eq('user_id', user.id)
      .single();

    if (!subscriber || !subscriber.subscribed) {
      throw new Error("No active subscription found");
    }

    if (!subscriber.stripe_customer_id) {
      throw new Error("Stripe customer ID not found");
    }

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    // Get current Stripe subscription
    const subscriptions = await stripe.subscriptions.list({
      customer: subscriber.stripe_customer_id,
      status: "active",
      limit: 1,
    });

    if (subscriptions.data.length === 0) {
      throw new Error("No active Stripe subscription found");
    }

    const currentSubscription = subscriptions.data[0];
    const currentPrice = currentSubscription.items.data[0].price;
    
    logStep("Current subscription found", { 
      subscriptionId: currentSubscription.id,
      currentAmount: currentPrice.unit_amount 
    });

    // Define pricing
    const pricing = {
      starter: { monthly: 14900, annual: 149000 },
      professional: { monthly: 29900, annual: 299000 },
      enterprise: { monthly: 59900, annual: 599000 }
    };

    // Determine new billing period (keep current if not specified)
    const newBillingPeriod = changeRequest.new_billing_period || 
      (currentPrice.recurring?.interval === 'year' ? 'annual' : 'monthly');
    
    const newAmount = pricing[changeRequest.new_tier][newBillingPeriod];
    const newInterval = newBillingPeriod === 'annual' ? 'year' : 'month';

    // Check if this is actually a change
    if (currentPrice.unit_amount === newAmount && 
        currentPrice.recurring?.interval === newInterval) {
      return new Response(JSON.stringify({
        success: false,
        error: "Selected plan is the same as current plan"
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 400,
      });
    }

    logStep("Plan change detected", { 
      currentAmount: currentPrice.unit_amount, 
      newAmount,
      currentInterval: currentPrice.recurring?.interval,
      newInterval
    });

    // Create new price object
    const newPrice = await stripe.prices.create({
      currency: 'usd',
      unit_amount: newAmount,
      recurring: { interval: newInterval },
      product_data: {
        name: `${changeRequest.new_tier.charAt(0).toUpperCase() + changeRequest.new_tier.slice(1)} Plan`,
        metadata: {
          tier: changeRequest.new_tier,
          billing_period: newBillingPeriod
        }
      }
    });

    logStep("New price created", { priceId: newPrice.id });

    // Calculate proration preview
    const upcoming = await stripe.invoices.retrieveUpcoming({
      customer: subscriber.stripe_customer_id,
      subscription: currentSubscription.id,
      subscription_items: [{
        id: currentSubscription.items.data[0].id,
        price: newPrice.id,
      }],
      subscription_proration_behavior: changeRequest.proration_behavior || 'create_prorations'
    });

    const prorationAmount = upcoming.total;
    const isUpgrade = newAmount > (currentPrice.unit_amount || 0);
    
    logStep("Proration calculated", { 
      prorationAmount, 
      isUpgrade,
      immediateCharge: prorationAmount > 0
    });

    // Update the subscription
    const updatedSubscription = await stripe.subscriptions.update(
      currentSubscription.id,
      {
        items: [{
          id: currentSubscription.items.data[0].id,
          price: newPrice.id,
        }],
        proration_behavior: changeRequest.proration_behavior || 'create_prorations',
        metadata: {
          previous_tier: subscriber.subscription_tier,
          new_tier: changeRequest.new_tier,
          changed_by: user.id,
          change_date: new Date().toISOString()
        }
      }
    );

    logStep("Subscription updated", { 
      subscriptionId: updatedSubscription.id,
      status: updatedSubscription.status 
    });

    // Update Supabase subscriber record with site isolation.
    //
    // Stripe has already been changed by this point, so a lost write bills the
    // customer on the new tier while the app entitles them to the old one -
    // silently, and in whichever direction the change went. supabase-js
    // returns this error rather than throwing it (US-300).
    const { error: subscriberError } = await supabaseClient
      .from('subscribers')
      .update({
        subscription_tier: changeRequest.new_tier,
        billing_period: newBillingPeriod,
        subscription_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
        // CRITICAL: Site isolation
      .eq('user_id', user.id);

    if (subscriberError) {
      logStep("SUBSCRIBER RECORD NOT UPDATED AFTER STRIPE CHANGE", {
        subscriptionId: updatedSubscription.id,
        userId: user.id,
        newTier: changeRequest.new_tier,
        error: subscriberError.message,
      });
      throw new Error(
        `Your plan changed in Stripe but your account was not updated (${subscriberError.message}). ` +
          `Contact support before making further changes.`,
      );
    }

    // Audit trail (US-244): what the customer pays changed, and Stripe was
    // already told. Recorded after the mirror write so both sides agree.
    await writeAuditLog(createServiceClient(), {
      actorUserId: user.id,
      action: 'subscription.changed',
      entityType: 'subscriber',
      entityId: subscriber?.id ?? user.id,
      before: { subscription_tier: subscriber.subscription_tier },
      after: { subscription_tier: changeRequest.new_tier, billing_period: newBillingPeriod },
      description: `Subscription changed from ${subscriber.subscription_tier} to ${changeRequest.new_tier}`,
      riskLevel: 'high',
    });

    logStep("Supabase record updated");

    // Prepare response
    const result = {
      success: true,
      subscription_change: {
        previous_tier: subscriber.subscription_tier,
        new_tier: changeRequest.new_tier,
        previous_billing: subscriber.billing_period,
        new_billing: newBillingPeriod,
        is_upgrade: isUpgrade,
        proration_amount: prorationAmount,
        immediate_charge: prorationAmount > 0,
        next_billing_date: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        stripe_subscription_id: updatedSubscription.id
      }
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in subscription change", { message: errorMessage });
    return new Response(JSON.stringify({ 
      success: false, 
      error: errorMessage 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
