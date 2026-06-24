// Handle Chargeback Edge Function
// Manages chargeback disputes with Stripe integration
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
  console.log(`[HANDLE-CHARGEBACK] ${step}${detailsStr}`);
};

interface ChargebackRequest {
  action: 'create' | 'update' | 'submit_evidence' | 'accept' | 'list' | 'get' | 'sync';
  chargeback_id?: string;
  stripe_dispute_id?: string;
  invoice_id?: string;
  amount?: number;
  reason?: string;
  evidence?: ChargebackEvidence;
  notes?: string;
}

interface ChargebackEvidence {
  product_description?: string;
  customer_name?: string;
  customer_email_address?: string;
  billing_address?: string;
  customer_signature?: string; // base64 encoded
  receipt?: string; // base64 encoded
  service_date?: string;
  service_documentation?: string;
  shipping_documentation?: string;
  uncategorized_text?: string;
  access_activity_log?: string;
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

    const body: ChargebackRequest = await req.json();
    const { action } = body;

    logStep('Processing action', { action, companyId });

    switch (action) {
      case 'create':
        return await createChargeback(supabaseClient, companyId, body);

      case 'update':
        return await updateChargeback(supabaseClient, companyId, body);

      case 'submit_evidence':
        return await submitEvidence(supabaseClient, companyId, body);

      case 'accept':
        return await acceptChargeback(supabaseClient, companyId, body.chargeback_id);

      case 'list':
        return await listChargebacks(supabaseClient, companyId);

      case 'get':
        return await getChargeback(supabaseClient, companyId, body.chargeback_id);

      case 'sync':
        return await syncChargebacksFromStripe(supabaseClient, companyId);

      default:
        return errorResponse('Invalid action. Use: create, update, submit_evidence, accept, list, get, sync', 400);
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

async function createChargeback(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  body: ChargebackRequest
) {
  const { invoice_id, amount, reason, stripe_dispute_id, notes } = body;

  if (!amount || !reason) {
    return errorResponse('amount and reason are required', 400);
  }

  // Get company payment settings for chargeback fee
  const { data: settings } = await supabase
    .from('company_payment_settings')
    .select('chargeback_fee')
    .eq('company_id', companyId)
    .single();

  const chargebackFee = settings?.chargeback_fee || 15.00;
  const netImpact = amount + chargebackFee;

  const { data: chargeback, error } = await supabase
    .from('chargebacks')
    .insert({
      company_id: companyId,
      invoice_id,
      amount,
      reason,
      reason_description: body.notes,
      stripe_dispute_id,
      fee_amount: chargebackFee,
      net_impact: netImpact,
      status: 'needs_response',
      notes
    })
    .select()
    .single();

  if (error) {
    logStep('Failed to create chargeback', { error: error.message });
    return errorResponse(`Failed to create chargeback: ${error.message}`, 500);
  }

  logStep('Chargeback created', { chargebackId: chargeback.id });

  // Update invoice if linked
  if (invoice_id) {
    await supabase
      .from('invoices')
      .update({
        status: 'disputed',
        disputed_at: new Date().toISOString()
      })
      .eq('id', invoice_id);
  }

  return new Response(
    JSON.stringify({ success: true, chargeback }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function updateChargeback(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  body: ChargebackRequest
) {
  const { chargeback_id, notes } = body;

  if (!chargeback_id) {
    return errorResponse('chargeback_id is required', 400);
  }

  const { data: chargeback, error: fetchError } = await supabase
    .from('chargebacks')
    .select('*')
    .eq('id', chargeback_id)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !chargeback) {
    return errorResponse('Chargeback not found', 404);
  }

  const updateData: Record<string, unknown> = {};
  if (notes) updateData.notes = notes;

  const { data: updated, error: updateError } = await supabase
    .from('chargebacks')
    .update(updateData)
    .eq('id', chargeback_id)
    .select()
    .single();

  if (updateError) {
    return errorResponse(`Failed to update chargeback: ${updateError.message}`, 500);
  }

  return new Response(
    JSON.stringify({ success: true, chargeback: updated }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function submitEvidence(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  body: ChargebackRequest
) {
  const { chargeback_id, evidence } = body;

  if (!chargeback_id || !evidence) {
    return errorResponse('chargeback_id and evidence are required', 400);
  }

  // Get the chargeback
  const { data: chargeback, error: fetchError } = await supabase
    .from('chargebacks')
    .select('*')
    .eq('id', chargeback_id)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !chargeback) {
    return errorResponse('Chargeback not found', 404);
  }

  if (!['needs_response', 'warning_needs_response'].includes(chargeback.status)) {
    return errorResponse(`Cannot submit evidence for chargeback with status: ${chargeback.status}`, 400);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (stripeKey && chargeback.stripe_dispute_id) {
    // Submit evidence to Stripe
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    try {
      const stripeEvidence: Stripe.DisputeUpdateParams.Evidence = {};

      if (evidence.product_description) stripeEvidence.product_description = evidence.product_description;
      if (evidence.customer_name) stripeEvidence.customer_name = evidence.customer_name;
      if (evidence.customer_email_address) stripeEvidence.customer_email_address = evidence.customer_email_address;
      if (evidence.billing_address) stripeEvidence.billing_address = evidence.billing_address;
      if (evidence.service_date) stripeEvidence.service_date = evidence.service_date;
      if (evidence.service_documentation) stripeEvidence.service_documentation = evidence.service_documentation;
      if (evidence.uncategorized_text) stripeEvidence.uncategorized_text = evidence.uncategorized_text;

      await stripe.disputes.update(chargeback.stripe_dispute_id, {
        evidence: stripeEvidence,
        submit: true
      });

      logStep('Evidence submitted to Stripe', { disputeId: chargeback.stripe_dispute_id });

    } catch (stripeError) {
      const error = stripeError as Stripe.errors.StripeError;
      logStep('Failed to submit evidence to Stripe', { error: error.message });
      // Continue to update local record even if Stripe fails
    }
  }

  // Update local record
  const { data: updated, error: updateError } = await supabase
    .from('chargebacks')
    .update({
      evidence: evidence,
      evidence_submitted: true,
      status: 'under_review'
    })
    .eq('id', chargeback_id)
    .select()
    .single();

  if (updateError) {
    return errorResponse(`Failed to update chargeback: ${updateError.message}`, 500);
  }

  return new Response(
    JSON.stringify({
      success: true,
      chargeback: updated,
      message: 'Evidence submitted successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function acceptChargeback(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  chargebackId?: string
) {
  if (!chargebackId) {
    return errorResponse('chargeback_id is required', 400);
  }

  const { data: chargeback, error: fetchError } = await supabase
    .from('chargebacks')
    .select('*')
    .eq('id', chargebackId)
    .eq('company_id', companyId)
    .single();

  if (fetchError || !chargeback) {
    return errorResponse('Chargeback not found', 404);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (stripeKey && chargeback.stripe_dispute_id) {
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    try {
      await stripe.disputes.close(chargeback.stripe_dispute_id);
      logStep('Dispute closed in Stripe', { disputeId: chargeback.stripe_dispute_id });
    } catch (stripeError) {
      const error = stripeError as Stripe.errors.StripeError;
      logStep('Failed to close dispute in Stripe', { error: error.message });
    }
  }

  // Apply chargeback fee
  const { error: feeError } = await supabase
    .from('chargeback_fees')
    .insert({
      company_id: companyId,
      chargeback_amount: chargeback.amount,
      fee_type: 'chargeback_loss',
      status: 'applied'
    });

  if (feeError) {
    logStep('Failed to record chargeback fee', { error: feeError.message });
  }

  // Update chargeback
  const { data: updated, error: updateError } = await supabase
    .from('chargebacks')
    .update({
      status: 'lost',
      fee_applied: true,
      resolved_at: new Date().toISOString()
    })
    .eq('id', chargebackId)
    .select()
    .single();

  if (updateError) {
    return errorResponse(`Failed to update chargeback: ${updateError.message}`, 500);
  }

  // Update linked invoice
  if (chargeback.invoice_id) {
    await supabase
      .from('invoices')
      .update({
        status: 'chargeback_lost'
      })
      .eq('id', chargeback.invoice_id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      chargeback: updated,
      message: 'Chargeback accepted (dispute lost)'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function listChargebacks(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const { data: chargebacks, error } = await supabase
    .from('chargebacks')
    .select(`
      *,
      invoice:invoice_id (id, invoice_number, total_amount),
      assigned_to_user:assigned_to (full_name, email),
      handled_by_user:handled_by (full_name, email)
    `)
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return errorResponse(`Failed to list chargebacks: ${error.message}`, 500);
  }

  // Calculate summary stats
  const summary = {
    total: chargebacks?.length || 0,
    pending: chargebacks?.filter(c => ['needs_response', 'warning_needs_response'].includes(c.status)).length || 0,
    under_review: chargebacks?.filter(c => c.status === 'under_review').includes.length || 0,
    won: chargebacks?.filter(c => c.status === 'won').length || 0,
    lost: chargebacks?.filter(c => c.status === 'lost').length || 0,
    total_amount: chargebacks?.reduce((sum, c) => sum + (c.amount || 0), 0) || 0,
    total_fees: chargebacks?.reduce((sum, c) => sum + (c.fee_applied ? c.fee_amount || 0 : 0), 0) || 0
  };

  return new Response(
    JSON.stringify({ success: true, chargebacks, summary }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getChargeback(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  chargebackId?: string
) {
  if (!chargebackId) {
    return errorResponse('chargeback_id is required', 400);
  }

  const { data: chargeback, error } = await supabase
    .from('chargebacks')
    .select(`
      *,
      invoice:invoice_id (*),
      assigned_to_user:assigned_to (full_name, email),
      handled_by_user:handled_by (full_name, email)
    `)
    .eq('id', chargebackId)
    .eq('company_id', companyId)
    .single();

  if (error || !chargeback) {
    return errorResponse('Chargeback not found', 404);
  }

  return new Response(
    JSON.stringify({ success: true, chargeback }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function syncChargebacksFromStripe(
  supabase: ReturnType<typeof createClient>,
  companyId: string
) {
  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");

  if (!stripeKey) {
    return errorResponse('Stripe is not configured', 400);
  }

  const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

  try {
    // Get company's Stripe customer IDs
    const { data: company } = await supabase
      .from('companies')
      .select('stripe_customer_id')
      .eq('id', companyId)
      .single();

    if (!company?.stripe_customer_id) {
      return new Response(
        JSON.stringify({
          success: true,
          synced: 0,
          message: 'No Stripe customer ID found for company'
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
      );
    }

    // Get disputes from Stripe
    const disputes = await stripe.disputes.list({
      limit: 100
    });

    let synced = 0;

    for (const dispute of disputes.data) {
      // Check if we already have this dispute
      const { data: existing } = await supabase
        .from('chargebacks')
        .select('id')
        .eq('stripe_dispute_id', dispute.id)
        .single();

      if (existing) {
        // Update existing
        await supabase
          .from('chargebacks')
          .update({
            status: mapStripeStatus(dispute.status),
            amount: dispute.amount / 100,
            reason: dispute.reason,
            evidence_due_by: dispute.evidence_details?.due_by
              ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
              : null
          })
          .eq('id', existing.id);
      } else {
        // Create new
        await supabase
          .from('chargebacks')
          .insert({
            company_id: companyId,
            stripe_dispute_id: dispute.id,
            stripe_charge_id: dispute.charge as string,
            stripe_payment_intent_id: dispute.payment_intent as string,
            amount: dispute.amount / 100,
            currency: dispute.currency,
            reason: dispute.reason,
            status: mapStripeStatus(dispute.status),
            evidence_due_by: dispute.evidence_details?.due_by
              ? new Date(dispute.evidence_details.due_by * 1000).toISOString()
              : null,
            fee_amount: 15.00,
            net_impact: (dispute.amount / 100) + 15.00
          });
        synced++;
      }
    }

    logStep('Synced chargebacks from Stripe', { synced });

    return new Response(
      JSON.stringify({
        success: true,
        synced,
        total_disputes: disputes.data.length,
        message: `Synced ${synced} new chargebacks from Stripe`
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (stripeError) {
    const error = stripeError as Stripe.errors.StripeError;
    return errorResponse(`Failed to sync from Stripe: ${error.message}`, 500);
  }
}

function mapStripeStatus(stripeStatus: string): string {
  const statusMap: Record<string, string> = {
    'warning_needs_response': 'warning_needs_response',
    'warning_under_review': 'warning_under_review',
    'warning_closed': 'warning_closed',
    'needs_response': 'needs_response',
    'under_review': 'under_review',
    'charge_refunded': 'charge_refunded',
    'won': 'won',
    'lost': 'lost'
  };
  return statusMap[stripeStatus] || 'needs_response';
}
