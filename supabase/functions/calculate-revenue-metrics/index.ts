// Calculate revenue metrics from Stripe data
// Runs daily to update MRR, ARR, churn, and other revenue operations metrics
// Runs as cron job - processes all sites

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Stripe from "https://esm.sh/stripe@14.5.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RevenueMetrics {
  periodStart: Date;
  periodEnd: Date;
  mrr: number;
  arr: number;
  newRevenue: number;
  expansionRevenue: number;
  contractionRevenue: number;
  churnedRevenue: number;
  netRevenueRetention: number;
  logoChurnRate: number;
  revenueChurnRate: number;
  totalCustomers: number;
  newCustomers: number;
  churnedCustomers: number;
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Create Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    console.log("[CALCULATE-REVENUE-METRICS] Starting revenue metrics calculation...");

    // Get all active sites for multi-tenant processing
    const { data: sites, error: sitesError } = await supabase
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    console.log("[CALCULATE-REVENUE-METRICS] Processing all active sites", { siteCount: sites?.length || 0 });

    const allResults = {
      sites_processed: 0,
      total_mrr: 0,
      total_arr: 0
    };

    for (const site of sites || []) {
      console.log(`[CALCULATE-REVENUE-METRICS] Processing site`, { siteId: site.id, siteKey: site.key });

      // Get Stripe key from database for this site
      const { data: stripeData, error: stripeError } = await supabase
        .from("stripe_keys")
        .select("secret_key")
        .eq("site_id", site.id)  // CRITICAL: Site isolation
        .single();

      if (stripeError || !stripeData?.secret_key) {
        console.log(`[CALCULATE-REVENUE-METRICS] No Stripe key for site ${site.id}, skipping`);
        continue;
      }

      const stripe = new Stripe(stripeData.secret_key, {
        apiVersion: "2023-10-16",
      });

      // Calculate metrics for current month
      const now = new Date();
      const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
      const currentMonthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

      // Calculate metrics for previous month (for comparison)
      const previousMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const previousMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);

      const currentMetrics = await calculateMetricsForPeriod(
        stripe,
        supabase,
        site.id,
        currentMonthStart,
        currentMonthEnd
      );

      const previousMetrics = await calculateMetricsForPeriod(
        stripe,
        supabase,
        site.id,
        previousMonthStart,
        previousMonthEnd
      );

      // Calculate NRR (Net Revenue Retention)
      const nrr = calculateNRR(currentMetrics, previousMetrics);

      // Save to database with site isolation
      const { error: insertError } = await supabase
        .from("revenue_metrics")
        .upsert({
          site_id: site.id,  // CRITICAL: Site isolation
          period_start: currentMonthStart.toISOString().split("T")[0],
          period_end: currentMonthEnd.toISOString().split("T")[0],
          mrr: currentMetrics.mrr,
          arr: currentMetrics.arr,
          new_revenue: currentMetrics.newRevenue,
          expansion_revenue: currentMetrics.expansionRevenue,
          contraction_revenue: currentMetrics.contractionRevenue,
          churned_revenue: currentMetrics.churnedRevenue,
          net_revenue_retention: nrr,
          logo_churn_rate: currentMetrics.logoChurnRate,
          revenue_churn_rate: currentMetrics.revenueChurnRate,
          total_customers: currentMetrics.totalCustomers,
          new_customers: currentMetrics.newCustomers,
          churned_customers: currentMetrics.churnedCustomers,
        }, {
          onConflict: 'site_id,period_start,period_end'
        });

      if (insertError) {
        console.error(`[CALCULATE-REVENUE-METRICS] Error saving metrics for site ${site.id}:`, insertError);
        continue;
      }

      allResults.sites_processed++;
      allResults.total_mrr += currentMetrics.mrr;
      allResults.total_arr += currentMetrics.arr;

      console.log(`[CALCULATE-REVENUE-METRICS] Site ${site.key} metrics calculated:`, { mrr: currentMetrics.mrr, arr: currentMetrics.arr });
    }

    console.log("[CALCULATE-REVENUE-METRICS] All sites processed", allResults);

    return new Response(
      JSON.stringify({
        success: true,
        results: allResults,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("[CALCULATE-REVENUE-METRICS] Error:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      }
    );
  }
});

async function calculateMetricsForPeriod(
  stripe: Stripe,
  supabase: any,
  siteId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<RevenueMetrics> {
  // Get all subscriptions from database with site isolation
  const { data: companies, error: companiesError } = await supabase
    .from("companies")
    .select("*")
    .eq("site_id");  // CRITICAL: Site isolation

  if (companiesError) throw companiesError;

  let mrr = 0;
  let newRevenue = 0;
  let expansionRevenue = 0;
  let contractionRevenue = 0;
  let churnedRevenue = 0;
  let totalCustomers = 0;
  let newCustomers = 0;
  let churnedCustomers = 0;

  const previousMonthMRR = new Map<string, number>(); // Track previous subscription amounts

  for (const company of companies) {
    if (!company.stripe_subscription_id) continue;

    try {
      // Get subscription from Stripe
      const subscription = await stripe.subscriptions.retrieve(
        company.stripe_subscription_id,
        {
          expand: ["items.data.price"],
        }
      );

      // Calculate MRR for this subscription
      let subscriptionMRR = 0;
      for (const item of subscription.items.data) {
        const price = item.price;
        const amount = price.unit_amount || 0;
        const quantity = item.quantity || 1;

        // Convert to monthly if needed
        let monthlyAmount = (amount / 100) * quantity; // Convert from cents
        if (price.recurring?.interval === "year") {
          monthlyAmount = monthlyAmount / 12;
        }

        subscriptionMRR += monthlyAmount;
      }

      // Check subscription status
      const isActive = subscription.status === "active";
      const isCanceled = subscription.status === "canceled" || subscription.cancel_at_period_end;

      if (isActive) {
        mrr += subscriptionMRR;
        totalCustomers++;

        // Check if this is a new customer (created in this period)
        const createdDate = new Date(subscription.created * 1000);
        if (createdDate >= periodStart && createdDate <= periodEnd) {
          newRevenue += subscriptionMRR;
          newCustomers++;
        }

        // Check for expansion or contraction
        // This would require tracking previous subscription amounts
        // For now, we'll use a simplified approach
        const previousAmount = previousMonthMRR.get(company.id) || 0;
        if (previousAmount > 0) {
          const difference = subscriptionMRR - previousAmount;
          if (difference > 0) {
            expansionRevenue += difference;
          } else if (difference < 0) {
            contractionRevenue += Math.abs(difference);
          }
        }
      }

      if (isCanceled) {
        const canceledDate = new Date((subscription.canceled_at || subscription.cancel_at || 0) * 1000);
        if (canceledDate >= periodStart && canceledDate <= periodEnd) {
          churnedRevenue += subscriptionMRR;
          churnedCustomers++;
        }
      }

      previousMonthMRR.set(company.id, subscriptionMRR);
    } catch (error) {
      console.error(`Error processing subscription for company ${company.id}:`, error);
      // Continue with next company
    }
  }

  // Calculate churn rates
  const logoChurnRate = totalCustomers > 0
    ? (churnedCustomers / totalCustomers) * 100
    : 0;

  const beginningMRR = mrr - newRevenue + churnedRevenue + contractionRevenue - expansionRevenue;
  const revenueChurnRate = beginningMRR > 0
    ? (churnedRevenue / beginningMRR) * 100
    : 0;

  return {
    periodStart,
    periodEnd,
    mrr: Math.round(mrr * 100) / 100,
    arr: Math.round(mrr * 12 * 100) / 100,
    newRevenue: Math.round(newRevenue * 100) / 100,
    expansionRevenue: Math.round(expansionRevenue * 100) / 100,
    contractionRevenue: Math.round(contractionRevenue * 100) / 100,
    churnedRevenue: Math.round(churnedRevenue * 100) / 100,
    netRevenueRetention: 0, // Calculated separately
    logoChurnRate: Math.round(logoChurnRate * 100) / 100,
    revenueChurnRate: Math.round(revenueChurnRate * 100) / 100,
    totalCustomers,
    newCustomers,
    churnedCustomers,
  };
}

function calculateNRR(
  currentMetrics: RevenueMetrics,
  previousMetrics: RevenueMetrics
): number {
  // NRR = (Starting MRR + Expansion - Contraction - Churn) / Starting MRR * 100
  const startingMRR = previousMetrics.mrr;

  if (startingMRR === 0) return 100;

  const endingMRR =
    startingMRR +
    currentMetrics.expansionRevenue -
    currentMetrics.contractionRevenue -
    currentMetrics.churnedRevenue;

  const nrr = (endingMRR / startingMRR) * 100;

  return Math.round(nrr * 100) / 100;
}
