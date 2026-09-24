// Trial Management Edge Function
// Runs as cron job - processes all sites
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { requireSystemOrAdmin } from "../_shared/system-auth.ts";
import { GRACE_PERIOD_DAYS } from "../_shared/tiers.ts";
import { captureException } from '../_shared/observability.ts';
import { sendEmail, emailIdempotencyKey } from '../_shared/ses-email-service.ts';
import { escapeHtml } from '../_shared/html-escape.ts';
import { siteUrl } from '../_shared/app-urls.ts';

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[TRIAL-MANAGEMENT] ${step}${detailsStr}`);
};

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const denied = await requireSystemOrAdmin(req);
  if (denied) return denied;

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

    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    const oneDayFromNow = new Date(today.getTime() + 1 * 24 * 60 * 60 * 1000);

    const results = {
      warnings_sent: 0,
      conversions_attempted: 0,
      expired_trials: 0,
      grace_periods_activated: 0
    };

    // Get companies with trials ending soon or expired.
    //
    // grace_period is included (US-335): this used to select only 'trial', so
    // the run that moved a company to grace_period was the last run that ever
    // saw it, and the "suspended a week later" branch below was unreachable.
    // Only trials that never converted - no Stripe subscription - are picked
    // up in grace_period: stripe-webhook also writes grace_period for a
    // past_due payment, and a paying company's trial_end_date is long past,
    // so without that filter this would suspend paying customers whose card
    // failed once. Their suspension belongs to Stripe and process-dunning.
    const { data: companiesData, error: companiesError } = await supabaseClient
      .from("companies")
      .select(`
        id, name, trial_end_date, subscription_status, stripe_subscription_id,
        user_profiles!inner(id, email, first_name, last_name, role)
      `)
      .in("subscription_status", ["trial", "grace_period"])
      .is("stripe_subscription_id", null)
      .lte("trial_end_date", threeDaysFromNow.toISOString())
      .eq("user_profiles.role", "admin");

    if (companiesError) {
      throw new Error(`Error fetching companies: ${companiesError.message}`);
    }

    logStep("Found companies with trials ending soon", { count: companiesData?.length || 0 });

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
          const gracePeriodEnd = new Date(trialEndDate.getTime() + GRACE_PERIOD_DAYS * 24 * 60 * 60 * 1000);

          if (today <= gracePeriodEnd) {
            // Already moved on an earlier run: nothing to write, and the grace
            // email went out then. Without this, including grace_period in
            // the query above would email the admin every day of the week.
            if (company.subscription_status === "grace_period") continue;

            // Still in grace period
            const { error: updateCompaniesError } = await supabaseClient
              .from("companies")
              .update({
                subscription_status: "grace_period",
                updated_at: new Date().toISOString()
              })
              .eq("id", company.id);
            if (updateCompaniesError) {
              console.error(`[companies] update failed`, updateCompaniesError);
            }

            // Send grace period email
            await sendGracePeriodEmail(admin, company, gracePeriodEnd);
            results.grace_periods_activated++;

            logStep("Activated grace period", { companyId: company.id });
          } else {
            // Grace period expired - suspend account
            const { error: updateCompaniesError } = await supabaseClient
              .from("companies")
              .update({
                subscription_status: "suspended",
                updated_at: new Date().toISOString()
              })
              .eq("id", company.id);
            if (updateCompaniesError) {
              console.error(`[companies] update failed`, updateCompaniesError);
            }

            await sendTrialExpiredEmail(admin, company);
            results.expired_trials++;

            logStep("Trial expired and suspended", { companyId: company.id });
          }
        } else if (trialEndDate <= oneDayFromNow) {
          // Send 1-day warning
          await sendTrialExpirationWarning(admin, company, trialEndDate, "1-day");
          results.warnings_sent++;
          
          logStep("Sent 1-day warning", { companyId: company.id });
        } else if (trialEndDate <= threeDaysFromNow) {
          // Send 3-day warning
          await sendTrialExpirationWarning(admin, company, trialEndDate, "3-day");
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

    logStep("Trial management completed", results);

    return new Response(JSON.stringify({
      timestamp: new Date().toISOString(), 
      success: true, 
      results 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    await captureException(error, { fn: 'trial-management', req });
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in trial-management", { message: errorMessage });
    return new Response(JSON.stringify({ success: false, timestamp: new Date().toISOString(), error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

async function sendTrialExpirationWarning(
  admin: any,
  company: any,
  trialEndDate: Date,
  warningType: string
) {
  const daysLeft = warningType === "1-day" ? 1 : 3;
  
  await deliverTrialEmail(admin, company, {
    template: `trial_warning_${warningType}`,
    occasion: [warningType, company.trial_end_date],
    subject: `Your Brikly trial expires in ${daysLeft} day${daysLeft > 1 ? 's' : ''}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f97316;">Trial Expiring Soon</h2>
        <p>Hi ${escapeHtml(admin.first_name || 'there')},</p>
        <p>Your Brikly trial for <strong>${escapeHtml(company.name ?? '')}</strong> will expire in ${daysLeft} day${daysLeft > 1 ? 's' : ''} on ${trialEndDate.toLocaleDateString()}.</p>
        <p>To continue using all Brikly features, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl()}/subscription" 
             style="background-color: #f97316; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        <p>Need help? Reply to this email and our team will assist you.</p>
        <p>Best regards,<br>The Brikly Team</p>
      </div>
    `,
  });
}

async function sendGracePeriodEmail(
  admin: any,
  company: any,
  gracePeriodEnd: Date
) {
  await deliverTrialEmail(admin, company, {
    template: 'trial_grace_period',
    occasion: ['grace_period', company.trial_end_date],
    subject: "Brikly Trial Expired - 7-Day Grace Period Active",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Trial Expired - Grace Period Active</h2>
        <p>Hi ${escapeHtml(admin.first_name || 'there')},</p>
        <p>Your Brikly trial for <strong>${escapeHtml(company.name ?? '')}</strong> has expired, but we've activated a 7-day grace period.</p>
        <p><strong>Grace period ends:</strong> ${gracePeriodEnd.toLocaleDateString()}</p>
        <p>During this time, you can still access your account, but some features may be limited. To restore full access, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl()}/subscription" 
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Upgrade Now
          </a>
        </div>
        <p>If you don't upgrade by ${gracePeriodEnd.toLocaleDateString()}, your account will be suspended.</p>
        <p>Best regards,<br>The Brikly Team</p>
      </div>
    `,
  });
}

async function sendTrialExpiredEmail(
  admin: any,
  company: any
) {
  await deliverTrialEmail(admin, company, {
    template: 'trial_suspended',
    occasion: ['suspended', company.trial_end_date],
    subject: "Brikly Account Suspended - Trial and Grace Period Expired",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">Account Suspended</h2>
        <p>Hi ${escapeHtml(admin.first_name || 'there')},</p>
        <p>Your Brikly account for <strong>${escapeHtml(company.name ?? '')}</strong> has been suspended because both your trial and grace period have expired.</p>
        <p>Your data is safe and will be preserved for 30 days. To reactivate your account and restore full access, please upgrade to a paid plan.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${siteUrl()}/subscription" 
             style="background-color: #dc2626; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold;">
            Reactivate Account
          </a>
        </div>
        <p>Need help? Reply to this email and our team will assist you.</p>
        <p>Best regards,<br>The Brikly Team</p>
      </div>
    `,
  });
}

/**
 * US-253: trial mail goes through SES via the shared sender (retry, delivery
 * log, Sentry on failure). It used to send from brikly.app, which the
 * brikly.net SPF/DKIM records do not cover. The key is the company, the stage
 * and the trial end date, so the daily run sends the 3-day warning once rather
 * than on each of the three days the trial is inside that window.
 */
async function deliverTrialEmail(
  admin: any,
  company: any,
  email: { template: string; occasion: Array<string | null | undefined>; subject: string; html: string },
) {
  const result = await sendEmail({
    to: admin.email,
    from: 'notifications@brikly.net',
    fromName: 'Brikly',
    subject: email.subject,
    html: email.html,
    companyId: company.id,
    template: email.template,
    source: 'trial-management',
    idempotencyKey: await emailIdempotencyKey('trial_email', company.id, ...email.occasion),
  });
  if (!result.success) {
    logStep("Trial email not sent", { companyId: company.id, template: email.template, error: result.error });
  }
}
