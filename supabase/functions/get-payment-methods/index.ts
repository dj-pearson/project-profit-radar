// Get Payment Methods Edge Function
// Returns the Stripe payment methods for the authenticated user's customer
import Stripe from "npm:stripe@14";
import { createClient } from "npm:@supabase/supabase-js@2";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[GET-PAYMENT-METHODS] ${step}${detailsStr}`);
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

    // Get user's Stripe customer ID
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', profile?.company_id)
      .single();

    if (!company?.stripe_customer_id) {
      return successResponse({ payment_methods: [] }, req);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Fetch payment methods from Stripe
    const paymentMethods = await stripe.paymentMethods.list({
      customer: company.stripe_customer_id,
      type: 'card',
    });

    // Get the default payment method
    const customer = await stripe.customers.retrieve(company.stripe_customer_id);
    const defaultPmId = typeof customer !== 'string' && !customer.deleted
      ? customer.invoice_settings?.default_payment_method
      : null;

    const methods = paymentMethods.data.map(pm => ({
      id: pm.id,
      type: pm.type,
      card_brand: pm.card?.brand || null,
      last_four: pm.card?.last4 || null,
      exp_month: pm.card?.exp_month || null,
      exp_year: pm.card?.exp_year || null,
      is_default: pm.id === defaultPmId,
      created_at: new Date(pm.created * 1000).toISOString(),
    }));

    logStep("Payment methods retrieved", { count: methods.length });
    return successResponse({ payment_methods: methods }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
