// Send Push Notification Edge Function
// Sends a web push notification to a specific user via their registered push subscription
import { createClient } from "npm:@supabase/supabase-js@2";
import { initializeAuthContext, errorResponse, successResponse } from '../_shared/auth-helpers.ts';
import { getCorsHeaders } from '../_shared/secure-cors.ts';

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

    const body = await req.json();
    const { user_id, title, body: notifBody, icon, badge, data } = body;

    if (!user_id || !title) {
      return errorResponse('user_id and title are required', 400, req);
    }

    logStep("Preparing notification", { user_id, title });

    // Use service role to query push subscriptions
    const serviceClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

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
