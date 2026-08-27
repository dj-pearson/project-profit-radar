// process-dsar-fulfillment
//
// Nightly job that finalizes expired data_subject_requests. Scheduled via
// Supabase cron (see supabase/config.toml or the Supabase dashboard) to run
// once per day; idempotent and safe to run more often.
//
// Responsibilities:
//   1. Find all data_subject_requests rows where status='pending' AND
//      due_at <= now(). These are the requests whose 30-day grace period
//      has elapsed.
//   2. For 'deletion' requests: erase the subject's uploaded files from
//      storage, then delete the user's auth row (CASCADE clears dependent
//      tables via foreign keys) and mark the request completed.
//      Any retained-for-law records (tax, payroll) are expected to live in
//      tables WITHOUT a cascading FK — those tables continue to hold the
//      data as documented in the Privacy Policy retention section.
//
//      Storage erasure (US-290): deleting an auth user does NOT cascade into
//      storage, so before this was added every photo, receipt, drawing and
//      chat attachment survived a fulfilled erasure request. Files are found
//      by storage.objects.owner because upload paths in this codebase are
//      keyed by entity (inspections/<id>/, task-attachments/<task_id>/)
//      rather than by user or company. Personal buckets are always erased;
//      company buckets only when the subject is the last user of their
//      company, since Customer Content belongs to the employer and Brikly
//      holds it as a processor (Privacy Policy sections 1 and 6). Storage
//      failures leave the request pending for retry rather than marking it
//      completed, so we never report an erasure we did not perform.
//   3. For 'access' / 'portability' / 'correction' requests that are still
//      pending past the statutory deadline, flag them for manual review by
//      emailing privacy@ — we do NOT auto-fulfill these because they
//      require judgment.
//   4. Write audit rows with the fulfillment outcome.
//
// Authentication:
//   This function is invoked by the Supabase cron scheduler which uses the
//   service role. We explicitly refuse to run on any other invocation so it
//   cannot be called from the browser or from an authenticated user session.
//
// Failure mode:
//   Each request is processed in its own try/catch — a single failing row
//   does not stop the batch. Failures increment a retry counter; after 5
//   failed attempts the request is moved to status='denied' with a human-
//   readable denial_reason so the privacy team can investigate.

import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.50.3";
import { getCorsHeaders } from "../_shared/secure-cors.ts";
import { requireSystemOrAdmin } from "../_shared/system-auth.ts";
import { isInErasureScope } from "../_shared/storage-buckets.ts";
import { writeAuditLog } from "../_shared/audit-log.ts";

const SERVICE_ROLE = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL");

interface DSARRow {
  id: string;
  user_id: string | null;
  company_id: string | null;
  email: string | null;
  request_type: string;
  status: string;
  due_at: string;
  notes: string | null;
}

const MAX_RETRIES = 5;
const BATCH_SIZE = 50;

serve(async (req) => {
  const corsHeaders = getCorsHeaders(req);
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (!SERVICE_ROLE || !SUPABASE_URL) {
    return new Response("Service not configured", { status: 500 });
  }

  // Auth: this is a GDPR data-deletion job, so unlike the other cron functions
  // it must NEVER fail open. Accept either the existing service-role bearer the
  // current scheduler already sends, or the standardized requireSystemOrAdmin
  // path (CRON_SECRET header or an admin user). If neither is present we reject
  // explicitly rather than relying on requireSystemOrAdmin's staged fail-open.
  const legacyAuth = req.headers.get("authorization") ?? "";
  const hasServiceBearer = legacyAuth === `Bearer ${SERVICE_ROLE}`;
  if (!hasServiceBearer) {
    const denied = await requireSystemOrAdmin(req);
    if (denied) return denied;
    // requireSystemOrAdmin fails open when CRON_SECRET is unset; that is too
    // permissive for irreversible deletions, so require an explicit secret.
    if (!Deno.env.get("CRON_SECRET")) {
      console.error("[dsar-fulfill] unauthorized invocation rejected (no service bearer / CRON_SECRET)");
      return new Response("Forbidden", { status: 403 });
    }
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: dueRows, error: fetchError } = await admin
    .from("data_subject_requests")
    .select("id, user_id, company_id, email, request_type, status, due_at, notes")
    .eq("status", "pending")
    .lte("due_at", new Date().toISOString())
    .limit(BATCH_SIZE);

  if (fetchError) {
    console.error("[dsar-fulfill] failed to fetch due rows", fetchError);
    return new Response(JSON.stringify({ error: fetchError.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  const rows = (dueRows ?? []) as DSARRow[];
  console.log(`[dsar-fulfill] processing ${rows.length} due request(s)`);

  let fulfilled = 0;
  let denied = 0;
  let flagged = 0;
  // US-300: these are statutory requests on a 30-day clock, and every status
  // write below is a supabase-js call that RETURNS its error rather than
  // throwing. An unwritten status leaves the request pending, so the next run
  // picks it up again and the counts reported here describe work that did not
  // happen. Surfaced rather than dropped.
  let bookkeeping_failures = 0;

  for (const row of rows) {
    try {
      if (row.request_type === "deletion") {
        if (!row.user_id) {
          await markCompleted(
            admin,
            row.id,
            "No user_id on record; nothing to purge.",
          );
          fulfilled += 1;
          continue;
        }
        // Erase uploaded files BEFORE deleting the auth user: storage
        // ownership is recorded as the auth uid, so once the user row is
        // gone the link from file to person is gone with it and the objects
        // become unattributable orphans.
        const erasure = await eraseSubjectStorage(admin, row.user_id, row.company_id);
        if (erasure.errors.length > 0) {
          // Leave the request pending so the next run retries. Marking it
          // completed here would tell the subject their files were erased
          // when some still exist.
          throw new Error(
            `storage erasure incomplete (${erasure.errors.length} failure(s)): ${erasure.errors.join("; ")}`,
          );
        }

        // Delete the auth user. Dependent data in tables with
        // ON DELETE CASCADE will be removed. Tables without a cascade are
        // intentionally retained (statutory retention — see Privacy Policy).
        const { error: deleteError } = await admin.auth.admin.deleteUser(row.user_id);
        if (deleteError) {
          throw new Error(deleteError.message);
        }
        // Also purge any optional soft-delete markers or remaining rows
        // that were intentionally orphan-safe.
        // NOT .catch(() => undefined). PostgrestBuilder implements PromiseLike:
        // it has then() and no catch(), so calling .catch() threw a TypeError
        // BEFORE the request was ever sent. That threw out of this block after
        // admin.auth.admin.deleteUser had already succeeded, so every erasure
        // landed in the outer catch, accumulated a retry note, and after
        // MAX_RETRIES was auto-DENIED - a GDPR erasure recorded as denied on an
        // account that had in fact been deleted. This preference row has also
        // never been purged. (US-300; same bug class as US-303.)
        const { error: prefsError } = await admin
          .from("email_preferences")
          .delete()
          .eq("user_id", row.user_id);
        if (prefsError) {
          // Not fatal - the auth user is gone and cascades have run. Record it
          // on the request rather than failing an erasure that did happen.
          bookkeeping_failures += 1;
          console.error(
            `[dsar-fulfill] ${row.id} email_preferences not purged for deleted user`,
            prefsError,
          );
        }
        await markCompleted(
          admin,
          row.id,
          `Account deleted after 30-day grace period. ${erasure.removed} stored file(s) erased` +
            (erasure.retained > 0
              ? `; ${erasure.retained} company-owned file(s) retained because other users remain at the company (Customer Content erasure runs through the workspace admin, per Privacy Policy §6)`
              : "") +
            ". Retained records (tax, payroll, audit) preserved per Privacy Policy §5.",
        );
        // Audit trail (US-244): the erasure actually happened. This runs from
        // cron or an admin, so there may be no session user — the row records
        // the subject and what was removed versus retained, which is what a
        // regulator asks to see.
        await writeAuditLog(admin, {
          actorUserId: null,
          companyId: row.company_id,
          action: 'data_subject.erasure_fulfilled',
          entityType: 'dsar_request',
          entityId: row.id,
          after: {
            subject_user_id: row.user_id,
            files_erased: erasure.removed,
            files_retained: erasure.retained,
          },
          description: 'Account deleted and stored files erased after the 30-day grace period',
          riskLevel: 'critical',
        });

        fulfilled += 1;
        continue;
      }

      if (row.request_type === "opt_out_sale_share") {
        // Purely preference-based — mark completed. State is maintained in
        // email_preferences / consent_ledger; no data purge required.
        await markCompleted(admin, row.id, "Opt-out applied.");
        fulfilled += 1;
        continue;
      }

      // Access / portability / correction / restrict / object all require a
      // human reviewer — flag for the privacy team.
      const { error: flagError } = await admin
        .from("data_subject_requests")
        .update({
          status: "in_progress",
          notes: `${row.notes ?? ""}\n[cron ${new Date().toISOString()}] Auto-flagged for privacy-team review (no automated fulfillment path).`,
        })
        .eq("id", row.id);
      if (flagError) {
        bookkeeping_failures += 1;
        console.error(`[dsar-fulfill] ${row.id} could not be flagged for review`, flagError);
      } else {
        flagged += 1;
      }
    } catch (err) {
      console.error(`[dsar-fulfill] failed to process ${row.id}`, err);
      const newNotes = `${row.notes ?? ""}\n[cron ${new Date().toISOString()}] failure: ${
        err instanceof Error ? err.message : String(err)
      }`;
      // Count failures by scanning notes — avoids schema change. After
      // MAX_RETRIES failures, deny the request so it stops consuming the
      // batch budget.
      const retryCount = (newNotes.match(/\[cron /g) ?? []).length;
      if (retryCount >= MAX_RETRIES) {
        const { error: denyError } = await admin
          .from("data_subject_requests")
          .update({
            status: "denied",
            denial_reason: `Auto-denied after ${MAX_RETRIES} fulfillment failures. Last error: ${err instanceof Error ? err.message : String(err)}`,
            notes: newNotes,
          })
          .eq("id", row.id);
        if (denyError) {
          bookkeeping_failures += 1;
          console.error(`[dsar-fulfill] ${row.id} could not be auto-denied`, denyError);
        } else {
          denied += 1;
        }
      } else {
        // The retry counter lives in these very notes - retryCount above is
        // derived by counting "[cron " markers in them. So a note that is not
        // written means the counter never advances, MAX_RETRIES is never
        // reached, and the request is retried on every run forever.
        const { error: noteError } = await admin
          .from("data_subject_requests")
          .update({ notes: newNotes })
          .eq("id", row.id);
        if (noteError) {
          bookkeeping_failures += 1;
          console.error(
            `[dsar-fulfill] ${row.id} retry note not written; its retry counter will not advance`,
            noteError,
          );
        }
      }
    }
  }

  return new Response(
    JSON.stringify({
      processed: rows.length,
      fulfilled,
      denied,
      flagged_for_review: flagged,
      bookkeeping_failures,
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
});

async function markCompleted(
  admin: ReturnType<typeof createClient>,
  id: string,
  note: string,
) {
  // Throws on failure so the caller counts it rather than reporting a request
  // as fulfilled when its status never changed. For a deletion that matters
  // twice over: the data is already purged, and a request left pending is
  // re-processed on the next run.
  const { error } = await admin
    .from("data_subject_requests")
    .update({
      status: "completed",
      completed_at: new Date().toISOString(),
      notes: note,
    })
    .eq("id", id);
  if (error) {
    throw new Error(`could not mark request ${id} completed: ${error.message}`);
  }
}

/**
 * Remove the data subject's uploaded files.
 *
 * Returns counts rather than throwing so the caller can decide what to do with
 * partial failure. `errors` being non-empty means at least one object could not
 * be removed and the request must not be marked completed.
 */
async function eraseSubjectStorage(
  admin: ReturnType<typeof createClient>,
  userId: string,
  companyId: string | null,
): Promise<{ removed: number; retained: number; errors: string[] }> {
  const errors: string[] = [];

  const { data: objects, error: listError } = await admin.rpc("dsar_list_subject_objects", {
    p_user_id: userId,
  });
  if (listError) {
    return { removed: 0, retained: 0, errors: [`list failed: ${listError.message}`] };
  }

  const rows = (objects ?? []) as { bucket_id: string; object_name: string }[];
  if (rows.length === 0) return { removed: 0, retained: 0, errors };

  let isLastCompanyUser = false;
  if (companyId) {
    const { data: isLast, error: lastError } = await admin.rpc("dsar_is_last_company_user", {
      p_user_id: userId,
      p_company_id: companyId,
    });
    if (lastError) {
      // Cannot establish scope. Treat as "not last" so we under-delete rather
      // than destroy an active company's records on a failed lookup.
      errors.push(`company scope check failed: ${lastError.message}`);
      return { removed: 0, retained: rows.length, errors };
    }
    isLastCompanyUser = Boolean(isLast);
  }

  // Group in-scope objects by bucket so each bucket is one remove() call.
  const byBucket = new Map<string, string[]>();
  let retained = 0;
  for (const obj of rows) {
    if (!isInErasureScope(obj.bucket_id, isLastCompanyUser)) {
      retained += 1;
      continue;
    }
    const paths = byBucket.get(obj.bucket_id) ?? [];
    paths.push(obj.object_name);
    byBucket.set(obj.bucket_id, paths);
  }

  let removed = 0;
  for (const [bucket, paths] of byBucket) {
    // remove() caps at a few hundred paths per call; chunk to stay well under.
    for (let i = 0; i < paths.length; i += 100) {
      const chunk = paths.slice(i, i + 100);
      const { error } = await admin.storage.from(bucket).remove(chunk);
      if (error) {
        errors.push(`${bucket}: ${error.message}`);
      } else {
        removed += chunk.length;
      }
    }
  }

  console.log(
    `[dsar-fulfill] storage erasure for ${userId}: ${removed} removed, ${retained} retained, ${errors.length} error(s)`,
  );
  return { removed, retained, errors };
}
