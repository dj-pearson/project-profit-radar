// Guard for system / cron edge functions that run with verify_jwt = false.
//
// These functions are NOT protected by Supabase's platform JWT check, so
// without their own guard ANY caller can invoke them (trigger heavy compute,
// mutate system settings, etc.). This guard allows:
//   1. a trusted scheduler that presents the shared CRON_SECRET, or
//   2. an authenticated admin / root_admin user.
//
// Staged rollout: if CRON_SECRET is not configured in the environment yet, the
// guard logs a warning and allows the request (so deploying this code does NOT
// break existing cron jobs before the secret + scheduler headers are wired).
// Once CRON_SECRET is set, anonymous callers are rejected.

import { initializeAuthContext } from "./auth-helpers.ts";
import { isInternalCaller } from "./internal-only.ts";

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

  // Staged rollout: secret not configured yet -> don't break existing crons.
  if (!cronSecret) {
    console.warn(
      "[system-auth] CRON_SECRET is not set — system function is currently UNGUARDED. " +
        "Set CRON_SECRET and have schedulers send the x-cron-secret header to enforce.",
    );
    return null;
  }

  // Secret is configured but not presented -> require an authenticated admin.
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

/**
 * For a job that acts across every tenant: an internal caller (service-role
 * bearer or CRON_SECRET, see isInternalCaller) or a signed-in root_admin.
 * Company admins are refused, which requireSystemOrAdmin does not do, and
 * nothing fails open when CRON_SECRET is unset.
 *
 * Returns null when allowed, or the 401/403 to return. Pass the function's
 * CORS headers so a browser caller can read the refusal.
 */
export async function requireInternalCallerOrRootAdmin(
  req: Request,
  opts: { corsHeaders?: Record<string, string>; forbiddenMessage?: string } = {},
): Promise<Response | null> {
  if (isInternalCaller(req)) return null;

  const deny = (message: string, status: number) =>
    new Response(
      JSON.stringify({ error: message, success: false, timestamp: new Date().toISOString() }),
      { status, headers: { ...(opts.corsHeaders ?? {}), "Content-Type": "application/json" } },
    );

  const ctx = await initializeAuthContext(req);
  if (!ctx) return deny("Unauthorized", 401);

  const { data: profile } = await ctx.supabase
    .from("user_profiles")
    .select("role")
    .eq("id", ctx.user.id)
    .maybeSingle();

  if (profile?.role !== "root_admin") {
    return deny(opts.forbiddenMessage ?? "Forbidden - root admin access required", 403);
  }
  return null;
}
