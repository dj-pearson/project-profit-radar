// Send Push Notification Edge Function
// Sends a web push notification to a specific user via their registered push subscription
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';
import { validateBody } from '../_shared/validate-body.ts';
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

const PushNotificationSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(200),
  body: z.string().max(1000).optional(),
  icon: z.string().url().max(2000).optional(),
  badge: z.string().url().max(2000).optional(),
  data: z.record(z.unknown()).optional(),
});

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[SEND-PUSH-NOTIFICATION] ${step}${detailsStr}`);
};

export default async (req: Request) => {
  const corsHeaders = getCorsHeaders(req);

  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    logStep("Function started");

    const authContext = await initializeAuthContext(req);
    if (!authContext) {
      return errorResponse('Unauthorized', 401, req);
    }

    const parsed = await validateBody(req, PushNotificationSchema, {
      name: 'send-push-notification',
    });
    if (!parsed.ok) return parsed.response;
    const { user_id, title, body: notifBody, icon, badge, data } = parsed.data;

    logStep("Preparing notification", { user_id, title });

    // Use service role to query push subscriptions
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // The caller is authenticated, but nothing checked WHO they were allowed to
    // notify. With a service-role client and a body-supplied user_id, any
    // signed-in user could push an arbitrary title, body, icon and data payload
    // to any other user in the product - a phishing message delivered through
    // Brikly's own notification channel, on the lock screen, with Brikly's icon.
    //
    // Scope it to the caller's own company. Notifying a colleague is the
    // legitimate use; notifying a stranger is not.
    const { user: caller } = authContext;
    const { data: profiles, error: profileError } = await serviceClient
      .from('user_profiles')
      .select('id, company_id')
      .in('id', [caller.id, user_id]);

    if (profileError) {
      logStep("Could not resolve profiles for authorisation", { error: profileError.message });
      return errorResponse('Unable to verify recipient', 500, req);
    }

    const callerProfile = profiles?.find((p) => p.id === caller.id);
    const targetProfile = profiles?.find((p) => p.id === user_id);

    if (!callerProfile?.company_id || !targetProfile?.company_id
        || callerProfile.company_id !== targetProfile.company_id) {
      logStep("Cross-company notification attempt", {
        callerId: caller.id,
        targetId: user_id,
      });
      // Same shape as "no subscriptions" so this cannot be used to probe which
      // user ids exist or which company they belong to.
      return successResponse({ sent: false, reason: 'No push subscriptions registered' }, req);
    }

    // Get the user's push subscriptions
    const { data: subscriptions, error: subError } = await serviceClient
      .from('push_subscriptions')
      .select('*')
      .eq('user_id', user_id);

    if (subError) {
      logStep("Error fetching subscriptions", { error: subError.message });
      // Don't fail - table may not exist yet
      return successResponse({ sent: false, reason: 'No push subscriptions table or no subscriptions found' }, req);
    }

    if (!subscriptions || subscriptions.length === 0) {
      logStep("No push subscriptions found for user");
      return successResponse({ sent: false, reason: 'No push subscriptions registered' }, req);
    }

    const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY");
    if (!vapidPrivateKey) {
      logStep("VAPID_PRIVATE_KEY not configured - push notifications disabled");
      return successResponse({ sent: false, reason: 'Push notifications not configured (VAPID_PRIVATE_KEY missing)' }, req);
    }

    const payload = JSON.stringify({
      title,
      body: notifBody || '',
      icon: icon || '/favicon.ico',
      badge: badge || '/favicon.ico',
      data: data || {},
    });

    // Send to each subscription
    let successCount = 0;
    let failCount = 0;

    for (const sub of subscriptions) {
      try {
        const subscription = typeof sub.subscription === 'string'
          ? JSON.parse(sub.subscription)
          : sub.subscription;

        const response = await fetch(subscription.endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: payload,
        });

        if (response.ok) {
          successCount++;
        } else {
          failCount++;
          // Remove stale subscriptions (410 Gone)
          if (response.status === 410) {
            await serviceClient
              .from('push_subscriptions')
              .delete()
              .eq('id', sub.id);
          }
        }
      } catch (err) {
        failCount++;
        logStep("Failed to send to subscription", { error: err.message });
      }
    }

    logStep("Push notifications sent", { successCount, failCount });
    return successResponse({ sent: true, successCount, failCount }, req);

  } catch (error) {
    logStep("Error", { message: error.message });
    return errorResponse(error.message || 'Internal server error', 500, req);
  }
};
