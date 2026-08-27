/**
 * Error reporting for edge functions (US-251).
 *
 * 193 functions report failures with console.error and nothing aggregates them,
 * so a billing webhook that starts failing at 3am pages nobody. Sentry was wired
 * only into the web frontend and iOS.
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

/** Keys whose values never leave the function, at any depth. */
const SENSITIVE_KEY = /^(authorization|cookie|set-cookie|api[-_]?key|x[-_]api[-_]key|apikey|access[-_]token|refresh[-_]token|id[-_]token|secret|client[-_]secret|password|passwd|token|jwt|bearer|session|signature|private[-_]key|code[-_]verifier|backup[-_]codes?)$/i;

/** Shapes that are secrets wherever they appear, including inside message text. */
const SECRET_PATTERNS: Array<[RegExp, string]> = [
  [/\beyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\b/g, '[jwt]'],
  [/\bsk_(live|test)_[A-Za-z0-9]{8,}\b/g, '[stripe-secret-key]'],
  [/\bwhsec_[A-Za-z0-9]{8,}\b/g, '[stripe-webhook-secret]'],
  [/\bBearer\s+[A-Za-z0-9._-]{12,}/gi, 'Bearer [redacted]'],
  [/\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g, '[email]'],
];

export function scrubString(input: string): string {
  let out = input;
  for (const [re, replacement] of SECRET_PATTERNS) out = out.replace(re, replacement);
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
  /** The edge function's name, e.g. 'stripe-webhook'. */
  fn: string;
  companyId?: string | null;
  userId?: string | null;
  /** Correlates with the platform's own logs. */
  requestId?: string | null;
  /** Anything else useful. Scrubbed before it leaves. */
  extra?: Record<string, unknown>;
}

/** Build the Sentry envelope body. Exported for testing. */
export function buildEnvelope(err: unknown, ctx: ErrorContext, dsn: ParsedDsn, sentAt: string): string {
  const error = err instanceof Error ? err : new Error(String(err));
  const eventId = crypto.randomUUID().replace(/-/g, '');

  const header = JSON.stringify({
    event_id: eventId,
    sent_at: sentAt,
    dsn: `${dsn.ingestUrl}`,
  });
  const itemHeader = JSON.stringify({ type: 'event' });
  const event = JSON.stringify(scrub({
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
      ...(ctx.requestId ? { request_id: ctx.requestId } : {}),
    },
    user: ctx.userId ? { id: ctx.userId } : undefined,
    exception: {
      values: [{
        type: error.name,
        value: error.message,
        stacktrace: error.stack ? { frames: [{ filename: ctx.fn, function: error.stack.split('\n')[1]?.trim() }] } : undefined,
      }],
    },
    extra: ctx.extra,
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

/**
 * Report an error to Sentry. No-ops when EDGE_SENTRY_DSN is unset.
 *
 *   } catch (err) {
 *     await captureException(err, { fn: 'stripe-webhook', requestId: event.id });
 *     return errorResponse(...);
 *   }
 */
export async function captureException(
  err: unknown,
  ctx: ErrorContext,
  opts: { dsn?: string; fetchImpl?: typeof fetch; now?: () => Date } = {},
): Promise<void> {
  try {
    const parsed = parseDsn(opts.dsn ?? readDsn());
    if (!parsed) return;

    const fetchImpl = opts.fetchImpl ?? fetch;
    const sentAt = (opts.now?.() ?? new Date()).toISOString();
    const body = buildEnvelope(err, ctx, parsed, sentAt);

    const response = await fetchImpl(parsed.ingestUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-sentry-envelope',
        'X-Sentry-Auth': `Sentry sentry_version=7, sentry_key=${parsed.publicKey}, sentry_client=brikly-edge/1.0`,
      },
      body,
    });

    if (!response.ok) {
      console.error(`[observability] Sentry rejected the event for ${ctx.fn}: HTTP ${response.status}`);
    }
  } catch (reportingError) {
    // Reporting an error must never become one.
    console.error('[observability] failed to report an error', String(reportingError));
  }
}
