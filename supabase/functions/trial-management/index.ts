// Trial Management Edge Function
// Runs as cron job - processes all sites
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIAL-MANAGEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Trial management process started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { 
      apiVersion: "2023-10-16" 
    });

    const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);

    // Get all active sites for multi-tenant processing
    const { data: sites, error: sitesError } = await supabaseClient
      .from("sites")
      .select("id, key, name")
      .eq("is_active", true);

    if (sitesError) {
      throw new Error(`Error fetching sites: ${sitesError.message}`);
    }

    logStep("Processing trial management for sites", { siteCount: sites?.length || 0 });

    const results = {
      warnings_sent: 0,
      conversions_attempted: 0,
      expired_trials: 0,
      grace_periods_activated: 0,
      sites_processed: 0
    };

    // Process each site
    for (const site of sites || []) {
      logStep(`Processing site: ${site.key}`, { siteId: site.id });

      // Get companies with trials ending soon or expired for this site
      const { data: companiesData, error: companiesError } = await supabaseClient
        .from("companies")
        .select(`
          id, name, trial_end_date, subscription_status, site_id,
          user_profiles!inner(id, email, first_name, last_name, role)
        `)
        .eq("site_id", site.id)  // CRITICAL: Site isolation
        .eq("subscription_status", "trial")
        .lte("trial_end_date", threeDaysFromNow.toISOString())
        .eq("user_profiles.role", "admin");

      if (companiesError) {
        logStep(`Error fetching companies for site ${site.key}`, { error: companiesError.message });
        continue;
      }

      logStep(`Found companies with trials ending soon for ${site.key}`, { count: companiesData?.length || 0 });

    for (const company of companiesData || []) {
      try {
        const trialEndDate = new Date(company.trial_end_date);
        const admin = company.user_profiles[0];

        logStep("Processing company", { 
          companyId: company.id, 
          trialEndDate: trialEndDate.toISOString(),
          adminEmail: admin.email 
        });

        if (trialEndDate <= today) {
          // Trial has expired - activate grace period or suspend
          const gracePeriodEnd = new Date(trialEndDate.getTime() + 7 * 24 * 60 * 60 * 1000);

          if (today <= gracePeriodEnd) {
            // Still in grace period - with site isolation
            await supabaseClient
              .from("companies")
              .update({
                subscription_status: "grace_period",
                updated_at: new Date().toISOString()
              })
              .eq("site_id", site.id)  // CRITICAL: Site isolation
              .eq("id", company.id);

            // Send grace period email
            await sendGracePeriodEmail(resend, admin, company, gracePeriodEnd);
            results.grace_periods_activated++;

            logStep("Activated grace period", { companyId: company.id, siteId: site.id });
          } else {
            // Grace period expired - suspend account - with site isolation
            await supabaseClient
              .from("companies")
              .update({
                subscription_status: "suspended",
                updated_at: new Date().toISOString()
              })
              .eq("site_id", site.id)  // CRITICAL: Site isolation
              .eq("id", company.id);

            await sendTrialExpiredEmail(resend, admin, company);
            results.expired_trials++;

            logStep("Trial expired and suspended", { companyId: company.id, siteId: site.id });
          }
        } else if (trialEndDate <= oneDayFromNow) {
          // Send 1-day warning
          await sendTrialExpirationWarning(resend, admin, company, trialEndDate, "1-day");
          results.warnings_sent++;
          
          logStep("Sent 1-day warning", { companyId: company.id });
        } else if (trialEndDate <= threeDaysFromNow) {
          // Send 3-day warning
          await sendTrialExpirationWarning(resend, admin, company, trialEndDate, "3-day");
          results.warnings_sent++;
          
          logStep("Sent 3-day warning", { companyId: company.id });
        }

      } catch (error) {
        const errorObj = error as Error;
        logStep("Error processing company", {
          companyId: company.id,
          error: errorObj.message
        });
      }
    }

      results.sites_processed++;
    }  // End of sites loop

    logStep("Trial management completed", results);

    return new Response(JSON.stringify({ 
      success: true, 
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in trial-management", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendTrialExpirationWarning(
  resend: any,
  admin: any,
  company: any,
  trialEndDate: Date,
  warningType: string
) {
  const daysLeft = warningType === "1-day" ? 1 : 3;
  
  await resend.emails.send({
    from: "Build Desk <notifications@builddesk.app>",
    to: [admin.email],
    subject: `Your Build Desk trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Trial Expiring Soon</h2>
        <p>Hi ${admin.first_name || 'there'},</p>
        <p>Your Build Desk trial for <strong>${company.name}</strong> will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''} on ${trialEndDate.toLocaleDateString()}.</p>
        <p>To continue using all Build Desk features, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/subscription" 
             style="background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        <p>Need help? Reply to this email and our team will assist you.</p>
        <p>Best regards,<br>The Build Desk Team</p>
      </div>
    `,
  });
}

async function sendGracePeriodEmail(
  resend: any,
  admin: any,
  company: any,
  gracePeriodEnd: Date
) {
  await resend.emails.send({
    from: "Build Desk <notifications@builddesk.app>",
    to: [admin.email],
    subject: "Build Desk Trial Expired - 7-Day Grace Period Active",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Trial Expired - Grace Period Active</h2>
        <p>Hi ${admin.first_name || 'there'},</p>
        <p>Your Build Desk trial for <strong>${company.name}</strong> has expired, but we've activated a 7-day grace period.</p>
        <p><strong>Grace period ends:</strong> ${gracePeriodEnd.toLocaleDateString()}</p>
        <p>During this time, you can still access your account, but some features may be limited. To restore full access, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/subscription" 
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        <p>If you don't upgrade by ${gracePeriodEnd.toLocaleDateString()}, your account will be suspended.</p>
        <p>Best regards,<br>The Build Desk Team</p>
      </div>
    `,
  });
}

async function sendTrialExpiredEmail(
  resend: any,
  admin: any,
  company: any
) {
  await resend.emails.send({
    from: "Build Desk <notifications@builddesk.app>",
    to: [admin.email],
    subject: "Build Desk Account Suspended - Trial and Grace Period Expired",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Suspended</h2>
        <p>Hi ${admin.first_name || 'there'},</p>
        <p>Your Build Desk account for <strong>${company.name}</strong> has been suspended because both your trial and grace period have expired.</p>
        <p>Your data is safe and will be preserved for 30 days. To reactivate your account and restore full access, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://your-domain.com/subscription" 
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reactivate Account
          </a>
        </div>
        <p>Need help? Reply to this email and our team will assist you.</p>
        <p>Best regards,<br>The Build Desk Team</p>
      </div>
    `,
  });
}