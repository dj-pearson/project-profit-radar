/**
 * Error reporting for edge functions (US-251).
 *
 * Edge functions used to report failures with console.error only, so a billing
 * webhook that started failing at 3am paged nobody. Every function's top-level
 * catch now calls captureException (or its handler is wrapped in
 * withErrorReporting); scripts/check-edge-error-reporting.mjs holds that at
 * 100%. Setup and verification: docs/RUNBOOK_MONITORING.md.
 *
 * This talks to Sentry's HTTP envelope endpoint with plain fetch rather than
 * pulling in an SDK. That is deliberate: a URL import costs cold-start time on
 * every invocation of every function, and the envelope format is a stable
 * documented API. It also means this module has no dependencies, so it can be
 * tested under vitest — edge-function entry points import Deno URL modules that
 * vitest cannot load, so anything worth testing has to live here.
 *
 * Gated on EDGE_SENTRY_DSN. With the secret unset every call is a no-op, which
 * is what keeps this safe to add to a handler before the DSN exists.
 *
 * IT NEVER THROWS AND NEVER REJECTS. Reporting an error must not be able to
 * cause one — the same rule the audit writer follows. A failure to report is
 * itself only console.error'd.
 */

// deno-lint-ignore-file no-explicit-any

/**
 * Keys whose values never leave the function, at any depth. Matched as a
 * substring so STRIPE_SECRET_KEY, x-api-key, stripe-signature and
 * sb_access_token are all caught without listing every spelling. Over-matching
 * costs a redacted value in a report; under-matching costs a leaked credential.
 */
const SENSITIVE_KEY = /(authorization|cookie|api[-_]?key|apikey|secret|password|passwd|passphrase|token|jwt|bearer|session|signature|private[-_]?key|credential|code[-_]?verifier|backup[-_]?codes?|(?:^|[-_])otp(?:[-_]|$)|(?:^|[-_])ssn(?:[-_]|$)|card[-_]?number|cvc|cvv|iban|account[-_]?number|routing[-_]?number)/i;

/** Shapes that are secrets or PII wherever they appear, including inside message text. */
const SECRET_PATTERNS: Array<[RegExp, string | ((match: string, ...groups: string[]) => string)]> = [
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[jwt]'],
  [/\b(sk|rk)_(live|test)_[A-Za-z0-9]{8,}\b/g, '[stripe-secret-key]'],
  [/\bwhsec_[A-Za-z0-9]{8,}\b/g, '[stripe-webhook-secret]'],
  [/\bsk-(ant-)?[A-Za-z0-9_-]{20,}/g, '[api-key]'],
  [/\b(sbp|sb_secret|ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{16,}\b/g, '[api-key]'],
  [/\bxox[abprs]-[A-Za-z0-9-]{10,}/g, '[slack-token]'],
  [/\bAKIA[0-9A-Z]{16}\b/g, '[aws-access-key]'],
  [/\bBearer\s+[A-Za-z0-9._~+/=-]{12,}/gi, 'Bearer [redacted]'],
  [/\bBasic\s+[A-Za-z0-9+/=]{12,}/g, 'Basic [redacted]'],
  // user:password@ inside a URL (a Postgres connection string in an error).
  [/(\b[a-z][a-z0-9+.-]*:\/\/)[^\s/:@]+:[^\s/@]+@/gi, '$1[redacted]@'],
  // ?token=...&code=... in a logged URL.
  [/([?&](?:[a-z0-9_-]*(?:token|key|secret|signature|password|code|otp|sig)[a-z0-9_-]*)=)[^&#\s"']+/gi, '$1[redacted]'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]'],
  // Card numbers: 13-19 digits (optionally grouped) starting 2-6, the issuer
  // ranges, that pass the Luhn check. Millisecond timestamps start with 1 and
  // most long ids fail Luhn, so both stay readable.
  [/\b[2-6](?:[ -]?\d){11,17}[ -]?\d\b/g, (m) => (luhnValid(m.replace(/\D/g, '')) ? '[card-number]' : m)],
  // E.164-ish and North American phone numbers.
  [/(?<![\w.-])\+?1?[ .-]?\(?\d{3}\)?[ .-]\d{3}[ .-]\d{4}\b/g, '[phone]'],
];

export function luhnValid(digits: string): boolean {
  if (!/^\d{13,19}$/.test(digits)) return false;
  let sum = 0;
  for (let i = 0; i < digits.length; i++) {
    let d = digits.charCodeAt(digits.length - 1 - i) - 48;
    if (i % 2 === 1) { d *= 2; if (d > 9) d -= 9; }
    sum += d;
  }
  return sum % 10 === 0;
}

export function scrubString(input: string): string {
  let out = input;
  for (const [re, replacement] of SECRET_PATTERNS) {
    out = typeof replacement === 'string' ? out.replace(re, replacement) : out.replace(re, replacement);
  }
  return out;
}

/** Recursively redact sensitive keys and secret-shaped values. */
export function scrub(value: unknown, depth = 0): unknown {
  if (depth > 6) return '[depth-limit]';
  if (value == null) return value;
  if (typeof value === 'string') return scrubString(value);
  if (typeof value === 'number' || typeof value === 'boolean') return value;
  if (Array.isArray(value)) return value.slice(0, 50).map((v) => scrub(v, depth + 1));
  if (typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      out[k] = SENSITIVE_KEY.test(k) ? '[redacted]' : scrub(v, depth + 1);
    }
    return out;
  }
  return String(value);
}

export interface ParsedDsn {
  ingestUrl: string;
  publicKey: string;
  projectId: string;
}

/**
 * Turn https://<key>@<host>/<projectId> into the envelope endpoint.
 * Returns null for anything unparseable rather than throwing.
 */
export function parseDsn(dsn: string | undefined | null): ParsedDsn | null {
  if (!dsn) return null;
  try {
    const u = new URL(dsn);
    const publicKey = u.username;
    const projectId = u.pathname.replace(/^\//, '');
    if (!publicKey || !projectId) return null;
    return {
      ingestUrl: `${u.protocol}//${u.host}/api/${projectId}/envelope/`,
      publicKey,
      projectId,
    };
  } catch {
    return null;
  }
}

export interface ErrorContext {
  /** The edge function's name, e.g. 'stripe-webhook'. Must match its directory. */
  fn: string;
  companyId?: string | null;
  userId?: string | null;
  /** Correlates with the platform's own logs. Taken from `req` when omitted. */
  requestId?: string | null;
  /**
   * The incoming request. Only the method, the path (never the query string)
   * and a request-id header are read from it; no header value or body leaves.
   */
  req?: Request | null;
  /** Anything else useful. Scrubbed before it leaves. */
  extra?: Record<string, unknown>;
}

/** Request-id headers, in order of preference. */
const REQUEST_ID_HEADERS = ['sb-request-id', 'x-request-id', 'x-correlation-id', 'x-kong-request-id', 'cf-ray'];

export interface RequestInfo {
  requestId: string | null;
  method: string | null;
  /** origin + pathname. The query string is dropped: it is where tokens ride. */
  url: string | null;
}

/** Pull what a report may carry out of a request. Never throws. */
export function requestInfo(req: Request | null | undefined): RequestInfo {
  const info: RequestInfo = { requestId: null, method: null, url: null };
  if (!req) return info;
  try {
    for (const h of REQUEST_ID_HEADERS) {
      const v = req.headers?.get?.(h);
      if (v) { info.requestId = v.slice(0, 128); break; }
    }
  } catch { /* ignore */ }
  try { info.method = typeof req.method === 'string' ? req.method : null; } catch { /* ignore */ }
  try {
    const u = new URL(req.url);
    info.url = `${u.origin}${u.pathname}`;
  } catch { /* ignore */ }
  return info;
}

interface NormalizedError {
  type: string;
  message: string;
  stack?: string;
  /** Own fields of a thrown plain object (a PostgrestError, say). */
  fields?: Record<string, unknown>;
}

/**
 * supabase-js errors are plain objects ({ message, code, details, hint }), and
 * `String(obj)` of one is "[object Object]". Keep the message and fields.
 */
export function normalizeError(err: unknown): NormalizedError {
  if (err instanceof Error) {
    return { type: err.name || 'Error', message: err.message, stack: err.stack };
  }
  if (err && typeof err === 'object') {
    const o = err as Record<string, unknown>;
    const message = typeof o.message === 'string' ? o.message : safeJson(o);
    const type = typeof o.name === 'string' ? o.name : typeof o.code === 'string' ? `Error ${o.code}` : 'NonErrorThrown';
    return { type, message, fields: o };
  }
  return { type: 'NonErrorThrown', message: String(err) };
}

function safeJson(v: unknown): string {
  try { return JSON.stringify(v)?.slice(0, 1000) ?? String(v); } catch { return String(v); }
}

export interface StackFrame {
  function?: string;
  filename?: string;
  lineno?: number;
  colno?: number;
  in_app?: boolean;
}

/**
 * Parse a V8 stack into Sentry frames, oldest call first (Sentry's order).
 * Unrecognised lines are skipped rather than guessed at.
 */
export function parseStack(stack: string | undefined): StackFrame[] {
  if (!stack) return [];
  const frames: StackFrame[] = [];
  for (const line of stack.split('\n').slice(1, 51)) {
    const m = /^\s*at\s+(?:(.*?)\s+\()?(.+?):(\d+):(\d+)\)?\s*$/.exec(line);
    if (!m) continue;
    const filename = m[2];
    frames.push({
      function: m[1] || '<anonymous>',
      filename,
      lineno: Number(m[3]),
      colno: Number(m[4]),
      in_app: !/^(https?:|node:|ext:|deno:)/.test(filename) || /\/functions\//.test(filename),
    });
  }
  return frames.reverse();
}

export function newEventId(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function scrubFields(event: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(event)) out[k] = scrub(v);
  return out;
}

/** Build the Sentry envelope body. Exported for testing. */
export function buildEnvelope(
  err: unknown,
  ctx: ErrorContext,
  dsn: ParsedDsn,
  sentAt: string,
  eventId: string = newEventId(),
): string {
  const error = normalizeError(err);
  const req = requestInfo(ctx.req);
  const requestId = ctx.requestId ?? req.requestId;
  const frames = parseStack(error.stack);

  const header = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: `${dsn.ingestUrl}`,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  // Scrubbed per top-level field so the depth limit counts from each field,
  // not from the envelope root; otherwise stack frames sit past it.
  const event = JSON.stringify(scrubFields({
    event_id: eventId,
    timestamp: sentAt,
    platform: 'javascript',
    level: 'error',
    logger: 'edge-function',
    server_name: ctx.fn,
    transaction: ctx.fn,
    tags: {
      function: ctx.fn,
      ...(ctx.companyId ? { company_id: ctx.companyId } : {}),
      ...(requestId ? { request_id: requestId } : {}),
      ...(req.method ? { method: req.method } : {}),
    },
    user: ctx.userId ? { id: ctx.userId } : undefined,
    request: req.url ? { method: req.method ?? undefined, url: req.url } : undefined,
    exception: {
      values: [{
        type: error.type,
        value: error.message,
        stacktrace: frames.length ? { frames } : undefined,
      }],
    },
    extra: error.fields || ctx.extra ? { ...(error.fields ? { thrown: error.fields } : {}), ...ctx.extra } : undefined,
  }));

  return `${header}\n${itemHeader}\n${event}\n`;
}

function readDsn(): string | undefined {
  // Deno is absent under vitest; the typeof guard keeps this module importable there.
  try {
    return typeof Deno !== 'undefined' ? Deno.env.get('EDGE_SENTRY_DSN') ?? undefined : undefined;
  } catch {
    return undefined;
  }
}

/** A report that cannot reach Sentry in this long is abandoned, not waited on. */
export const REPORT_TIMEOUT_MS = 2000;

/**
 * Report an error to Sentry. No-ops when EDGE_SENTRY_DSN is unset.
 *
 * Resolves to the Sentry event id when Sentry accepted the event, otherwise
 * null (no DSN, a bad DSN, a rejection, a timeout, a dead network). It never
 * rejects. Handlers ignore the value; the smoke test uses it to look the event
 * up through Sentry's API.
 *
 *   } catch (error) {
 *     await captureException(error, { fn: 'stripe-webhook', req });
 *     return errorResponse(...);
 *   }
 *
 * scripts/check-edge-error-reporting.mjs fails the commit when a function's
 * top-level catch does not call this.
 */
export async function captureException(
  err: unknown,
  ctx: ErrorContext,
  opts: { dsn?: string; fetchImpl?: typeof fetch; now?: () => Date; timeoutMs?: number } = {},
): Promise<string | null> {
  try {
    const parsed = parseDsn(opts.dsn ?? readDsn());
    if (!parsed) return null;

    const fetchImpl = opts.fetchImpl ?? fetch;
    const sentAt = (opts.now?.() ?? new Date()).toISOString();
    const eventId = newEventId();
    const body = buildEnvelope(err, ctx, parsed, sentAt, eventId);

    // The caller awaits this on its error path; a hung Sentry must not hang the
    // response. AbortController rather than AbortSignal.timeout so the timer
    // can be cleared and does not keep an isolate alive.
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? REPORT_TIMEOUT_MS);
    try {
      const response = await fetchImpl(parsed.ingestUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-sentry-envelope',
          'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=brikly-edge/1.0`,
        },
        body,
        signal: controller.signal,
      });
      if (!response.ok) {
        console.error(`[observability] Sentry rejected the event for ${ctx.fn}: HTTP ${response.status}`);
        return null;
      }
      return eventId;
    } finally {
      clearTimeout(timer);
    }
  } catch (reportingError) {
    // Reporting an error must never become one.
    console.error('[observability] failed to report an error', String(reportingError));
    return null;
  }
}

/**
 * Wrap a request handler so anything that escapes it is reported, then
 * rethrown so the runtime answers exactly as it did before (a 500).
 *
 * For handlers with no single outer try/catch to put captureException in:
 * ones whose body is a sequence of independent steps, or that deliberately
 * let a failure escape. A handler that catches and answers its own errors
 * still has to call captureException in that catch; this wrapper never sees
 * those errors.
 *
 *   serve(withErrorReporting('data-subject-export', async (req) => { ... }));
 */
export function withErrorReporting(
  fn: string,
  handler: (req: Request) => Response | Promise<Response>,
  opts: { dsn?: string; fetchImpl?: typeof fetch } = {},
): (req: Request) => Promise<Response> {
  return async (req: Request) => {
    try {
      return await handler(req);
    } catch (error) {
      await captureException(error, { fn, req }, opts);
      throw error;
    }
  };
}
