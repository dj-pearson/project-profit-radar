// Set Default Payment Method Edge Function
// Updates the default payment method on the Stripe customer
import Stripe from "https://esm.sh/stripe@14.21.0";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const SetDefaultPaymentMethodSchema = z.object({
  payment_method_id: z.string().min(3).max(255).regex(/^pm_[A-Za-z0-9]+$/, 'must be a Stripe payment method id'),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SET-DEFAULT-PAYMENT-METHOD] ${step}${detailsStr}`);
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
    const parsed = await validateBody(req, SetDefaultPaymentMethodSchema, {
      name: 'set-default-payment-method',
    });
    if (!parsed.ok) return parsed.response;
    const { payment_method_id } = parsed.data;

    logStep("Setting default payment method", { payment_method_id });

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
      return errorResponse('No Stripe customer found', 404, req);
    }

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Update the customer's default payment method
    await stripe.customers.update(company.stripe_customer_id, {
      invoice_settings: {
        default_payment_method: payment_method_id,
      },
    });

    logStep("Default payment method updated");
    return successResponse({ updated: true }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
