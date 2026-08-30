/**
 * The one definition of "a URL this platform is willing to fetch" (US-241).
 *
 * Twelve SEO functions - analyze-content, analyze-images,
 * analyze-internal-links, analyze-semantic-keywords, check-broken-links,
 * check-mobile-first, check-security-headers, monitor-performance-budget,
 * optimize-page-content, seo-audit, validate-structured-data and crawl-site -
 * take a URL out of the request body and `await fetch(url)` it. The only check
 * any of them made was `if (!url)`, so a caller decided what the edge runtime
 * connected to, and the edge runtime holds SUPABASE_SERVICE_ROLE_KEY.
 *
 * SCOPE, STATED HONESTLY: all twelve enforce `role !== 'root_admin'` and
 * return 403, verified rather than assumed - a `root_admin` mention is not an
 * enforcement, which is a mistake this repo has already made once in the
 * DELEGATES map. So this is an unvalidated fetch behind the highest privilege
 * level, not an open SSRF. It is worth closing because "the operator is
 * trusted" is not the same as "the operator meant to point the platform's
 * service-role runtime at 169.254.169.254", and a stored target_url (set
 * through manage-schedules, fetched later by run-scheduled-audit) turns one
 * bad value into a recurring request.
 *
 * AND WHEN IT ACTUALLY BLOCKS: not yet. validateBody defaults to report mode,
 * where a failed parse is logged and the handler still receives the raw body.
 * Until INPUT_VALIDATION_MODE=enforce is set on the project, this schema
 * documents and reports; it does not reject. That staging is deliberate (see
 * validate-body.ts) and it is the reason this can ship as one change rather
 * than twelve careful ones.
 */

import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";
import { describeAuditUrl } from "./audit-url-rules.ts";

export { describeAuditUrl, BLOCKED_HOSTS } from "./audit-url-rules.ts";

/** `url`-shaped field for an audit target. */
export const auditUrl = z
  .string()
  .min(1)
  .max(2048)
  .refine((v) => describeAuditUrl(v) === null, (v) => ({
    message: describeAuditUrl(v) ?? 'is not a fetchable URL',
  }));
