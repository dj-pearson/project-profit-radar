// Customer Portal Edge Function
// SECURITY: Uses secure CORS whitelist
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CUSTOMER-PORTAL] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Customer portal request started");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const { user, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated");

    logStep("User authenticated", { userId: user.id, email: user.email });

    // SECURITY: Get user's subscription info with site isolation
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('stripe_customer_id')
      .eq('user_id', user.id)
      .single();

    if (!subscriber?.stripe_customer_id) {
      throw new Error("No Stripe customer found for this user");
    }

    logStep("Stripe customer found", { customerId: subscriber.stripe_customer_id });

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) {
      throw new Error("Stripe configuration error");
    }

    const stripe = new Stripe(stripeKey, {
      apiVersion: "2023-10-16"
    });

    const origin = req.headers.get("origin") || "https://brikly.net";

    // Optional deep-link target. The FTC negative-option rule and the state
    // automatic-renewal laws (California ARL and its equivalents) require
    // cancelling to be about as easy as subscribing was. Signup here is fully
    // self-serve, so landing a subscriber on the portal's billing overview and
    // expecting them to hunt for cancellation does not clear that bar.
    // flow: "cancel" drops them directly on the cancellation flow.
    let flow: string | null = null;
    try {
      const body = await req.json();
      if (body && typeof body.flow === "string") flow = body.flow;
    } catch {
      // No body is the normal case for the plain "manage billing" entry point.
    }

    // Resolve the subscription from Stripe rather than from a local column:
    // stripe_subscription_id lives on `companies` while this function reads
    // `subscribers`, and Stripe is the authority either way. If the lookup
    // fails we fall back to the plain portal rather than erroring, so the
    // cancel button always lands somewhere useful.
    let cancelSubscriptionId: string | null = null;
    if (flow === "cancel") {
      try {
        const subs = await stripe.subscriptions.list({
          customer: subscriber.stripe_customer_id,
          status: "active",
          limit: 1,
        });
        cancelSubscriptionId = subs.data[0]?.id ?? null;
        logStep("Resolved subscription for cancel flow", { cancelSubscriptionId });
      } catch (err) {
        logStep("Could not resolve subscription; falling back to plain portal", {
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }

    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscriber.stripe_customer_id,
      return_url: `${origin}/dashboard`,
      ...(cancelSubscriptionId
        ? {
            flow_data: {
              type: "subscription_cancel" as const,
              subscription_cancel: { subscription: cancelSubscriptionId },
            },
          }
        : {}),
    });

    logStep("Customer portal session created", {
      sessionId: portalSession.id,
      url: portalSession.url
    });

    return new Response(JSON.stringify({
      success: true,
      url: portalSession.url
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in customer-portal", { message: errorMessage });
    // SECURITY: Return generic error message to client
    return new Response(JSON.stringify({
      success: false,
      error: "Failed to open customer portal"
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});