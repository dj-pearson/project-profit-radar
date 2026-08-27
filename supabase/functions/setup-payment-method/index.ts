// Setup Payment Method Edge Function
// Creates a Stripe SetupIntent so the client can add a new payment method
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SETUP-PAYMENT-METHOD] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    // Get or create Stripe customer
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, email')
      .eq('id', user.id)
      .single();

    const { data: company } = await supabase
      .from('companies')
      .select('id, stripe_customer_id, name')
      .eq('id', profile?.company_id)
      .single();

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });
    let customerId = company?.stripe_customer_id;

    if (!customerId) {
      // Create a new Stripe customer
      const customer = await stripe.customers.create({
        email: user.email || profile?.email,
        metadata: {
          company_id: company?.id || '',
          user_id: user.id,
        },
      });
      customerId = customer.id;

      // Store the customer ID
      if (company?.id) {
        const serviceClient = createClient(
          Deno.env.get("SUPABASE_URL") ?? "",
          Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
          { auth: { persistSession: false } }
        );
        const { error: updateCompaniesError } = await serviceClient
          .from('companies')
          .update({ stripe_customer_id: customerId })
          .eq('id', company.id);
        if (updateCompaniesError) {
          console.error(`[companies] update failed`, updateCompaniesError);
        }
      }

      logStep("Created Stripe customer", { customerId });
    }

    // Create a SetupIntent
    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ['card'],
    });

    logStep("SetupIntent created", { setupIntentId: setupIntent.id });

    return successResponse({
      setup_intent_client_secret: setupIntent.client_secret,
    }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
