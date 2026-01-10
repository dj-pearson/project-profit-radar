// Process Refund Edge Function
// Handles refund requests with optional Stripe integration
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-REFUND] ${step}${detailsStr}`);
};

interface RefundRequest {
  action: 'create' | 'approve' | 'reject' | 'process' | 'cancel' | 'list' | 'get';
  refund_id?: string;
  invoice_id?: string;
  amount?: number;
  reason?: string;
  reason_description?: string;
  notes?: string;
  stripe_payment_intent_id?: string;
  stripe_charge_id?: string;
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    logStep('User authenticated', { userId: user.id });

    // Get user's company
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id, role')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      return errorResponse('User company not found', 404);
    }

    const companyId = userProfile.company_id;
    const userRole = userProfile.role;

    const body: RefundRequest = await req.json();
    const { action } = body;

    logStep('Processing action', { action, companyId });

    switch (action) {
      case 'create':
        return await createRefund(supabaseClient, companyId, user.id, body);

      case 'approve':
        return await approveRefund(supabaseClient, companyId, user.id, userRole, body.refund_id);

      case 'reject':
        return await rejectRefund(supabaseClient, companyId, user.id, body.refund_id, body.notes);

      case 'process':
        return await processRefund(supabaseClient, companyId, body.refund_id);

      case 'cancel':
        return await cancelRefund(supabaseClient, companyId, body.refund_id);

      case 'list':
        return await listRefunds(supabaseClient, companyId);

      case 'get':
        return await getRefund(supabaseClient, companyId, body.refund_id);

      default:
        return errorResponse('Invalid action. Use: create, approve, reject, process, cancel, list, get', 400);
    }

  } catch (error) {
    const errorObj = error as Error;
    logStep('Error', { error: errorObj.message });
    return new Response(
      JSON.stringify({ success: false, error: errorObj.message }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 500 }
    );
  }
});

async function createRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  body: RefundRequest
) {
  const { invoice_id, amount, reason, reason_description, stripe_payment_intent_id, stripe_charge_id, notes } = body;

  if (!amount || !reason) {
    return errorResponse('amount and reason are required', 400);
  }

  const validReasons = ['duplicate', 'fraudulent', 'requested_by_customer', 'service_issue', 'product_defective', 'other'];
  if (!validReasons.includes(reason)) {
    return errorResponse(`reason must be one of: ${validReasons.join(', ')}`, 400);
  }

  // Check if approval is required based on amount or company settings
  const requiresApproval = amount > 100; // Default: require approval for refunds > $100

  const { data: refund, error } = await supabase
    .from('refunds')
    .insert({
      company_id: companyId,
      invoice_id,
      amount,
      reason,
      reason_description,
      stripe_payment_intent_id,
      stripe_charge_id,
      notes,
      requested_by: userId,
      requires_approval: requiresApproval,
      status: requiresApproval ? 'pending' : 'processing'
    })
    .select()
    .single();

  if (error) {
    logStep('Failed to create refund', { error: error.message });
    return errorResponse(`Failed to create refund: ${error.message}`, 500);
  }

  logStep('Refund created', { refundId: refund.id, requiresApproval });

  // If no approval required, process immediately
  if (!requiresApproval) {
    return await processRefundWithStripe(supabase, companyId, refund);
  }

  return new Response(
    JSON.stringify({
      success: true,
      refund,
      message: requiresApproval ? 'Refund created and pending approval' : 'Refund created and processing'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function approveRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  userRole: string,
  refundId?: string
) {
  if (!refundId) {
    return errorResponse('refund_id is required', 400);
  }

  // Check permissions
  if (!['admin', 'accounting'].includes(userRole)) {
    return errorResponse('Only admin or accounting roles can approve refunds', 403);
  }

  // Get the refund
  const { data: refund, error: fetchError } = await supabase
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !refund) {
    return errorResponse('Refund not found', 404);
  }

  if (refund.status !== 'pending') {
    return errorResponse(`Cannot approve refund with status: ${refund.status}`, 400);
  }

  // Update status
  const { error: updateError } = await supabase
    .from('refunds')
    .update({
      status: 'processing',
      approved_by: userId,
      approved_at: new Date().toISOString()
    })
    .eq('id', refundId);

  if (updateError) {
    return errorResponse(`Failed to approve refund: ${updateError.message}`, 500);
  }

  logStep('Refund approved', { refundId });

  // Process with Stripe
  const updatedRefund = { ...refund, status: 'processing', approved_by: userId };
  return await processRefundWithStripe(supabase, companyId, updatedRefund);
}

async function rejectRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  userId: string,
  refundId?: string,
  notes?: string
) {
  if (!refundId) {
    return errorResponse('refund_id is required', 400);
  }

  const { data: refund, error: fetchError } = await supabase
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !refund) {
    return errorResponse('Refund not found', 404);
  }

  if (refund.status !== 'pending') {
    return errorResponse(`Cannot reject refund with status: ${refund.status}`, 400);
  }

  const { error: updateError } = await supabase
    .from('refunds')
    .update({
      status: 'canceled',
      notes: notes || refund.notes
    })
    .eq('id', refundId);

  if (updateError) {
    return errorResponse(`Failed to reject refund: ${updateError.message}`, 500);
  }

  logStep('Refund rejected', { refundId });

  return new Response(
    JSON.stringify({ success: true, message: 'Refund rejected' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function processRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refundId?: string
) {
  if (!refundId) {
    return errorResponse('refund_id is required', 400);
  }

  const { data: refund, error: fetchError } = await supabase
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !refund) {
    return errorResponse('Refund not found', 404);
  }

  if (!['pending', 'processing'].includes(refund.status)) {
    return errorResponse(`Cannot process refund with status: ${refund.status}`, 400);
  }

  return await processRefundWithStripe(supabase, companyId, refund);
}

async function processRefundWithStripe(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refund: Record<string, unknown>
) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    // No Stripe key - mark as manual refund success
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: 'succeeded',
        metadata: { ...((refund.metadata as Record<string, unknown>) || {}), manual_refund: true }
      })
      .eq('id', refund.id);

    if (updateError) {
      return errorResponse(`Failed to update refund: ${updateError.message}`, 500);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: { ...refund, status: 'succeeded' },
        message: 'Refund marked as completed (manual processing - Stripe not configured)'
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  try {
    let stripeRefund: Stripe.Refund;

    // Process refund via Stripe
    const refundParams: Stripe.RefundCreateParams = {
      amount: Math.round((refund.amount as number) * 100), // Convert to cents
      reason: refund.reason === 'fraudulent' ? 'fraudulent' :
              refund.reason === 'duplicate' ? 'duplicate' : 'requested_by_customer',
      metadata: {
        builddesk_refund_id: refund.id as string,
        company_id: companyId
      }
    };

    if (refund.stripe_payment_intent_id) {
      refundParams.payment_intent = refund.stripe_payment_intent_id as string;
    } else if (refund.stripe_charge_id) {
      refundParams.charge = refund.stripe_charge_id as string;
    } else {
      // No Stripe payment info - process as manual
      const { error: updateError } = await supabase
        .from('refunds')
        .update({
          status: 'succeeded',
          metadata: { ...((refund.metadata as Record<string, unknown>) || {}), manual_refund: true }
        })
        .eq('id', refund.id);

      if (updateError) {
        return errorResponse(`Failed to update refund: ${updateError.message}`, 500);
      }

      return new Response(
        JSON.stringify({
          success: true,
          refund: { ...refund, status: 'succeeded' },
          message: 'Refund marked as completed (no Stripe payment info - manual processing)'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    stripeRefund = await stripe.refunds.create(refundParams);

    logStep('Stripe refund created', { stripeRefundId: stripeRefund.id });

    // Update refund record
    const { error: updateError } = await supabase
      .from('refunds')
      .update({
        status: stripeRefund.status === 'succeeded' ? 'succeeded' :
                stripeRefund.status === 'pending' ? 'processing' : 'failed',
        stripe_refund_id: stripeRefund.id,
        failure_reason: stripeRefund.failure_reason || null
      })
      .eq('id', refund.id);

    if (updateError) {
      logStep('Failed to update refund record', { error: updateError.message });
    }

    // Update invoice if linked
    if (refund.invoice_id && stripeRefund.status === 'succeeded') {
      await supabase
        .from('invoices')
        .update({
          status: 'refunded',
          refund_amount: refund.amount,
          refunded_at: new Date().toISOString()
        })
        .eq('id', refund.invoice_id);
    }

    return new Response(
      JSON.stringify({
        success: true,
        refund: {
          ...refund,
          status: stripeRefund.status,
          stripe_refund_id: stripeRefund.id
        },
        stripe_refund: stripeRefund
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (stripeError) {
    const error = stripeError as Stripe.errors.StripeError;
    logStep('Stripe refund failed', { error: error.message });

    await supabase
      .from('refunds')
      .update({
        status: 'failed',
        failure_reason: error.message
      })
      .eq('id', refund.id);

    return errorResponse(`Stripe refund failed: ${error.message}`, 500);
  }
}

async function cancelRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refundId?: string
) {
  if (!refundId) {
    return errorResponse('refund_id is required', 400);
  }

  const { data: refund, error: fetchError } = await supabase
    .from('refunds')
    .select('*')
    .eq('id', refundId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !refund) {
    return errorResponse('Refund not found', 404);
  }

  if (!['pending', 'processing'].includes(refund.status)) {
    return errorResponse(`Cannot cancel refund with status: ${refund.status}`, 400);
  }

  const { error: updateError } = await supabase
    .from('refunds')
    .update({ status: 'canceled' })
    .eq('id', refundId);

  if (updateError) {
    return errorResponse(`Failed to cancel refund: ${updateError.message}`, 500);
  }

  return new Response(
    JSON.stringify({ success: true, message: 'Refund canceled' }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function listRefunds(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: refunds, error } = await supabase
    .from('refunds')
    .select(`
      *,
      invoice:invoice_id (id, invoice_number, total_amount),
      requested_by_user:requested_by (full_name, email),
      approved_by_user:approved_by (full_name, email)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return errorResponse(`Failed to list refunds: ${error.message}`, 500);
  }

  return new Response(
    JSON.stringify({ success: true, refunds }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getRefund(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  refundId?: string
) {
  if (!refundId) {
    return errorResponse('refund_id is required', 400);
  }

  const { data: refund, error } = await supabase
    .from('refunds')
    .select(`
      *,
      invoice:invoice_id (*),
      requested_by_user:requested_by (full_name, email),
      approved_by_user:approved_by (full_name, email)
    `)
    .eq('id', refundId)
    .eq('company_id', companyId)
    .single();

  if (error || !refund) {
    return errorResponse('Refund not found', 404);
  }

  return new Response(
    JSON.stringify({ success: true, refund }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}
