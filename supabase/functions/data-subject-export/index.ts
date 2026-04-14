// data-subject-export
//
// Self-service GDPR Article 15 / CCPA §1798.110 access + portability request.
// Called from src/components/legal/PrivacyControls.tsx.
//
// Responsibilities:
//   1. Verify the caller is authenticated and is acting on behalf of their
//      own account (no admin-impersonation path here — admins must use the
//      privacy-team service-role path separately).
//   2. Collect personal data belonging to the caller across the application
//      tables they have access to under RLS. We intentionally query through
//      the authenticated Supabase client so RLS provides a defense-in-depth
//      check: if a table policy is wrong, the user still cannot read another
//      user's rows. Service-role is NOT used here.
//   3. Insert an audit row in data_subject_requests so the request is logged
//      and subject to the 30-day SLA even when the export returns instantly.
//   4. Return the archive inline as JSON. For accounts larger than ~5 MB of
//      JSON this should be replaced with a signed-URL-to-storage flow, but
//      for the vast majority of end-user records the inline payload is fine
//      and avoids needing a storage bucket configured up front.
//
// Security notes:
//   - We do not include columns that could expose other users' PII even if
//     they happen to be joined in a row the user owns. Each read is scoped
//     to `user_id = auth.uid()`.
//   - Timestamped audit entry is written even on error so the privacy team
//     can retry manually if data assembly fails.
//   - CORS uses the shared secure-cors allowlist.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { initializeAuthContext, errorResponse, successResponse } from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

interface ExportPayload {
  /** Meta about the request itself for the audit trail. */
  meta: {
    user_id: string;
    email: string | null;
    generated_at: string;
    format_version: 1;
    notes: string;
  };
  /** The authenticated user's own account record. */
  account: Record<string, unknown> | null;
  /** user_profile row(s) visible under RLS. */
  user_profile: Record<string, unknown>[];
  /** Time entries the user submitted. */
  time_entries: Record<string, unknown>[];
  /** Daily reports the user authored. */
  daily_reports: Record<string, unknown>[];
  /** Audit log entries the user caused. */
  audit_logs: Record<string, unknown>[];
  /** Consent history logged for this user. */
  consent_ledger: Record<string, unknown>[];
  /** Previous data-subject requests. */
  data_subject_requests: Record<string, unknown>[];
}

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return errorResponse("Method not allowed", 405, req);
  }

  const authContext = await initializeAuthContext(req);
  if (!authContext) return errorResponse("Unauthorized", 401, req);
  const { user, supabase } = authContext;

  // Rate limit: exports are expensive (multi-table scan). Cap at 5 per
  // user per hour keyed by auth user id — enough for debugging, low
  // enough to deter enumeration abuse.
  const rl = await checkRateLimit(supabase, {
    identifier: user.id,
    endpoint: "data-subject-export",
    maxRequests: 5,
    windowMinutes: 60,
  });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
  // Also cap by IP to limit abuse from a rotating pool of hijacked sessions.
  const ipRl = await checkRateLimit(supabase, {
    identifier: getClientIP(req),
    endpoint: "data-subject-export:ip",
    maxRequests: 20,
    windowMinutes: 60,
  });
  if (!ipRl.allowed) return rateLimitResponse(ipRl, corsHeaders);

  // Read the request body only to allow the client to specify non-default
  // behaviours in the future (e.g., format). We ignore unknown fields.
  try {
    await req.json().catch(() => ({}));
  } catch {
    /* noop — empty body is fine */
  }

  // Best-effort: queries that fail are logged and ignored so one missing
  // table doesn't prevent the rest of the export from returning.
  const safeSelect = async (
    from: string,
    filter: (q: ReturnType<typeof supabase.from>) => unknown,
  ): Promise<Record<string, unknown>[]> => {
    try {
      const q = supabase.from(from).select("*");
      const { data, error } = (await filter(q)) as { data: unknown; error: unknown };
      if (error) {
        console.warn(`[DSAR export] ${from} query returned error, skipping`, error);
        return [];
      }
      return (data as Record<string, unknown>[]) ?? [];
    } catch (err) {
      console.warn(`[DSAR export] ${from} query threw, skipping`, err);
      return [];
    }
  };

  const [
    userProfileRows,
    timeEntryRows,
    dailyReportRows,
    auditLogRows,
    consentRows,
    dsarRows,
  ] = await Promise.all([
    safeSelect("user_profiles", (q) => (q as any).eq("user_id", user.id)),
    safeSelect("time_entries", (q) => (q as any).eq("user_id", user.id)),
    safeSelect("daily_reports", (q) => (q as any).eq("submitted_by", user.id)),
    safeSelect("audit_logs", (q) => (q as any).eq("user_id", user.id).order("created_at", { ascending: false }).limit(5000)),
    safeSelect("consent_ledger", (q) => (q as any).eq("user_id", user.id)),
    safeSelect("data_subject_requests", (q) => (q as any).eq("user_id", user.id)),
  ]);

  const payload: ExportPayload = {
    meta: {
      user_id: user.id,
      email: user.email ?? null,
      generated_at: new Date().toISOString(),
      format_version: 1,
      notes:
        "This archive contains personal data associated with your Brikly account that you have access to. Data owned by your employer's workspace that you do not directly control is not included here; ask your workspace administrator for a copy. For corrections or additional data, email privacy@brikly.net.",
    },
    account: {
      id: user.id,
      email: user.email,
      phone: user.phone ?? null,
      created_at: user.created_at,
      last_sign_in_at: user.last_sign_in_at ?? null,
      app_metadata: user.app_metadata,
      user_metadata: user.user_metadata,
    },
    user_profile: userProfileRows,
    time_entries: timeEntryRows,
    daily_reports: dailyReportRows,
    audit_logs: auditLogRows,
    consent_ledger: consentRows,
    data_subject_requests: dsarRows,
  };

  // Log the request in the audit table. Failure here is non-fatal — the
  // user still gets their data — but we log loudly so privacy ops notices.
  try {
    await supabase.from("data_subject_requests").insert({
      user_id: user.id,
      email: user.email,
      request_type: "access",
      status: "completed",
      source: "self_service",
      verification_method: "session_jwt",
      notes: `Self-service export; ${Object.values(payload).filter(Array.isArray).reduce((a, b) => a + (b as unknown[]).length, 0)} rows returned.`,
      completed_at: new Date().toISOString(),
    });
  } catch (err) {
    console.error("[DSAR export] failed to write audit row", err);
  }

  return successResponse(
    {
      // For now we return the payload inline. When accounts grow large, swap
      // this to uploading `payload` to a private Storage bucket and returning
      // a time-limited signed URL via the `download_url` field. The client
      // already prefers `download_url` if present.
      archive: payload,
    },
    req,
  );
});
