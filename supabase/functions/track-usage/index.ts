import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Usage tracking request received");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("No authorization header provided");
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user) throw new Error("User not authenticated");

    const { metric_type, metric_value, company_id, user_id }: UsageTrackingRequest = await req.json();
    
    if (!metric_type || metric_value === undefined) {
      throw new Error("metric_type and metric_value are required");
    }

    logStep("Tracking usage", { metric_type, metric_value, company_id, user_id });

    // Get current billing period (start of month to end of month)
    const now = new Date();
    const billingPeriodStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const billingPeriodEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    // Determine the target company_id and user_id
    let targetCompanyId = company_id;
    let targetUserId = user_id || user.id;

    if (!targetCompanyId) {
      // Get user's company from profile
      const { data: profile } = await supabaseClient
        .from("user_profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();
      
      if (profile?.company_id) {
        targetCompanyId = profile.company_id;
      }
    }

    if (!targetCompanyId) {
      throw new Error("Could not determine company_id for usage tracking");
    }

    // Check if usage record exists for this period
    const { data: existingUsage } = await supabaseClient
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
      
      await supabaseClient
        .from("usage_metrics")
        .update({
          metric_value: newValue,
          updated_at: new Date().toISOString()
        })
        .eq("id", existingUsage.id);

      logStep("Updated existing usage record", { id: existingUsage.id, newValue });
    } else {
      // Create new record
      const { data: newUsage } = await supabaseClient
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

      logStep("Created new usage record", { id: newUsage?.id });
    }

    // Check for usage alerts/limits
    await checkUsageAlerts(targetCompanyId, metric_type, supabaseClient);

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