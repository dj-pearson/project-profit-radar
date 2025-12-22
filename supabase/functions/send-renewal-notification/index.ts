import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";

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
        site_id,
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

            const { data: existingNotifications } = await supabaseClient
        .from('renewal_notifications')
        .select('notification_type')
        .eq('site_id', subscriber.site_id)
        .eq('subscriber_id', subscriber.id)
        .eq('notification_type', notificationType);

      if (existingNotifications && existingNotifications.length > 0) {
        logStep("Notification already sent", { 
          subscriberId: subscriber.id, 
          type: notificationType 
        });
        continue;
      }

            const { data: profile } = await supabaseClient
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('site_id', subscriber.site_id)
        .eq('id', subscriber.user_id)
        .single();

      const customerName = profile?.first_name 
        ? `${profile.first_name} ${profile.last_name || ''}`.trim()
        : subscriber.email.split('@')[0];

      // Generate the email HTML
      const renewalDateFormatted = renewalDate.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
      const manageUrl = Deno.env.get("APP_URL") || 'https://builddesk.com/subscription';
      
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #1e40af, #3b82f6); padding: 30px; border-radius: 10px; text-align: center; margin-bottom: 30px;">
            <h1 style="color: white; margin: 0; font-size: 28px;">BuildDesk</h1>
            <p style="color: #e0e7ff; margin: 10px 0 0 0; font-size: 16px;">Construction Management Platform</p>
          </div>
          
          <div style="background: #f8fafc; padding: 30px; border-radius: 10px; margin-bottom: 20px;">
            <h2 style="color: #1e293b; margin: 0 0 20px 0; font-size: 24px;">Hello ${customerName},</h2>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 20px;">
              Your <strong>${subscriber.subscription_tier || 'Professional'}</strong> subscription will renew in <strong>${daysUntilRenewal} days</strong> on ${renewalDateFormatted}.
            </p>
            
            <p style="color: #475569; font-size: 16px; line-height: 1.6; margin-bottom: 30px;">
              No action is required - your subscription will automatically renew to ensure uninterrupted access to all BuildDesk features.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${manageUrl}" style="background: #1e40af; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
                Manage Subscription
              </a>
            </div>
          </div>
          
          <div style="background: #f1f5f9; padding: 20px; border-radius: 6px; margin-bottom: 20px;">
            <h3 style="color: #1e293b; margin: 0 0 15px 0; font-size: 18px;">What's Included:</h3>
            <ul style="color: #475569; margin: 0; padding-left: 20px;">
              <li>Unlimited projects and team members</li>
              <li>Real-time job costing and financial tracking</li>
              <li>Mobile field management</li>
              <li>QuickBooks integration</li>
              <li>24/7 customer support</li>
            </ul>
          </div>
          
          <p style="color: #64748b; font-size: 14px; line-height: 1.5; margin-top: 30px;">
            Questions? Contact our support team at support@builddesk.com or visit our help center.
          </p>
          
          <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 30px 0;">
          
          <p style="color: #94a3b8; font-size: 12px; text-align: center;">
            This is an automated notification from BuildDesk Construction Management Platform.<br>
            You're receiving this because your subscription is set to auto-renew.
          </p>
        </div>
      `;

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

            await supabaseClient
        .from('renewal_notifications')
        .insert({
          site_id: subscriber.site_id,
          subscriber_id: subscriber.id,
          notification_type: notificationType,
          subscription_end_date: subscriber.subscription_end
        });

            await supabaseClient
        .from('subscribers')
        .update({ renewal_notification_sent_at: new Date().toISOString() })
        .eq('site_id', subscriber.site_id)
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