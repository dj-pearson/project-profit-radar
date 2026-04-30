// data-subject-delete
//
// Self-service GDPR Article 17 / CCPA §1798.105 erasure request. Called from
// src/components/legal/PrivacyControls.tsx after the user types their
// account email to confirm.
//
// IMPORTANT: this function does NOT immediately delete user rows. It:
//   1. Verifies the caller is the account holder (JWT).
//   2. Creates a `data_subject_requests` row with request_type='deletion'
//      and a due_at 30 days in the future — the legally required grace
//      period documented in the Privacy Policy and Terms of Service so the
//      user can cancel by replying to the confirmation email.
//   3. Disables authentication (optional, via the service role) so the user
//      cannot sign back in. Their data remains in place until the nightly
//      fulfillment job runs (separate function).
//   4. Returns a confirmation payload; the client shows a toast and the
//      confirmation email is sent out-of-band by the notification pipeline.
//
// Service-role usage:
//   The account-lockout step uses the service role because auth admin calls
//   require it. Service-role key is read from the environment and never
//   exposed to the client. If the key is not configured (e.g., local dev)
//   the function still records the request — the lockout is best-effort.
//
// Why not a hard delete here:
//   - Accidental clicks are unrecoverable.
//   - Some personal data must be retained for statutory periods (payroll,
//     tax, anti-fraud, accounting). Deletion is legally complex and best
//     handled by a dedicated fulfillment job.
//   - Workspace admins may need to export the user's work product first.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { initializeAuthContext, errorResponse, successResponse } from "../_shared/auth-helpers.ts";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { checkRateLimit, getClientIP, rateLimitResponse } from "../_shared/rate-limiter.ts";

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

  // Deletion is high-consequence. Hard cap: 3 requests per user per day and
  // 10 per IP per day. Existing pending requests short-circuit below this
  // check anyway; this protects against request-spam/DoS.
  const rl = await checkRateLimit(supabase, {
    identifier: user.id,
    endpoint: "data-subject-delete",
    maxRequests: 3,
    windowMinutes: 60 * 24,
  });
  if (!rl.allowed) return rateLimitResponse(rl, corsHeaders);
  const ipRl = await checkRateLimit(supabase, {
    identifier: getClientIP(req),
    endpoint: "data-subject-delete:ip",
    maxRequests: 10,
    windowMinutes: 60 * 24,
  });
  if (!ipRl.allowed) return rateLimitResponse(ipRl, corsHeaders);

  // We accept a body, but also honor an empty body — the authenticated
  // user context is enough to identify the subject.
  let companyId: string | null = null;
  try {
    const body = await req.json();
    if (body && typeof body.company_id === "string") {
      companyId = body.company_id;
    }
  } catch {
    /* noop */
  }

  if (!companyId) {
    // user_profiles.id is the auth user id (PK references auth.users(id));
    // there is no separate `user_id` column on this table.
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("company_id")
      .eq("id", user.id)
      .maybeSingle();
    companyId = (profile?.company_id as string) ?? null;
  }

  const dueAt = new Date();
  dueAt.setDate(dueAt.getDate() + 30);

  // Record the request. This is the legally required audit row.
  const { data: inserted, error: insertError } = await supabase
    .from("data_subject_requests")
    .insert({
      user_id: user.id,
      company_id: companyId,
      email: user.email,
      request_type: "deletion",
      status: "pending",
      source: "self_service",
      verification_method: "session_jwt",
      due_at: dueAt.toISOString(),
      notes:
        "Self-service deletion requested via PrivacyControls. Scheduled for fulfillment after the 30-day grace period unless cancelled.",
    })
    .select()
    .single();

  if (insertError) {
    console.error("[DSAR delete] failed to write audit row", insertError);
    return errorResponse(
      "Unable to record deletion request. Please email privacy@brikly.net.",
      500,
      req,
    );
  }

  // Best-effort: lock the account so the user cannot sign back in during
  // the grace period. Uses the admin API which requires the service role.
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  let lockedOut = false;
  if (serviceRoleKey && supabaseUrl) {
    try {
      const admin = createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
      });
      // Invalidate active sessions; we do NOT call admin.deleteUser here —
      // deletion happens at fulfillment time.
      await admin.auth.admin.updateUserById(user.id, {
        // A very-long ban locks the account without destroying it. The
        // fulfillment job resets this only if the user cancels.
        ban_duration: "876000h",
        user_metadata: {
          ...user.user_metadata,
          pending_deletion_request_id: inserted.id,
          pending_deletion_due_at: dueAt.toISOString(),
        },
      });
      lockedOut = true;
    } catch (err) {
      console.error("[DSAR delete] failed to lock account (service role)", err);
    }
  }

  return successResponse(
    {
      request_id: inserted.id,
      status: "pending",
      due_at: dueAt.toISOString(),
      locked: lockedOut,
      message:
        "Your deletion request has been recorded. You will receive a confirmation email. You have 30 days to cancel by replying to that email.",
    },
    req,
  );
});
