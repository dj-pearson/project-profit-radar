// Process Expiring Complimentary Subscriptions Edge Function
// Runs as cron job - processes all sites
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[PROCESS-EXPIRING-COMPLIMENTARY] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Processing expiring complimentary subscriptions");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get all active sites for multi-tenant processing
    const { data: sites, error: sitesError } = await supabaseClient
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    logStep("Processing all active sites", { siteCount: sites?.length || 0 });

    const now = new Date();
    let totalProcessed = 0;
    let totalErrors = 0;
    const allResults: any[] = [];

    for (const site of sites || []) {
      logStep(`Processing site`, { siteId: site.id, siteKey: site.key });

      // Find all expiring complimentary subscriptions for this site
      const { data: expiringSubscriptions, error: fetchError } = await supabaseClient
        .from('subscribers')
        .select(`
          id,
          user_id,
          email,
          complimentary_expires_at,
          complimentary_type,
          subscription_tier
        `)
        .eq('site_id', site.id)  // CRITICAL: Site isolation
        .eq('is_complimentary', true)
        .not('complimentary_expires_at', 'is', null)
        .lte('complimentary_expires_at', now.toISOString());

      if (fetchError) {
        logStep(`Error fetching subscriptions for site ${site.key}`, { error: fetchError.message });
        continue;
      }

      if (!expiringSubscriptions || expiringSubscriptions.length === 0) {
        logStep(`No expiring subscriptions for site ${site.key}`);
        continue;
      }

      logStep(`Found ${expiringSubscriptions.length} expiring subscriptions for site ${site.key}`);

      for (const subscription of expiringSubscriptions) {
        try {
          // Update subscriber to remove complimentary status with site isolation
          const { error: updateError } = await supabaseClient
            .from('subscribers')
            .update({
              subscribed: false,
              is_complimentary: false,
              complimentary_type: null,
              complimentary_granted_by: null,
              complimentary_granted_at: null,
              complimentary_expires_at: null,
              complimentary_reason: null,
              subscription_tier: null,
              updated_at: now.toISOString()
            })
            .eq('site_id', site.id)  // CRITICAL: Site isolation
            .eq('id', subscription.id);

          if (updateError) {
            throw new Error(`Failed to update subscriber ${subscription.id}: ${updateError.message}`);
          }

          // Update history to mark as expired with site isolation
          const { error: historyError } = await supabaseClient
            .from('complimentary_subscription_history')
            .update({
              status: 'expired'
            })
            .eq('site_id', site.id)  // CRITICAL: Site isolation
            .eq('subscriber_id', subscription.id)
            .eq('status', 'active');

          if (historyError) {
            logStep(`Warning: Failed to update history for ${subscription.id}`, { error: historyError.message });
          }

          totalProcessed++;
          allResults.push({
            siteId: site.id,
            siteKey: site.key,
            email: subscription.email,
            status: 'expired',
            expired_at: now.toISOString()
          });

          logStep(`Processed expiring subscription for ${subscription.email} in site ${site.key}`);

        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : String(error);
          logStep(`Error processing subscription for ${subscription.email}`, { error: errorMessage });
          totalErrors++;
          allResults.push({
            siteId: site.id,
            siteKey: site.key,
            email: subscription.email,
            status: 'error',
            error: errorMessage
          });
        }
      }
    }

    logStep(`Processing complete across all sites`, {
      sites_processed: sites?.length || 0,
      total_processed: totalProcessed,
      total_errors: totalErrors
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Processed ${totalProcessed} expiring complimentary subscriptions across all sites`,
      sites_processed: sites?.length || 0,
      processed: totalProcessed,
      errors: totalErrors,
      results: allResults
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({
      success: false,
      error: errorMessage
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});