// Change Subscription Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionChangeRequest {
  new_tier: 'starter' | 'professional' | 'enterprise';
  new_billing_period?: 'monthly' | 'annual';
  proration_behavior?: 'create_prorations' | 'none' | 'always_invoice';
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SUBSCRIPTION-CHANGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Subscription change started");

    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");
    logStep("User authenticated", { userId: user.id, siteId });

    const changeRequest: SubscriptionChangeRequest = await req.json();
    logStep("Change request received", {
      newTier: changeRequest.new_tier,
      newBilling: changeRequest.new_billing_period
    });

    // Get user's current subscription with site isolation
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
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

    // Update Supabase subscriber record with site isolation
    await supabaseClient
      .from('subscribers')
      .update({
        subscription_tier: changeRequest.new_tier,
        billing_period: newBillingPeriod,
        subscription_end: new Date(updatedSubscription.current_period_end * 1000).toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('user_id', user.id);

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
