// Track Usage Edge Function
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse } from '../_shared/auth-helpers.ts';
import { createServiceClient } from '../_shared/service-client.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

interface UsageTrackingRequest {
  metric_type: string;
  metric_value: number;
  company_id?: string;
  user_id?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRACK-USAGE] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Usage tracking request received");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401);
    }

    const { user, supabase: supabaseClient } = authContext;
    logStep("User authenticated", { userId: user.id });

    const { metric_type, metric_value, company_id, user_id }: UsageTrackingRequest = await req.json();
    
    if (!metric_type || metric_value === undefined) {
      throw new Error("metric_type and metric_value are required");
    }

    logStep("Tracking usage", {  metric_type, metric_value, company_id, user_id });

    // Get current billing period (start of month to end of month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // SECURITY: company_id and user_id used to be taken from the body when
    // present, and usage_metrics carries a "System can manage usage metrics"
    // FOR ALL USING (true) policy (see the US-237 backlog), so RLS does not
    // scope writes to the caller's company. Any authenticated user could
    // therefore book usage against any company — and usage_metrics feeds
    // usage-billing/generate-usage-invoice. Both are now derived from the
    // caller's own profile; the body fields are only logged when they disagree.
    const { data: profile } = await supabaseClient
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .single();

    const targetCompanyId = profile?.company_id;
    const targetUserId = user.id;

    if (!targetCompanyId) {
      throw new Error("Could not determine company_id for usage tracking");
    }

    // usage_metrics has exactly two policies: a company-scoped SELECT, and the
    // permissive "System can manage usage metrics" FOR ALL USING (true).
    // US-237's migration 20260712120000 scopes that second one to service_role
    // — after which a user-JWT client has NO write path to this table at all,
    // and both writes below discarded their error, so the failure would have
    // been silent and usage simply stopped recording. The caller is already
    // authorised above (company comes from their own profile), so the metric
    // write runs on the service role and works either side of that migration.
    const serviceClient = createServiceClient();

    if (company_id && company_id !== targetCompanyId) {
      logStep("Ignoring caller-supplied company_id", {
        claimed: company_id, actual: targetCompanyId, userId: user.id
      });
    }
    if (user_id && user_id !== targetUserId) {
      logStep("Ignoring caller-supplied user_id", { claimed: user_id, actual: targetUserId });
    }

    // Check if usage record exists for this period
    const { data: existingUsage } = await serviceClient
      .from("usage_metrics")
      .select("*")
      .eq("company_id", targetCompanyId)
      .eq("user_id", targetUserId)
      .eq("metric_type", metric_type)
      .eq("billing_period_start", billingPeriodStart.toISOString().split('T')[0])
      .eq("billing_period_end", billingPeriodEnd.toISOString().split('T')[0])
      .single();

    if (existingUsage) {
      // Update existing record
      const newValue = parseFloat(existingUsage.metric_value) + metric_value;

      const { error: updateError } = await serviceClient
        .from("usage_metrics")
        .update({
          metric_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingUsage.id);

      if (updateError) {
        logStep("Failed to update usage record", { id: existingUsage.id, error: updateError.message });
        throw new Error(`Failed to record usage: ${updateError.message}`);
      }

      logStep("Updated existing usage record", { id: existingUsage.id, newValue });
    } else {
      // Create new record
      const { data: newUsage, error: insertError } = await serviceClient
        .from("usage_metrics")
        .insert({
          company_id: targetCompanyId,
          user_id: targetUserId,
          metric_type,
          metric_value,
          billing_period_start: billingPeriodStart.toISOString().split('T')[0],
          billing_period_end: billingPeriodEnd.toISOString().split('T')[0]
        })
        .select()
        .single();

      if (insertError) {
        logStep("Failed to create usage record", { error: insertError.message });
        throw new Error(`Failed to record usage: ${insertError.message}`);
      }

      logStep("Created new usage record", { id: newUsage?.id });
    }

    // Check for usage alerts/limits
    await checkUsageAlerts(targetCompanyId, metric_type, serviceClient);

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in track-usage", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function checkUsageAlerts(companyId: string, metricType: string, supabaseClient: any) {
  // Get company subscription tier to determine limits
  const { data: company } = await supabaseClient
    .from("companies")
    .select("subscription_tier")
    .eq("id", companyId)
    .single();

  if (!company) return;

  // Define usage limits per tier
  const usageLimits: Record<string, Record<string, number>> = {
    starter: {
      api_calls: 1000,
      storage_gb: 5,
      projects: 3,
      users: 5
    },
    professional: {
      api_calls: 10000,
      storage_gb: 50,
      projects: 25,
      users: 25
    },
    enterprise: {
      api_calls: 100000,
      storage_gb: 500,
      projects: 100,
      users: 100
    }
  };

  const tier = company.subscription_tier || 'starter';
  const limit = usageLimits[tier]?.[metricType];

  if (!limit) return;

  // Get current period usage
  const now = new Date();
  const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

  const { data: usage } = await supabaseClient
    .from("usage_metrics")
    .select("metric_value")
    .eq("company_id", companyId)
    .eq("metric_type", metricType)
    .eq("billing_period_start", billingPeriodStart.toISOString().split('T')[0])
    .eq("billing_period_end", billingPeriodEnd.toISOString().split('T')[0]);

  if (usage && usage.length > 0) {
    const totalUsage = usage.reduce((sum: number, record: any) => sum + parseFloat(record.metric_value), 0);
    const usagePercentage = (totalUsage / limit) * 100;

    if (usagePercentage >= 90) {
      logStep("Usage alert triggered", { 
        companyId, 
        metricType, 
        totalUsage, 
        limit, 
        usagePercentage: usagePercentage.toFixed(2) 
      });
      
      // Could trigger notifications here
      // await supabase.functions.invoke('send-usage-alert', {
      //   body: { companyId, metricType, totalUsage, limit, usagePercentage }
      // });
    }
  }
}