// Process Invoice Payment Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { validateRequest, uuidSchema } from "../_shared/validation.ts";
import { initializeAuthContext, errorResponse, successResponse, safeErrorResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { writeAuditLog } from '../_shared/audit-log.ts';
import { createServiceClient } from '../_shared/service-client.ts';

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
  const corsHeaders = getCorsHeaders(req);
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
        companies(name, stripe_customer_id, stripe_connect_account_id, stripe_connect_charges_enabled)
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

    // Audit trail (US-244): money arriving against an invoice, especially the
    // manual path where a person asserts a payment happened.
    await writeAuditLog(createServiceClient(), {
      actorUserId: user.id,
      companyId: invoice.company_id,
      action: 'invoice_payment.processed',
      entityType: 'invoice',
      entityId: invoice.id,
      after: { method: paymentData.payment_method, success: result.success },
      description: `Payment recorded on invoice ${invoice.invoice_number ?? invoice.id} via ${paymentData.payment_method}`,
      riskLevel: 'critical',
    });

    logStep("Payment processed", { method: paymentData.payment_method, success: result.success });

    return successResponse(result);

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in process-payment", { message: errorMessage });
    return safeErrorResponse(req);
  }
});

/**
 * The contractor's own Stripe account, or nothing (US-324).
 *
 * Customer receipts are collected on the contractor's connected account so
 * they never enter the platform balance. Holding other businesses' customer
 * money makes the platform a money transmitter in most jurisdictions, and it
 * puts a contractor's cash flow behind a payout the platform controls.
 *
 * A company that has not finished Stripe onboarding cannot take card payments,
 * and the caller is told exactly that rather than having the money quietly
 * routed somewhere else.
 */
function connectedAccount(invoice: any): string {
  const account = invoice?.companies?.stripe_connect_account_id;
  const enabled = invoice?.companies?.stripe_connect_charges_enabled;

  if (!account) {
    throw new Error(
      "This company has not connected a Stripe account yet, so it cannot accept " +
      "card payments. Connect one in Settings to let clients pay online."
    );
  }
  if (!enabled) {
    throw new Error(
      "Stripe onboarding for this company is not finished, so charges are not " +
      "enabled yet. Complete it in Settings to let clients pay online."
    );
  }
  return account;
}

async function createStripeCheckout(stripe: any, invoice: any, req: Request) {
  const origin = req.headers.get("origin") || "http://localhost:3000";
  const stripeAccount = connectedAccount(invoice);

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
      invoice_number: invoice.invoice_number,
      company_id: invoice.company_id
    }
  }, { stripeAccount });

  return {
    success: true,
    payment_method: 'stripe_checkout',
    checkout_url: session.url,
    session_id: session.id
  };
}

async function createPaymentIntent(stripe: any, invoice: any) {
  const stripeAccount = connectedAccount(invoice);

  const paymentIntent = await stripe.paymentIntents.create({
    amount: Math.round(invoice.amount_due * 100), // Convert to cents
    currency: 'usd',
    metadata: {
      invoice_id: invoice.id,
      invoice_number: invoice.invoice_number,
      company_id: invoice.company_id
    },
    description: `Payment for Invoice ${invoice.invoice_number}`
  }, { stripeAccount });

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

  // US-324: this used to UPDATE invoices.amount_paid directly and then build a
  // paymentRecord it returned WITHOUT inserting, so a cheque recorded by the
  // office left no payment history and bypassed the trigger that owns the
  // invoice totals. record_invoice_payment inserts the row; the existing
  // AFTER INSERT trigger recomputes amount_paid, amount_due, status and
  // paid_at from the payments themselves.
  const { data: paymentId, error: recordError } = await supabaseClient.rpc(
    'record_invoice_payment',
    {
      p_invoice_id: invoice.id,
      p_amount: paymentAmount,
      p_method: 'manual',
      p_notes: notes || 'Manual payment recorded',
      p_processed_by: userId,
    }
  );

  if (recordError) {
    throw new Error(`Error recording payment: ${recordError.message}`);
  }

  const newAmountPaid = (invoice.amount_paid || 0) + paymentAmount;

  return {
    success: true,
    payment_method: 'manual',
    amount_paid: paymentAmount,
    new_total_paid: newAmountPaid,
    fully_paid: newAmountPaid >= invoice.total_amount,
    payment_id: paymentId,
  };
}