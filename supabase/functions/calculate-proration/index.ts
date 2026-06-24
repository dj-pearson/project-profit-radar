// Calculate Proration Edge Function
// Handles proration calculations for subscription plan changes
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
  console.log(`[CALCULATE-PRORATION] ${step}${detailsStr}`);
};

// Pricing in cents
const PRICING = {
  starter_monthly: 14900,
  starter_annual: 149000,
  professional_monthly: 29900,
  professional_annual: 299000,
  enterprise_monthly: 59900,
  enterprise_annual: 599000
};

interface ProrationRequest {
  action: 'calculate' | 'preview_change' | 'apply_change' | 'get_history';
  new_tier?: string;
  new_period?: 'monthly' | 'annual';
  effective_date?: string;
}

interface ProrationResult {
  previous_tier: string;
  new_tier: string;
  previous_period: string;
  new_period: string;
  change_date: string;
  period_start: string;
  period_end: string;
  days_remaining: number;
  days_in_period: number;
  previous_daily_rate: number;
  new_daily_rate: number;
  credit_amount: number;
  charge_amount: number;
  net_amount: number;
  proration_type: 'upgrade' | 'downgrade' | 'period_change';
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

    // Get user's company and subscription info
    const { data: userProfile, error: profileError } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      return errorResponse('User company not found', 404);
    }

    const companyId = userProfile.company_id;

    // Get current subscription
    const { data: company, error: companyError } = await supabaseClient
      .from('companies')
      .select('*, stripe_customer_id, stripe_subscription_id, subscription_tier, subscription_status')
      .eq('id', companyId)
      .single();

    if (companyError || !company) {
      return errorResponse('Company not found', 404);
    }

    // Also get subscriber info for billing period
    const { data: subscriber } = await supabaseClient
      .from('subscribers')
      .select('*')
      .eq('stripe_customer_id', company.stripe_customer_id)
      .single();

    const body: ProrationRequest = await req.json();
    const { action } = body;

    logStep('Processing action', { action, companyId });

    switch (action) {
      case 'calculate':
      case 'preview_change':
        return await calculateProration(supabaseClient, company, subscriber, body);

      case 'apply_change':
        return await applyProration(supabaseClient, company, subscriber, body);

      case 'get_history':
        return await getProrationHistory(supabaseClient, companyId);

      default:
        return errorResponse('Invalid action. Use: calculate, preview_change, apply_change, get_history', 400);
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

async function calculateProration(
  supabase: ReturnType<typeof createClient>,
  company: Record<string, unknown>,
  subscriber: Record<string, unknown> | null,
  body: ProrationRequest
): Promise<Response> {
  const { new_tier, new_period, effective_date } = body;

  if (!new_tier) {
    return errorResponse('new_tier is required', 400);
  }

  const currentTier = (company.subscription_tier as string) || 'starter';
  const currentPeriod = (subscriber?.billing_period as string) || 'monthly';
  const newPeriod = new_period || currentPeriod;

  // Get subscription dates
  const now = new Date(effective_date || Date.now());
  const periodEnd = subscriber?.subscription_end
    ? new Date(subscriber.subscription_end as string)
    : new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // Default 30 days

  const periodStart = currentPeriod === 'annual'
    ? new Date(periodEnd.getTime() - 365 * 24 * 60 * 60 * 1000)
    : new Date(periodEnd.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Calculate days
  const daysInPeriod = Math.ceil((periodEnd.getTime() - periodStart.getTime()) / (1000 * 60 * 60 * 24));
  const daysRemaining = Math.max(0, Math.ceil((periodEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

  // Get pricing
  const previousPriceKey = `${currentTier}_${currentPeriod}` as keyof typeof PRICING;
  const newPriceKey = `${new_tier}_${newPeriod}` as keyof typeof PRICING;

  const previousPrice = PRICING[previousPriceKey] || 14900;
  const newPrice = PRICING[newPriceKey] || 14900;

  // Calculate daily rates
  const previousDailyRate = previousPrice / daysInPeriod;
  const newDailyRate = newPrice / (newPeriod === 'annual' ? 365 : 30);

  // Calculate proration amounts
  const creditAmount = (previousDailyRate * daysRemaining) / 100; // Convert to dollars
  const chargeAmount = (newDailyRate * daysRemaining) / 100;
  const netAmount = chargeAmount - creditAmount;

  // Determine proration type
  let prorationType: 'upgrade' | 'downgrade' | 'period_change' = 'upgrade';
  if (newPrice < previousPrice) {
    prorationType = 'downgrade';
  } else if (currentTier === new_tier && currentPeriod !== newPeriod) {
    prorationType = 'period_change';
  }

  const result: ProrationResult = {
    previous_tier: currentTier,
    new_tier: new_tier,
    previous_period: currentPeriod,
    new_period: newPeriod,
    change_date: now.toISOString(),
    period_start: periodStart.toISOString(),
    period_end: periodEnd.toISOString(),
    days_remaining: daysRemaining,
    days_in_period: daysInPeriod,
    previous_daily_rate: Math.round(previousDailyRate) / 100,
    new_daily_rate: Math.round(newDailyRate * 100) / 100,
    credit_amount: Math.round(creditAmount * 100) / 100,
    charge_amount: Math.round(chargeAmount * 100) / 100,
    net_amount: Math.round(netAmount * 100) / 100,
    proration_type: prorationType
  };

  logStep('Proration calculated', {
    from: `${currentTier}/${currentPeriod}`,
    to: `${new_tier}/${newPeriod}`,
    netAmount: result.net_amount
  });

  return new Response(
    JSON.stringify({
      success: true,
      proration: result,
      summary: {
        current_plan: `${capitalize(currentTier)} (${capitalize(currentPeriod)})`,
        new_plan: `${capitalize(new_tier)} (${capitalize(newPeriod)})`,
        credit: formatCurrency(result.credit_amount),
        charge: formatCurrency(result.charge_amount),
        net: formatCurrency(result.net_amount),
        message: getProrationMessage(result)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function applyProration(
  supabase: ReturnType<typeof createClient>,
  company: Record<string, unknown>,
  subscriber: Record<string, unknown> | null,
  body: ProrationRequest
): Promise<Response> {
  const { new_tier, new_period } = body;

  if (!new_tier) {
    return errorResponse('new_tier is required', 400);
  }

  const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
  const currentTier = (company.subscription_tier as string) || 'starter';
  const currentPeriod = (subscriber?.billing_period as string) || 'monthly';
  const newPeriod = new_period || currentPeriod;

  // Calculate proration first
  const prorationResponse = await calculateProration(supabase, company, subscriber, body);
  const prorationData = await prorationResponse.json();

  if (!prorationData.success) {
    return new Response(JSON.stringify(prorationData), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400
    });
  }

  const proration = prorationData.proration as ProrationResult;

  // Record proration history
  const { data: prorationRecord, error: recordError } = await supabase
    .from('proration_history')
    .insert({
      company_id: company.id,
      subscriber_id: subscriber?.id,
      stripe_subscription_id: company.stripe_subscription_id,
      previous_tier: proration.previous_tier,
      new_tier: proration.new_tier,
      previous_period: proration.previous_period,
      new_period: proration.new_period,
      change_date: proration.change_date,
      period_start: proration.period_start,
      period_end: proration.period_end,
      days_remaining: proration.days_remaining,
      previous_amount: getPlanPrice(proration.previous_tier, proration.previous_period),
      new_amount: getPlanPrice(proration.new_tier, proration.new_period),
      credit_amount: proration.credit_amount,
      charge_amount: proration.charge_amount,
      net_amount: proration.net_amount,
      status: 'calculated'
    })
    .select()
    .single();

  if (recordError) {
    logStep('Failed to record proration history', { error: recordError.message });
  }

  // Apply via Stripe if configured
  if (stripeKey && company.stripe_subscription_id) {
    const stripe = new Stripe(stripeKey, { apiVersion: "2023-10-16" });

    try {
      const newPriceId = getStripePriceId(new_tier, newPeriod);

      if (newPriceId) {
        // Get the subscription
        const subscription = await stripe.subscriptions.retrieve(company.stripe_subscription_id as string);

        // Update subscription with proration
        const updatedSubscription = await stripe.subscriptions.update(
          company.stripe_subscription_id as string,
          {
            items: [{
              id: subscription.items.data[0].id,
              price: newPriceId
            }],
            proration_behavior: 'create_prorations',
            billing_cycle_anchor: 'unchanged'
          }
        );

        logStep('Stripe subscription updated', {
          subscriptionId: updatedSubscription.id,
          newPriceId
        });

        // Update proration record with Stripe info
        if (prorationRecord) {
          await supabase
            .from('proration_history')
            .update({
              status: 'applied',
              applied_at: new Date().toISOString()
            })
            .eq('id', prorationRecord.id);
        }

        // Update company subscription tier
        await supabase
          .from('companies')
          .update({
            subscription_tier: new_tier
          })
          .eq('id', company.id);

        // Update subscriber
        if (subscriber?.id) {
          await supabase
            .from('subscribers')
            .update({
              subscription_tier: new_tier,
              billing_period: newPeriod
            })
            .eq('id', subscriber.id);
        }

        return new Response(
          JSON.stringify({
            success: true,
            proration,
            stripe_subscription: {
              id: updatedSubscription.id,
              status: updatedSubscription.status
            },
            message: 'Subscription updated with proration applied'
          }),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
        );
      }
    } catch (stripeError) {
      const error = stripeError as Stripe.errors.StripeError;
      logStep('Stripe update failed', { error: error.message });

      // Update proration record as failed
      if (prorationRecord) {
        await supabase
          .from('proration_history')
          .update({
            status: 'failed'
          })
          .eq('id', prorationRecord.id);
      }

      return errorResponse(`Stripe error: ${error.message}`, 500);
    }
  }

  // Manual update without Stripe
  await supabase
    .from('companies')
    .update({
      subscription_tier: new_tier
    })
    .eq('id', company.id);

  if (subscriber?.id) {
    await supabase
      .from('subscribers')
      .update({
        subscription_tier: new_tier,
        billing_period: newPeriod
      })
      .eq('id', subscriber.id);
  }

  if (prorationRecord) {
    await supabase
      .from('proration_history')
      .update({
        status: 'applied',
        applied_at: new Date().toISOString()
      })
      .eq('id', prorationRecord.id);
  }

  return new Response(
    JSON.stringify({
      success: true,
      proration,
      message: 'Subscription updated (manual - Stripe not configured)'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getProrationHistory(
  supabase: ReturnType<typeof createClient>,
  companyId: string
): Promise<Response> {
  const { data: history, error } = await supabase
    .from('proration_history')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return errorResponse(`Failed to fetch history: ${error.message}`, 500);
  }

  // Calculate summary
  const summary = {
    total_changes: history?.length || 0,
    total_credits: history?.reduce((sum, h) => sum + (h.credit_amount || 0), 0) || 0,
    total_charges: history?.reduce((sum, h) => sum + (h.charge_amount || 0), 0) || 0,
    net_adjustments: history?.reduce((sum, h) => sum + (h.net_amount || 0), 0) || 0,
    upgrades: history?.filter(h => h.net_amount > 0).length || 0,
    downgrades: history?.filter(h => h.net_amount < 0).length || 0
  };

  return new Response(
    JSON.stringify({
      success: true,
      history,
      summary
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

function getPlanPrice(tier: string, period: string): number {
  const key = `${tier}_${period}` as keyof typeof PRICING;
  return (PRICING[key] || 14900) / 100;
}

function getStripePriceId(tier: string, period: string): string | null {
  // These would be populated from your Stripe configuration
  const priceIds: Record<string, string> = {
    // starter_monthly: 'price_xxx',
    // starter_annual: 'price_xxx',
    // professional_monthly: 'price_xxx',
    // professional_annual: 'price_xxx',
    // enterprise_monthly: 'price_xxx',
    // enterprise_annual: 'price_xxx'
  };

  const key = `${tier}_${period}`;
  return priceIds[key] || null;
}

function getProrationMessage(proration: ProrationResult): string {
  const { proration_type, net_amount, credit_amount, days_remaining } = proration;

  if (proration_type === 'upgrade') {
    return `You'll be charged ${formatCurrency(net_amount)} today for the upgrade. This includes a credit of ${formatCurrency(credit_amount)} for the ${days_remaining} days remaining on your current plan.`;
  } else if (proration_type === 'downgrade') {
    return `You'll receive a credit of ${formatCurrency(Math.abs(net_amount))} applied to your next billing cycle. Your new plan takes effect immediately.`;
  } else {
    return `Switching to ${proration.new_period} billing. ${net_amount > 0 ? `You'll be charged ${formatCurrency(net_amount)}` : `You'll receive a credit of ${formatCurrency(Math.abs(net_amount))}`}.`;
  }
}

function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount || 0);
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
