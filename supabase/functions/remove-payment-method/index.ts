// Remove Payment Method Edge Function
// Detaches a payment method from the Stripe customer
import Stripe from "npm:stripe@14";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "npm:zod@3";

/** Stripe payment-method ids are `pm_` followed by an opaque token. */
const RemovePaymentMethodSchema = z.object({
  payment_method_id: z.string().min(3).max(255).regex(/^pm_[A-Za-z0-9]+$/, 'must be a Stripe payment method id'),
});

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

    const parsed = await validateBody(req, RemovePaymentMethodSchema, {
      name: 'remove-payment-method',
    });
    if (!parsed.ok) return parsed.response;
    const { payment_method_id } = parsed.data;

    logStep("Removing payment method", { payment_method_id });

    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    // Resolve the caller's own Stripe customer before touching anything.
    //
    // This handler used to detach whatever payment_method_id it was given. The
    // caller was authenticated, but nothing checked the payment method belonged
    // to them - and the Stripe key here is the platform's, so every customer is
    // in scope. Any signed-in user who learned another customer's pm_ id could
    // detach it and break their next renewal. stripe.paymentMethods.detach()
    // offers no protection of its own; set-default-payment-method is only safe
    // because customers.update rejects a method that is not attached.
    const { user, supabase } = authContext;
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

    const paymentMethod = await stripe.paymentMethods.retrieve(payment_method_id);
    if (paymentMethod.customer !== company.stripe_customer_id) {
      logStep("Cross-customer detach attempt", {
        userId: user.id,
        callerCustomer: company.stripe_customer_id,
      });
      // Deliberately the same shape as a genuine miss: telling the caller the
      // method exists but belongs to someone else confirms the id for them.
      return errorResponse('Payment method not found', 404, req);
    }

    // Detach the payment method from the customer
    await stripe.paymentMethods.detach(payment_method_id);

    logStep("Payment method removed successfully");
    return successResponse({ removed: true }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
