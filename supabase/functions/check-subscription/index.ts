import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Use the service role key to perform writes (upsert) in Supabase
  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    logStep("Authenticating user with token");
    
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    // Check for complimentary subscription first
    const { data: existingSubscriber } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('user_id', user.id)
      .single();

    if (existingSubscriber?.is_complimentary) {
      logStep("Found complimentary subscription", { 
        type: existingSubscriber.complimentary_type,
        expiresAt: existingSubscriber.complimentary_expires_at 
      });

      // Check if complimentary subscription has expired
      const now = new Date();
      const isExpired = existingSubscriber.complimentary_expires_at && 
        new Date(existingSubscriber.complimentary_expires_at) <= now;

      if (isExpired) {
        logStep("Complimentary subscription expired, checking regular subscription");
        // Complimentary expired, remove complimentary status and check regular subscription
        await supabaseClient
          .from('subscribers')
          .update({
            is_complimentary: false,
            complimentary_type: null,
            complimentary_granted_by: null,
            complimentary_granted_at: null,
            complimentary_expires_at: null,
            complimentary_reason: null,
            updated_at: new Date().toISOString()
          })
          .eq('id', existingSubscriber.id);

        // Update history
        await supabaseClient
          .from('complimentary_subscription_history')
          .update({ status: 'expired' })
          .eq('subscriber_id', existingSubscriber.id)
          .eq('status', 'active');
      } else {
        // Active complimentary subscription
        const tier = existingSubscriber.subscription_tier || 'professional';
        const endDate = existingSubscriber.complimentary_type === 'permanent' 
          ? null 
          : existingSubscriber.complimentary_expires_at;

        logStep("Active complimentary subscription confirmed", { tier, endDate });
        return new Response(JSON.stringify({
          subscribed: true,
          subscription_tier: tier,
          subscription_end: endDate,
          billing_period: 'complimentary',
          is_complimentary: true,
          complimentary_type: existingSubscriber.complimentary_type
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    
    if (customers.data.length === 0) {
      logStep("No customer found, updating unsubscribed state");
      await supabaseClient.from("subscribers").upsert({
        email: user.email,
        user_id: user.id,
        stripe_customer_id: null,
        subscribed: false,
        subscription_tier: null,
        subscription_end: null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'email' });
      return new Response(JSON.stringify({ subscribed: false }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });
    const hasActiveSub = subscriptions.data.length > 0;
    let subscriptionTier = null;
    let subscriptionEnd = null;

    let billingPeriod = 'monthly';
    
    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      logStep("Active subscription found", { subscriptionId: subscription.id, endDate: subscriptionEnd });
      
      // Determine subscription tier and billing period from price
      const priceId = subscription.items.data[0].price.id;
      const price = await stripe.prices.retrieve(priceId);
      const amount = price.unit_amount || 0;
      
      // Determine billing period
      billingPeriod = price.recurring?.interval === 'year' ? 'annual' : 'monthly';
      
      if (amount >= 59900) {
        subscriptionTier = "enterprise";
      } else if (amount >= 29900) {
        subscriptionTier = "professional";
      } else {
        subscriptionTier = "starter";
      }
      logStep("Determined subscription details", { 
        priceId, 
        amount, 
        subscriptionTier, 
        billingPeriod 
      });
    } else {
      logStep("No active subscription found");
    }

    await supabaseClient.from("subscribers").upsert({
      email: user.email,
      user_id: user.id,
      stripe_customer_id: customerId,
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      billing_period: billingPeriod,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'email' });

    logStep("Updated database with subscription info", { subscribed: hasActiveSub, subscriptionTier });
    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      subscription_tier: subscriptionTier,
      subscription_end: subscriptionEnd,
      billing_period: billingPeriod
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});