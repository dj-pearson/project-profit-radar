// Usage-Based Billing Tracking Edge Function
// Tracks and bills based on usage metrics
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

const logStep = (step: string, details?: Record<string, unknown>) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[USAGE-BILLING] ${step}${detailsStr}`);
};

interface UsageRequest {
  action: 'record' | 'get_usage' | 'get_summary' | 'calculate_bill' | 'generate_invoice' | 'get_limits';
  metric_name?: string;
  metric_value?: number;
  unit_type?: string;
  billing_period_start?: string;
  billing_period_end?: string;
  metadata?: Record<string, unknown>;
}

// Tier limits
const TIER_LIMITS = {
  starter: {
    users: 5,
    projects: 10,
    storage_gb: 10,
    api_calls_monthly: 10000
  },
  professional: {
    users: 20,
    projects: 50,
    storage_gb: 50,
    api_calls_monthly: 100000
  },
  enterprise: {
    users: -1, // unlimited
    projects: -1,
    storage_gb: 500,
    api_calls_monthly: -1
  }
};

// Usage pricing (for overages)
const USAGE_PRICING = {
  users: 10.00, // $10 per additional user
  projects: 5.00, // $5 per additional project
  storage_gb: 2.00, // $2 per GB
  api_calls: 0.001 // $0.001 per API call (1000 = $1)
};

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
      .select('company_id')
      .eq('id', user.id)
      .single();

    if (profileError || !userProfile?.company_id) {
      return errorResponse('User company not found', 404);
    }

    const companyId = userProfile.company_id;

    // Get company's subscription tier
    const { data: company } = await supabaseClient
      .from('companies')
      .select('subscription_tier')
      .eq('id', companyId)
      .single();

    const tier = (company?.subscription_tier as keyof typeof TIER_LIMITS) || 'starter';

    const body: UsageRequest = await req.json();
    const { action } = body;

    logStep('Processing action', { action, companyId, tier });

    switch (action) {
      case 'record':
        return await recordUsage(supabaseClient, companyId, body);

      case 'get_usage':
        return await getUsage(supabaseClient, companyId, body);

      case 'get_summary':
        return await getUsageSummary(supabaseClient, companyId, tier, body);

      case 'calculate_bill':
        return await calculateUsageBill(supabaseClient, companyId, tier, body);

      case 'generate_invoice':
        return await generateUsageInvoice(supabaseClient, companyId, tier, body);

      case 'get_limits':
        return await getLimits(tier);

      default:
        return errorResponse('Invalid action. Use: record, get_usage, get_summary, calculate_bill, generate_invoice, get_limits', 400);
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

async function recordUsage(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  body: UsageRequest
): Promise<Response> {
  const { metric_name, metric_value, unit_type, metadata } = body;

  if (!metric_name || metric_value === undefined || !unit_type) {
    return errorResponse('metric_name, metric_value, and unit_type are required', 400);
  }

  // Get current billing period
  const now = new Date();
  const periodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const { data: record, error } = await supabase
    .from('usage_billing_records')
    .insert({
      company_id: companyId,
      metric_name,
      metric_value,
      unit_type,
      billing_period_start: periodStart.toISOString(),
      billing_period_end: periodEnd.toISOString(),
      metadata
    })
    .select()
    .single();

  if (error) {
    return errorResponse(`Failed to record usage: ${error.message}`, 500);
  }

  // Also update usage_metrics table for dashboard
  await updateUsageMetrics(supabase, companyId, metric_name, metric_value, periodStart, periodEnd);

  logStep('Usage recorded', { metricName: metric_name, value: metric_value });

  return new Response(
    JSON.stringify({
      success: true,
      record,
      message: 'Usage recorded successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function updateUsageMetrics(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  metricName: string,
  metricValue: number,
  periodStart: Date,
  periodEnd: Date
): Promise<void> {
  // Check for existing metric
  const { data: existing } = await supabase
    .from('usage_metrics')
    .select('id, metric_value')
    .eq('company_id', companyId)
    .eq('metric_type', metricName)
    .gte('billing_period_start', periodStart.toISOString())
    .lte('billing_period_end', periodEnd.toISOString())
    .single();

  if (existing) {
    // Update existing
    await supabase
      .from('usage_metrics')
      .update({
        metric_value: existing.metric_value + metricValue,
        recorded_at: new Date().toISOString()
      })
      .eq('id', existing.id);
  } else {
    // Create new
    await supabase
      .from('usage_metrics')
      .insert({
        company_id: companyId,
        metric_type: metricName,
        metric_value: metricValue,
        billing_period_start: periodStart.toISOString(),
        billing_period_end: periodEnd.toISOString()
      });
  }
}

async function getUsage(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  body: UsageRequest
): Promise<Response> {
  const { billing_period_start, billing_period_end, metric_name } = body;

  // Default to current month
  const now = new Date();
  const periodStart = billing_period_start
    ? new Date(billing_period_start)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const periodEnd = billing_period_end
    ? new Date(billing_period_end)
    : new Date(now.getFullYear(), now.getMonth() + 1, 0);

  let query = supabase
    .from('usage_billing_records')
    .select('*')
    .eq('company_id', companyId)
    .gte('billing_period_start', periodStart.toISOString())
    .lte('billing_period_end', periodEnd.toISOString())
    .order('created_at', { ascending: false });

  if (metric_name) {
    query = query.eq('metric_name', metric_name);
  }

  const { data: records, error } = await query;

  if (error) {
    return errorResponse(`Failed to fetch usage: ${error.message}`, 500);
  }

  // Aggregate by metric
  const aggregated: Record<string, { total: number; count: number; unit: string }> = {};
  for (const record of records || []) {
    if (!aggregated[record.metric_name]) {
      aggregated[record.metric_name] = { total: 0, count: 0, unit: record.unit_type };
    }
    aggregated[record.metric_name].total += record.metric_value;
    aggregated[record.metric_name].count++;
  }

  return new Response(
    JSON.stringify({
      success: true,
      records,
      aggregated,
      period: {
        start: periodStart.toISOString(),
        end: periodEnd.toISOString()
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getUsageSummary(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  tier: keyof typeof TIER_LIMITS,
  body: UsageRequest
): Promise<Response> {
  // Get current usage from various tables
  const limits = TIER_LIMITS[tier];

  // Count active users
  const { count: userCount } = await supabase
    .from('user_profiles')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId);

  // Count active projects
  const { count: projectCount } = await supabase
    .from('projects')
    .select('*', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .eq('status', 'active');

  // Get storage usage from usage_metrics
  const { data: storageMetric } = await supabase
    .from('usage_metrics')
    .select('metric_value')
    .eq('company_id', companyId)
    .eq('metric_type', 'storage_gb')
    .order('billing_period_end', { ascending: false })
    .limit(1)
    .single();

  // Get API call count
  const { data: apiMetric } = await supabase
    .from('usage_metrics')
    .select('metric_value')
    .eq('company_id', companyId)
    .eq('metric_type', 'api_calls')
    .order('billing_period_end', { ascending: false })
    .limit(1)
    .single();

  const summary = {
    users: {
      current: userCount || 0,
      limit: limits.users,
      percentage: limits.users === -1 ? 0 : Math.round(((userCount || 0) / limits.users) * 100),
      overage: limits.users === -1 ? 0 : Math.max(0, (userCount || 0) - limits.users)
    },
    projects: {
      current: projectCount || 0,
      limit: limits.projects,
      percentage: limits.projects === -1 ? 0 : Math.round(((projectCount || 0) / limits.projects) * 100),
      overage: limits.projects === -1 ? 0 : Math.max(0, (projectCount || 0) - limits.projects)
    },
    storage_gb: {
      current: storageMetric?.metric_value || 0,
      limit: limits.storage_gb,
      percentage: limits.storage_gb === -1 ? 0 : Math.round(((storageMetric?.metric_value || 0) / limits.storage_gb) * 100),
      overage: limits.storage_gb === -1 ? 0 : Math.max(0, (storageMetric?.metric_value || 0) - limits.storage_gb)
    },
    api_calls: {
      current: apiMetric?.metric_value || 0,
      limit: limits.api_calls_monthly,
      percentage: limits.api_calls_monthly === -1 ? 0 : Math.round(((apiMetric?.metric_value || 0) / limits.api_calls_monthly) * 100),
      overage: limits.api_calls_monthly === -1 ? 0 : Math.max(0, (apiMetric?.metric_value || 0) - limits.api_calls_monthly)
    }
  };

  // Calculate overage costs
  const overageCosts = {
    users: summary.users.overage * USAGE_PRICING.users,
    projects: summary.projects.overage * USAGE_PRICING.projects,
    storage_gb: summary.storage_gb.overage * USAGE_PRICING.storage_gb,
    api_calls: summary.api_calls.overage * USAGE_PRICING.api_calls,
    total: 0
  };
  overageCosts.total = overageCosts.users + overageCosts.projects +
                       overageCosts.storage_gb + overageCosts.api_calls;

  return new Response(
    JSON.stringify({
      success: true,
      tier,
      summary,
      overage_costs: overageCosts,
      limits
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function calculateUsageBill(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  tier: keyof typeof TIER_LIMITS,
  body: UsageRequest
): Promise<Response> {
  const summaryResponse = await getUsageSummary(supabase, companyId, tier, body);
  const summaryData = await summaryResponse.json();

  if (!summaryData.success) {
    return summaryResponse;
  }

  const { summary, overage_costs } = summaryData;

  // Get base subscription price
  const basePrices = {
    starter: 149,
    professional: 299,
    enterprise: 599
  };

  const basePrice = basePrices[tier];
  const totalBill = basePrice + overage_costs.total;

  const bill = {
    billing_period: {
      start: new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString(),
      end: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).toISOString()
    },
    line_items: [
      {
        description: `${capitalize(tier)} Plan - Monthly Subscription`,
        quantity: 1,
        unit_price: basePrice,
        total: basePrice
      }
    ],
    subtotal: basePrice,
    overages: [] as { description: string; quantity: number; unit_price: number; total: number }[],
    overage_total: overage_costs.total,
    total: totalBill
  };

  // Add overage line items
  if (summary.users.overage > 0) {
    bill.overages.push({
      description: 'Additional Users',
      quantity: summary.users.overage,
      unit_price: USAGE_PRICING.users,
      total: overage_costs.users
    });
  }

  if (summary.projects.overage > 0) {
    bill.overages.push({
      description: 'Additional Projects',
      quantity: summary.projects.overage,
      unit_price: USAGE_PRICING.projects,
      total: overage_costs.projects
    });
  }

  if (summary.storage_gb.overage > 0) {
    bill.overages.push({
      description: 'Additional Storage (GB)',
      quantity: summary.storage_gb.overage,
      unit_price: USAGE_PRICING.storage_gb,
      total: overage_costs.storage_gb
    });
  }

  if (summary.api_calls.overage > 0) {
    bill.overages.push({
      description: 'Additional API Calls',
      quantity: summary.api_calls.overage,
      unit_price: USAGE_PRICING.api_calls,
      total: overage_costs.api_calls
    });
  }

  return new Response(
    JSON.stringify({
      success: true,
      bill,
      summary: {
        base_subscription: formatCurrency(basePrice),
        overage_charges: formatCurrency(overage_costs.total),
        total_due: formatCurrency(totalBill)
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function generateUsageInvoice(
  supabase: ReturnType<typeof createClient>,
  companyId: string,
  tier: keyof typeof TIER_LIMITS,
  body: UsageRequest
): Promise<Response> {
  const billResponse = await calculateUsageBill(supabase, companyId, tier, body);
  const billData = await billResponse.json();

  if (!billData.success) {
    return billResponse;
  }

  const { bill } = billData;

  // Create invoice
  const invoiceNumber = `INV-USAGE-${Date.now()}`;

  const { data: invoice, error } = await supabase
    .from('invoices')
    .insert({
      company_id: companyId,
      invoice_number: invoiceNumber,
      invoice_type: 'usage_billing',
      status: 'draft',
      subtotal: bill.subtotal + bill.overage_total,
      total_amount: bill.total,
      due_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      notes: 'Usage-based billing invoice'
    })
    .select()
    .single();

  if (error) {
    return errorResponse(`Failed to create invoice: ${error.message}`, 500);
  }

  // Create line items
  const lineItems = [
    ...bill.line_items,
    ...bill.overages
  ].map((item, index) => ({
    invoice_id: invoice.id,
    description: item.description,
    quantity: item.quantity,
    unit_price: item.unit_price,
    total: item.total,
    line_order: index
  }));

  if (lineItems.length > 0) {
    await supabase.from('invoice_line_items').insert(lineItems);
  }

  // Mark usage records as billed
  const periodStart = new Date(bill.billing_period.start);
  const periodEnd = new Date(bill.billing_period.end);

  await supabase
    .from('usage_billing_records')
    .update({
      billed: true,
      invoice_id: invoice.id,
      billed_at: new Date().toISOString()
    })
    .eq('company_id', companyId)
    .gte('billing_period_start', periodStart.toISOString())
    .lte('billing_period_end', periodEnd.toISOString())
    .eq('billed', false);

  logStep('Usage invoice generated', { invoiceId: invoice.id, total: bill.total });

  return new Response(
    JSON.stringify({
      success: true,
      invoice,
      bill,
      message: 'Usage invoice generated successfully'
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
}

async function getLimits(tier: keyof typeof TIER_LIMITS): Promise<Response> {
  const limits = TIER_LIMITS[tier];
  const pricing = USAGE_PRICING;

  return new Response(
    JSON.stringify({
      success: true,
      tier,
      limits: {
        users: limits.users === -1 ? 'Unlimited' : limits.users,
        projects: limits.projects === -1 ? 'Unlimited' : limits.projects,
        storage_gb: limits.storage_gb === -1 ? 'Unlimited' : `${limits.storage_gb} GB`,
        api_calls_monthly: limits.api_calls_monthly === -1 ? 'Unlimited' : limits.api_calls_monthly.toLocaleString()
      },
      overage_pricing: {
        users: `${formatCurrency(pricing.users)}/user`,
        projects: `${formatCurrency(pricing.projects)}/project`,
        storage_gb: `${formatCurrency(pricing.storage_gb)}/GB`,
        api_calls: `${formatCurrency(pricing.api_calls * 1000)}/1000 calls`
      }
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
  );
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
