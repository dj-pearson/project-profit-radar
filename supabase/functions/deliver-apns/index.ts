// Deliver an in-app notification to the recipient's iPhones through APNs.
//
// Internal only: called by the Database Webhook on INSERT into
// real_time_notifications (service-role bearer), or by another function with
// the service client. Never by a browser.
import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { requireInternalCaller } from "../_shared/internal-only.ts";
import { createServiceClient } from "../_shared/service-client.ts";
import { apnsConfigFromEnv, sendApns } from "../_shared/apns.ts";
import { errorResponse, successResponse } from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";

// Either the Database Webhook envelope or a direct call.
const WebhookSchema = z.object({
  type: z.literal("INSERT"),
  table: z.literal("real_time_notifications"),
  record: z.object({
    id: z.string().uuid(),
    recipient_id: z.string().uuid(),
    type: z.string().max(100),
    title: z.string().max(500),
    message: z.string().max(4000),
    priority: z.string().max(50).nullish(),
  }),
});

const DirectSchema = z.object({
  user_id: z.string().uuid(),
  title: z.string().min(1).max(500),
  body: z.string().max(4000).optional(),
  data: z.record(z.unknown()).optional(),
});

export default async (req: Request): Promise<Response> => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  // Same 404 and message as requireInternalCaller, in the standard envelope.
  if (requireInternalCaller(req)) return errorResponse("Not found", 404, req);

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return errorResponse("Body must be JSON", 400, req);
  }

  let userId: string;
  let title: string;
  let body: string | undefined;
  let data: Record<string, unknown> = {};

  const webhook = WebhookSchema.safeParse(raw);
  if (webhook.success) {
    const r = webhook.data.record;
    userId = r.recipient_id;
    title = r.title;
    body = r.message;
    data = { notification_id: r.id, notification_type: r.type };
  } else {
    const direct = DirectSchema.safeParse(raw);
    if (!direct.success) {
      return errorResponse("Unrecognised payload", 400, req);
    }
    userId = direct.data.user_id;
    title = direct.data.title;
    body = direct.data.body;
    data = direct.data.data ?? {};
  }

  const config = apnsConfigFromEnv();
  if (!config) {
    // Not an error for the webhook: the notification is still in the app.
    return successResponse({ sent: 0, reason: "APNs not configured" }, req);
  }

  const service = createServiceClient();
  const { data: tokens, error } = await service
    .from("device_push_tokens")
    .select("id, token, environment")
    .eq("user_id", userId);

  if (error) {
    console.error("[deliver-apns] token lookup failed", { error: error.message });
    return errorResponse("Token lookup failed", 500, req);
  }

  let sent = 0;
  const dead: string[] = [];
  for (const row of tokens ?? []) {
    try {
      const result = await sendApns(config, row.token, row.environment, { title, body, data });
      if (result.ok) {
        sent++;
      } else {
        console.warn("[deliver-apns] APNs refused", { status: result.status, reason: result.reason });
        if (result.tokenIsDead) dead.push(row.id);
      }
    } catch (err) {
      console.error("[deliver-apns] send failed", { error: (err as Error).message });
    }
  }

  if (dead.length > 0) {
    const { error: pruneError } = await service.from("device_push_tokens").delete().in("id", dead);
    if (pruneError) {
      console.error("[deliver-apns] dead tokens not removed; they'll be retried", { error: pruneError.message });
    }
  }

  return successResponse({ sent, pruned: dead.length }, req);
};
