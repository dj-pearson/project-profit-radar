// Schedule Trial Emails Edge Function
// Updated with multi-tenant site_id isolation
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-site-key",
};

// Default site key for BuildDesk
const DEFAULT_SITE_KEY = 'builddesk';

interface TrialEmailSchedule {
  day: number;
  emailType: string;
  campaignName: string;
}

// Define the email schedule
const EMAIL_SCHEDULE: TrialEmailSchedule[] = [
  { day: 0, emailType: 'day0_welcome', campaignName: 'Welcome Email' },
  { day: 1, emailType: 'day1_getting_started', campaignName: 'Getting Started Guide' },
  { day: 3, emailType: 'day3_time_tracking', campaignName: 'Time Tracking Feature' },
  { day: 7, emailType: 'day7_case_study', campaignName: 'Case Study & Social Proof' },
  { day: 11, emailType: 'day11_trial_expiring', campaignName: 'Trial Expiring Soon' },
  { day: 12, emailType: 'day12_testimonials', campaignName: 'Testimonials & Urgency' },
  { day: 13, emailType: 'day13_last_chance', campaignName: 'Last Chance Offer' },
  { day: 15, emailType: 'day15_grace_period', campaignName: 'Grace Period Notice' },
];

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SCHEDULE-EMAILS] ${step}${detailsStr}`);
};

/**
 * Schedule trial emails for a new user
 * Called automatically when a user signs up
 */
serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Email scheduling started");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get request body
    const { userId, email, firstName, companyName, site_id, site_key } = await req.json();

    if (!userId || !email) {
      throw new Error("Missing required fields: userId and email");
    }

    // Resolve site_id from request or header or default
    let siteId = site_id;
    const siteKey = site_key || req.headers.get("x-site-key") || DEFAULT_SITE_KEY;
    if (!siteId) {
      const { data: siteData } = await supabaseClient
        .from('sites')
        .select('id')
        .eq('key', siteKey)
        .single();
      siteId = siteData?.id;
    }

    logStep("Site resolved", { siteKey, siteId });
    logStep("Scheduling emails for user", { userId, email, siteId });

    // Get user's company and trial end date with site isolation
    const { data: profile } = await supabaseClient
      .from('user_profiles')
      .select('company_id')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', userId)
      .single();

    const { data: company } = await supabaseClient
      .from('companies')
      .select('trial_end_date, subscription_status')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .eq('id', profile?.company_id)
      .single();

    if (!company?.trial_end_date) {
      throw new Error("No trial end date found for user");
    }

    const trialStartDate = new Date();
    const trialEndDate = new Date(company.trial_end_date);

    // Check if campaigns already exist (prevent duplicates) with site isolation
    const { data: existingCampaigns } = await supabaseClient
      .from('email_campaigns')
      .select('campaign_name')
      .eq('site_id', siteId)  // CRITICAL: Site isolation
      .in('campaign_name', EMAIL_SCHEDULE.map(s => `trial_${s.emailType}`))
      .eq('is_active', true);

    // Create campaigns if they don't exist
    for (const schedule of EMAIL_SCHEDULE) {
      const campaignName = `trial_${schedule.emailType}`;

      // Skip if campaign already exists
      if (existingCampaigns?.some(c => c.campaign_name === campaignName)) {
        logStep("Campaign already exists, skipping", { campaignName });
        continue;
      }

      // Create campaign with site isolation
      await supabaseClient
        .from('email_campaigns')
        .insert({
          site_id: siteId,  // CRITICAL: Site isolation
          campaign_name: campaignName,
          campaign_description: schedule.campaignName,
          campaign_type: 'trial_nurture',
          trigger_type: 'lifecycle',
          subject_line: getSubjectLine(schedule.emailType, firstName),
          preview_text: getPreviewText(schedule.emailType),
          from_name: 'BuildDesk Team',
          from_email: 'hello@build-desk.com',
          reply_to: 'support@build-desk.com',
          send_delay_minutes: schedule.day * 24 * 60, // Convert days to minutes
          sequence_name: 'trial_nurture',
          sequence_order: schedule.day,
          is_active: true,
        });
    }

    // Now schedule individual emails for this user
    const emailsScheduled = [];

    for (const schedule of EMAIL_SCHEDULE) {
      const sendDate = new Date(trialStartDate);
      sendDate.setDate(sendDate.getDate() + schedule.day);

      // Don't schedule emails after trial end for most emails
      // (except grace period email which is day 15)
      if (schedule.day > 14 && schedule.day !== 15) {
        continue;
      }

      // Get campaign ID with site isolation
      const { data: campaign } = await supabaseClient
        .from('email_campaigns')
        .select('id')
        .eq('site_id', siteId)  // CRITICAL: Site isolation
        .eq('campaign_name', `trial_${schedule.emailType}`)
        .single();

      if (!campaign) {
        logStep("Campaign not found", { emailType: schedule.emailType });
        continue;
      }

      // Add to email queue with site isolation
      const { data: queuedEmail, error: queueError } = await supabaseClient
        .from('email_queue')
        .insert({
          site_id: siteId,  // CRITICAL: Site isolation
          campaign_id: campaign.id,
          user_id: userId,
          recipient_email: email,
          scheduled_for: sendDate.toISOString(),
          priority: schedule.day === 0 ? 1 : schedule.day >= 11 ? 2 : 5,
          status: 'pending',
          queue_metadata: {
            first_name: firstName,
            company_name: companyName,
            trial_end_date: trialEndDate.toISOString(),
            days_remaining: Math.max(0, 14 - schedule.day),
          },
        })
        .select();

      if (queueError) {
        logStep("Error queueing email", { error: queueError.message, schedule });
        continue;
      }

      emailsScheduled.push({
        emailType: schedule.emailType,
        scheduledFor: sendDate,
        queueId: queuedEmail[0].id,
      });

      logStep("Email scheduled", {
        emailType: schedule.emailType,
        scheduledFor: sendDate,
      });
    }

    // Create user email preferences with site isolation
    await supabaseClient
      .from('email_preferences')
      .upsert({
        site_id: siteId,  // CRITICAL: Site isolation
        user_id: userId,
        marketing_emails: true,
        product_updates: true,
        trial_nurture: true,
        billing_notifications: true,
        email_frequency: 'normal',
      }, { onConflict: 'site_id,user_id' });

    logStep("Email scheduling complete", {
      userId,
      emailsScheduled: emailsScheduled.length,
    });

    return new Response(JSON.stringify({
      success: true,
      message: `Scheduled ${emailsScheduled.length} trial nurture emails`,
      emailsScheduled,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in email scheduling", { message: errorMessage });

    return new Response(JSON.stringify({
      success: false,
      error: errorMessage,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});

// Helper functions for email content
function getSubjectLine(emailType: string, firstName: string): string {
  const subjects: Record<string, string> = {
    day0_welcome: `Welcome to BuildDesk, ${firstName}! 🎉`,
    day1_getting_started: `${firstName}, ready to create your first project?`,
    day3_time_tracking: `Stop losing money on time tracking`,
    day7_case_study: `How contractors increased profit margins by 12%`,
    day11_trial_expiring: `${firstName}, your trial ends in 3 days`,
    day12_testimonials: `Why 500+ contractors choose BuildDesk`,
    day13_last_chance: `⚠️ LAST CHANCE: Your trial ends tomorrow`,
    day15_grace_period: `Your trial expired - but you still have time`,
  };

  return subjects[emailType] || `Update from BuildDesk`;
}

function getPreviewText(emailType: string): string {
  const previews: Record<string, string> = {
    day0_welcome: `Let's get you started with BuildDesk - your 14-day free trial begins now`,
    day1_getting_started: `Create your first project in 2 minutes - step-by-step guide inside`,
    day3_time_tracking: `See how BuildDesk's time tracking saves contractors 5+ hours per week`,
    day7_case_study: `Real results from real construction companies using BuildDesk`,
    day11_trial_expiring: `Don't lose access to your data - upgrade now to continue`,
    day12_testimonials: `Hear from contractors who made the switch to BuildDesk`,
    day13_last_chance: `Your trial ends tomorrow! Upgrade now and save $50 on your first month`,
    day15_grace_period: `You have 7 days to upgrade and recover all your data`,
  };

  return previews[emailType] || `Update from BuildDesk`;
}
