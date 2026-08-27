/**
 * Write an auth/SSO/MFA event to public.security_logs.
 *
 * Every one of the 19 call sites this replaces did the same thing:
 *
 *   await client.from("security_logs").insert({ ... });
 *
 * supabase-js RETURNS its error rather than throwing, so none of them ever
 * knew whether the row landed, and none of the surrounding try/catch blocks
 * covered it (US-300). These are the auth events an incident is reconstructed
 * from - failed MFA attempts, SSO logins, MFA being disabled for another user
 * - so a lost write is a gap in the evidence exactly where one matters.
 *
 * Two rules, and they pull in opposite directions:
 *
 *   1. A failed audit write must NEVER break authentication. Refusing a login
 *      because the log could not be written turns a logging outage into an
 *      auth outage, which is worse.
 *   2. It must not be silent, which is how this went unnoticed.
 *
 * So this never throws, and logs loudly enough to alert on. The marker
 * SECURITY_LOG_WRITE_FAILED is deliberately greppable.
 *
 * Pass a SERVICE-ROLE client. security_logs is service-role-only since
 * 20260827090000 (US-306), so a user-JWT client is refused outright;
 * scripts/check-rls-write-paths.mjs enforces that at commit time.
 */

export interface SecurityLogEntry {
  /** Subject of the event. Null for events with no identified user yet. */
  user_id: string | null;
  /** Snake-case event name, e.g. "mfa_login_failed", "sso_connection_created". */
  event_type: string;
  /** The request, used to derive ip_address and user_agent. */
  req?: Request;
  /** Anything worth keeping. A timestamp is added if absent. */
  details?: Record<string, unknown>;
  /** Overrides, when the caller already has them. */
  ip_address?: string | null;
  user_agent?: string | null;
}

function clientIp(req?: Request): string | null {
  if (!req) return null;
  return (
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-forwarded-for") ||
    null
  );
}

export async function writeSecurityLog(
  // deno-lint-ignore no-explicit-any
  serviceClient: any,
  entry: SecurityLogEntry,
): Promise<void> {
  try {
    const { error } = await serviceClient.from("security_logs").insert({
      user_id: entry.user_id,
      event_type: entry.event_type,
      ip_address: entry.ip_address ?? clientIp(entry.req),
      user_agent: entry.user_agent ?? entry.req?.headers.get("user-agent") ?? null,
      details: {
        timestamp: new Date().toISOString(),
        ...entry.details,
      },
    });

    if (error) {
      console.error("SECURITY_LOG_WRITE_FAILED", {
        event_type: entry.event_type,
        user_id: entry.user_id,
        error: error.message,
      });
    }
  } catch (err) {
    // The insert itself threw - a network fault, or a client that is not what
    // we think it is. Same rule: never take auth down for a log.
    console.error("SECURITY_LOG_WRITE_FAILED", {
      event_type: entry.event_type,
      user_id: entry.user_id,
      error: err instanceof Error ? err.message : String(err),
    });
  }
}
