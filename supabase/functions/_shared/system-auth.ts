// Guard for system / cron edge functions that run with verify_jwt = false.
//
// These functions are NOT protected by Supabase's platform JWT check, so
// without their own guard ANY caller can invoke them (trigger heavy compute,
// mutate system settings, etc.). This guard allows:
//   1. a trusted scheduler that presents the shared CRON_SECRET, or
//   2. an authenticated admin / root_admin user.
//
// Fail closed: if CRON_SECRET is not configured the guard does NOT allow
// anonymous access. It falls through to the authenticated-admin check, so the
// only ways in are (1) a scheduler presenting a matching CRON_SECRET or (2) an
// authenticated admin/root_admin JWT. Set CRON_SECRET (and have schedulers send
// the x-cron-secret header) to keep cron jobs working.

import { initializeAuthContext } from "./auth-helpers.ts";

const jsonError = (message: string, status: number): Response =>
  new Response(
    JSON.stringify({ error: message, success: false, timestamp: new Date().toISOString() }),
    { status, headers: { "Content-Type": "application/json" } },
  );

/**
 * Returns null when the request is allowed, or a Response (401/403) to return
 * immediately when denied.
 */
export async function requireSystemOrAdmin(req: Request): Promise<Response | null> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  const provided = req.headers.get("x-cron-secret");

  // Trusted scheduler invocation.
  if (cronSecret && provided && provided === cronSecret) {
    return null;
  }

  // Fail closed: a missing CRON_SECRET must NOT grant anonymous access. Log
  // loudly so operators wire the secret, then fall through to admin auth — an
  // unauthenticated cron caller (no JWT) will be rejected below.
  if (!cronSecret) {
    console.error(
      "[system-auth] CRON_SECRET is not set — rejecting unauthenticated system invocation. " +
        "Set CRON_SECRET and have schedulers send the x-cron-secret header.",
    );
  }

  // Secret not presented / not configured -> require an authenticated admin.
  const ctx = await initializeAuthContext(req);
  if (!ctx) {
    return jsonError("Unauthorized", 401);
  }
  const { user, supabase } = ctx;
  const { data: profile } = await supabase
    .from("user_profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile || !["admin", "root_admin"].includes(profile.role)) {
    return jsonError("Forbidden — admin access required", 403);
  }
  return null;
}
