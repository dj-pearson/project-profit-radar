import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "npm:resend@4.0.0";
import React from 'npm:react@18.3.1';
import { renderAsync } from 'npm:@react-email/components@0.0.22';
import { createClient } from "https://deno.land/x/supabase@1.0.0/mod.ts";
import { RenewalReminderEmail } from './_templates/renewal-reminder.tsx';

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[RENEWAL-NOTIFICATION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const resendKey = Deno.env.get("RESEND_API_KEY");
    if (!resendKey) throw new Error("RESEND_API_KEY is not set");

    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const resend = new Resend(resendKey);

    // Get the request body if this is a manual trigger
    let subscriberId = null;
    if (req.method === "POST") {
      try {
        const body = await req.json();
        subscriberId = body.subscriber_id;
      } catch {
        // No body or invalid JSON - that's ok for scheduled runs
      }
    }

    // Find subscriptions that need renewal notifications
    const today = new Date();
    const sixtyDaysFromNow = new Date(today.getTime() + (60 * 24 * 60 * 60 * 1000));
    const thirtyDaysFromNow = new Date(today.getTime() + (30 * 24 * 60 * 60 * 1000));
    const sevenDaysFromNow = new Date(today.getTime() + (7 * 24 * 60 * 60 * 1000));

    let query = supabaseClient
      .from('subscribers')
      .select(`
        id,
        email,
        user_id,
        subscription_tier,
        subscription_end,
        billing_period,
        renewal_notification_sent_at
      `)
      .eq('subscribed', true)
      .not('subscription_end', 'is', null);

    if (subscriberId) {
      query = query.eq('id', subscriberId);
    }

    const { data: subscribers, error } = await query;

    if (error) throw error;

    logStep("Found subscribers", { count: subscribers?.length || 0 });

    let notificationsSent = 0;

    for (const subscriber of subscribers || []) {
      if (!subscriber.subscription_end) continue;

      const renewalDate = new Date(subscriber.subscription_end);
      const daysUntilRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      // Only send notifications for annual subscribers
      if (subscriber.billing_period !== 'annual') continue;

      // Determine notification type needed
      let notificationType = null;
      if (daysUntilRenewal <= 7 && daysUntilRenewal > 0) {
        notificationType = '7_day';
      } else if (daysUntilRenewal <= 30 && daysUntilRenewal > 7) {
        notificationType = '30_day';
      } else if (daysUntilRenewal <= 60 && daysUntilRenewal > 30) {
        notificationType = '60_day';
      }

      if (!notificationType) continue;

      // Check if we already sent this type of notification
      const { data: existingNotifications } = await supabaseClient
        .from('renewal_notifications')
        .select('notification_type')
        .eq('subscriber_id', subscriber.id)
        .eq('notification_type', notificationType);

      if (existingNotifications && existingNotifications.length > 0) {
        logStep("Notification already sent", { 
          subscriberId: subscriber.id, 
          type: notificationType 
        });
        continue;
      }

      // Get user profile for name
      const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', subscriber.user_id)
        .single();

      const customerName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : subscriber.email.split('@')[0];

      // Generate the email HTML
      const html = await renderAsync(
        React.createElement(RenewalReminderEmail, {
          customerName,
          subscriptionTier: subscriber.subscription_tier || 'Professional',
          daysUntilRenewal,
          renewalDate: renewalDate.toLocaleDateString('en-US', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
          }),
          manageUrl: `${Deno.env.get("SUPABASE_URL")?.replace('.supabase.co', '')}.vercel.app/subscription`
        })
      );

      // Send the email
      const { error: emailError } = await resend.emails.send({
        from: 'BuildDesk <notifications@builddesk.com>',
        to: [subscriber.email],
        subject: `Your subscription renews in ${daysUntilRenewal} days`,
        html,
      });

      if (emailError) {
        logStep("Email send failed", { 
          subscriberId: subscriber.id, 
          error: emailError 
        });
        continue;
      }

      // Record the notification
      await supabaseClient
        .from('renewal_notifications')
        .insert({
          subscriber_id: subscriber.id,
          notification_type: notificationType,
          subscription_end_date: subscriber.subscription_end
        });

      // Update the last notification timestamp
      await supabaseClient
        .from('subscribers')
        .update({ renewal_notification_sent_at: new Date().toISOString() })
        .eq('id', subscriber.id);

      notificationsSent++;
      logStep("Notification sent", { 
        subscriberId: subscriber.id, 
        email: subscriber.email,
        type: notificationType,
        daysUntilRenewal 
      });
    }

    return new Response(JSON.stringify({ 
      success: true, 
      notifications_sent: notificationsSent 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});