// Create Stripe Checkout Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, createErrorResponse } from "../_shared/validation.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// SECURITY: Input validation schema
const CheckoutRequestSchema = z.object({
  subscription_tier: z.enum(['starter', 'professional', 'enterprise'], {
    errorMap: () => ({ message: 'Invalid subscription tier' })
  }),
  billing_period: z.enum(['monthly', 'annual'], {
    errorMap: () => ({ message: 'Invalid billing period' })
  }),
  company_id: z.string().uuid('Invalid company ID').optional()
});

type CheckoutRequest = z.infer<typeof CheckoutRequestSchema>;

// Helper logging function for enhanced debugging
const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CREATE-CHECKOUT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    // Initialize auth context - extracts user AND site_id from JWT
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, siteId, supabase: supabaseClient } = authContext;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email, siteId });

    // SECURITY: Validate request body
    const requestBody = await req.json();
    const validation = validateRequest(CheckoutRequestSchema, requestBody);

    if (!validation.success) {
      logStep("Validation failed", { error: validation.error });
      return createErrorResponse(400, validation.error, corsHeaders);
    }

    const { subscription_tier, billing_period, company_id } = validation.data;
    logStep("Request validated", { subscription_tier, billing_period, company_id, siteId });

    // Initialize Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Check if a Stripe customer record exists for this user
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });
    let customerId;
    if (customers.data.length > 0) {
      customerId = customers.data[0].id;
      logStep("Found existing Stripe customer", { customerId });
    } else {
      logStep("No existing customer found, will create during checkout");
    }

    // Define pricing based on tier and billing period
    const pricing = {
      starter: { monthly: 14900, annual: 149000 }, // $149/month, $1490/year (save $298)
      professional: { monthly: 29900, annual: 299000 }, // $299/month, $2990/year (save $598)
      enterprise: { monthly: 59900, annual: 599000 } // $599/month, $5990/year (save $1198)
    };

    const amount = pricing[subscription_tier][billing_period];
    const interval = billing_period === 'annual' ? 'year' : 'month';
    logStep("Pricing calculated", { amount, interval });

    // Create checkout session
    const origin = req.headers.get("origin") || "http://localhost:3000";
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      customer_email: customerId ? undefined : user.email,
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: { 
              name: `${subscription_tier.charAt(0).toUpperCase() + subscription_tier.slice(1)} Plan`,
              description: `Build Desk ${subscription_tier} subscription - ${billing_period} billing`
            },
            unit_amount: amount,
            recurring: { interval },
          },
          quantity: 1,
        },
      ],
      mode: "subscription",
      success_url: `${origin}/setup?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/?canceled=true`,
      metadata: {
        user_id: user.id,
        subscription_tier,
        billing_period,
        company_id: company_id || ''
      }
    });

    logStep("Stripe checkout session created", { sessionId: session.id, url: session.url });

    // Update company subscription status to 'pending' if company_id provided with site isolation
    if (company_id) {
      const supabaseService = createClient(
        Deno.env.get("SUPABASE_URL") ?? "",
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
      );

      let updateQuery = supabaseService
        .from("companies")
        .update({
          subscription_tier,
          subscription_status: "pending",
          updated_at: new Date().toISOString()
        })
        .eq("id", company_id);

      if (siteId) {
        updateQuery = updateQuery.eq("site_id", siteId);  // CRITICAL: Site isolation on update
      }

      await updateQuery;

      logStep("Updated company subscription status", { company_id, siteId, status: "pending" });
    }

    return new Response(
      JSON.stringify({ 
        url: session.url,
        session_id: session.id
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in create-checkout", { message: errorMessage });
    console.error("Error creating checkout:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});