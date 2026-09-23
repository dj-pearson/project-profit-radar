/**
 * Reject anything that is not an internal caller.
 *
 * For edge functions meant to be invoked by cron, by another edge function, or
 * by an operator - never directly by a browser.
 *
 * The trap this exists for: a function absent from supabase/config.toml gets
 * verify_jwt = true by default, and that reads like authentication. It is not.
 * verify_jwt only checks that the request carries a validly-signed project JWT,
 * and THE PUBLISHABLE ANON KEY IS ONE - it ships in the client bundle. So a
 * handler with no auth of its own, sitting behind verify_jwt = true, is
 * reachable by anyone who has ever loaded the app.
 *
 * That is how webhook-trigger ended up able to enumerate and fire any tenant's
 * webhooks, and send-usage-alert able to harvest any company's admin email
 * addresses, on nothing more than the anon key (US-241).
 *
 * Accepts either the service-role bearer (what supabase.functions.invoke sends
 * from another function using the service client) or the CRON_SECRET header.
 * Unlike requireSystemOrAdmin, this NEVER fails open: if neither secret is
 * configured, every request is rejected, because a misconfigured internal
 * endpoint should be unreachable rather than public.
 */

export function requireInternalCaller(req: Request): Response | null {
  if (isInternalCaller(req)) return null;

  const authHeader = req.headers.get("authorization") ?? "";
  const provided = req.headers.get("x-cron-secret");

  console.error("[internal-only] rejected external invocation", {
    path: new URL(req.url).pathname,
    hasAuthHeader: authHeader.length > 0,
    hasCronHeader: Boolean(provided),
  });

  // 404 rather than 403: this endpoint should not be discoverable, and a 403
  // confirms it exists.
  return new Response(JSON.stringify({ error: "Not found" }), {
    status: 404,
    headers: { "Content-Type": "application/json" },
  });
}

/**
 * Whether the request comes from an internal caller: the service-role bearer
 * or the CRON_SECRET header. Neither is ever held by a browser, so a function
 * that also serves signed-in users can use this to let cron and other edge
 * functions in without widening what a user may do. False when neither secret
 * is configured.
 */
export function isInternalCaller(req: Request): boolean {
  const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const cronSecret = Deno.env.get("CRON_SECRET");

  const authHeader = req.headers.get("authorization") ?? "";
  if (serviceRole && authHeader === `Bearer ${serviceRole}`) return true;

  const provided = req.headers.get("x-cron-secret");
  return Boolean(cronSecret && provided && provided === cronSecret);
}
