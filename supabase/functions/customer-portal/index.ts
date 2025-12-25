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

    const origin = req.headers.get("origin") || "https://build-desk.com";

    // Create customer portal session
    const portalSession = await stripe.billingPortal.sessions.create({
      customer: subscriber.stripe_customer_id,
      return_url: `${origin}/dashboard`,
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