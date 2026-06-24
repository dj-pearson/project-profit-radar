// Process Invoice Payment Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, uuidSchema } from "../_shared/validation.ts";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// SECURITY: Input validation schema
const PaymentRequestSchema = z.object({
  invoice_id: uuidSchema,
  payment_method: z.enum(['stripe_checkout', 'stripe_payment_intent', 'manual']).optional(),
  manual_payment_amount: z.number().positive().max(999999999.99).optional(),
  manual_payment_notes: z.string().max(1000).optional()
});

type PaymentRequest = z.infer<typeof PaymentRequestSchema>;

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-PAYMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    logStep("Payment processing started");

    // Initialize auth context
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized - Missing or invalid authentication', 401);
    }

    const { user, supabase } = authContext;
    logStep("User authenticated", { userId: user.id });

    // SECURITY: Validate request body
    const requestBody = await req.json();
    const validation = validateRequest(PaymentRequestSchema, requestBody);

    if (!validation.success) {
      logStep("Validation failed", { error: validation.error });
      return errorResponse(validation.error || 'Validation failed', 400);
    }

    const paymentData = validation.data;
    logStep("Payment request validated", {
      invoiceId: paymentData.invoice_id,
      method: paymentData.payment_method });

    // Get invoice details
    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .select(`
        *,
        companies(name, stripe_customer_id)
      `)
      .eq('id', paymentData.invoice_id)
      .single();

    if (invoiceError || !invoice) {
      return errorResponse("Invoice not found or access denied", 404);
    }

    // Verify user has access to this invoice
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profile?.company_id !== invoice.company_id && profile?.role !== 'root_admin') {
      return errorResponse("Unauthorized to process payment for this invoice", 403);
    }

    logStep("Invoice found", {
      invoiceNumber: invoice.invoice_number,
      totalAmount: invoice.total_amount,
      amountDue: invoice.amount_due });

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16"
    });

    let result;

    switch (paymentData.payment_method) {
      case 'stripe_checkout':
        result = await createStripeCheckout(stripe, invoice, req);
        break;

      case 'stripe_payment_intent':
        result = await createPaymentIntent(stripe, invoice);
        break;

      case 'manual':
        result = await processManualPayment(
          supabase,
          invoice,
          paymentData.manual_payment_amount || 0,
          paymentData.manual_payment_notes,
          user.id
        );
        break;

      default:
        // Default to Stripe checkout
        result = await createStripeCheckout(stripe, invoice, req);
    }

    logStep("Payment processed", { method: paymentData.payment_method, success: result.success });

    return successResponse(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-payment", { message: errorMessage });
    return errorResponse(errorMessage, 500);
  }
});

async function createStripeCheckout(stripe: any, invoice: any, req: Request) {
  const origin = req.headers.get("origin") || "http://localhost:3000";
  
  const session = await stripe.checkout.sessions.create({
    customer_email: invoice.client_email,
    line_items: [{
      price_data: {
        currency: "usd",
        product_data: { 
          name: `Invoice ${invoice.invoice_number}`,
          description: `Payment for ${invoice.client_name}`
        },
        unit_amount: Math.round(invoice.amount_due * 100), // Convert to cents
      },
      quantity: 1,
    }],
    mode: "payment",
    success_url: `${origin}/invoices/${invoice.id}?payment=success`,
    cancel_url: `${origin}/invoices/${invoice.id}?payment=cancelled`,
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number
    }
  });

  return {
    success: true,
    payment_method: 'stripe_checkout',
    checkout_url: session.url,
    session_id: session.id
  };
}

async function createPaymentIntent(stripe: any, invoice: any) {
  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(invoice.amount_due * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number
    },
    description: `Payment for Invoice ${invoice.invoice_number}`
  });

  return {
    success: true,
    payment_method: 'stripe_payment_intent',
    client_secret: paymentIntent.client_secret,
    payment_intent_id: paymentIntent.id
  };
}

async function processManualPayment(
  supabaseClient: any,
  invoice: any,
  paymentAmount: number,
  notes: string | undefined,
  userId: string
) {
  if (paymentAmount <= 0 || paymentAmount > invoice.amount_due) {
    throw new Error("Invalid payment amount");
  }

  const newAmountPaid = invoice.amount_paid + paymentAmount;
  const isFullyPaid = newAmountPaid >= invoice.total_amount;

  // Update invoice
  const { error: updateError } = await supabaseClient
    .from('invoices')
    .update({
      amount_paid: newAmountPaid,
      status: isFullyPaid ? 'paid' : 'sent',
      paid_at: isFullyPaid ? new Date().toISOString() : null,
      updated_at: new Date().toISOString()
    })
    .eq('id', invoice.id);

  if (updateError) {
    throw new Error(`Error updating invoice: ${updateError.message}`);
  }

  // Log the manual payment
  const paymentRecord = {
    invoice_id: invoice.id,
    amount: paymentAmount,
    method: 'manual',
    notes: notes || 'Manual payment recorded',
    processed_by: userId,
    processed_at: new Date().toISOString()
  };

  return {
    success: true,
    payment_method: 'manual',
    amount_paid: paymentAmount,
    new_total_paid: newAmountPaid,
    fully_paid: isFullyPaid,
    payment_record: paymentRecord
  };
}