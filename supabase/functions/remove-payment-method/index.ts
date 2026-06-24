// Remove Payment Method Edge Function
// Detaches a payment method from the Stripe customer
import Stripe from "npm:stripe@14";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[REMOVE-PAYMENT-METHOD] ${step}${detailsStr}`);
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

    const { payment_method_id } = await req.json();
    if (!payment_method_id) {
      return errorResponse('payment_method_id is required', 400, req);
    }

    logStep("Removing payment method", { payment_method_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(payment_method_id);

    logStep("Payment method removed successfully");
    return successResponse({ removed: true }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
