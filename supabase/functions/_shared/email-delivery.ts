/**
 * Transactional email delivery: retry, idempotency and the delivery ledger
 * (US-253).
 *
 * Every edge function that sends mail goes through sendEmail() in
 * ./ses-email-service.ts, and that function is a thin Deno wiring of
 * sendWithLedger() below. Everything that decides something lives here, with
 * no remote imports and no Deno globals, so vitest can run it
 * (email-delivery.test.ts).
 *
 * What a send does, in order:
 *
 *   1. Normalise recipients. No recipient is a failure, not a send.
 *   2. Claim the idempotency key in email_deliveries. A key that already sent
 *      returns the stored messageId and does not send again, so a cron job that
 *      reruns, or a queue item that is retried after the mail went out, does
 *      not mail the same person twice. A key another invocation is still
 *      sending is left alone. A key that failed or dead-lettered is reclaimed
 *      and tried again.
 *   3. Send through the transport with bounded retry. HTTP 429, 408 and 5xx and
 *      SMTP 4xx replies (and dropped connections) are retried with exponential
 *      backoff and full jitter, honouring Retry-After. Anything else (a 4xx, an
 *      SMTP 5xx, a missing credential) fails at once: retrying a rejected
 *      address only burns sender reputation.
 *   4. Record the outcome on the ledger row: provider messageId on success,
 *      'failed' for a permanent refusal, 'dead_letter' when retries ran out.
 *   5. Report every failure to Sentry through the edge-function hook.
 *
 * The ledger never blocks a send. If the table is missing (migration not yet
 * applied) or a write fails, the mail still goes and the gap is reported.
 */

export type EmailCategory =
  | 'transactional'
  | 'security_alerts'
  | 'product_updates'
  | 'marketing'
  | 'newsletter';

export type DeliveryStatus = 'sending' | 'sent' | 'failed' | 'dead_letter' | 'suppressed';

export interface OutboundMessage {
  from: string;
  to: string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  headers?: Record<string, string>;
}

export type TransportOutcome =
  | { ok: true; messageId: string | null }
  | {
      ok: false;
      retryable: boolean;
      error: string;
      statusCode?: number | null;
      retryAfterMs?: number | null;
    };

export interface EmailTransport {
  /** 'ses-api' or 'ses-smtp' - which path carried the message. */
  readonly name: string;
  send(message: OutboundMessage, ctx: { idempotencyKey: string; attempt: number }): Promise<TransportOutcome>;
}

export interface RetryPolicy {
  maxAttempts: number;
  baseDelayMs: number;
  maxDelayMs: number;
}

/**
 * Three attempts, 0.5s then 1s (jittered). Edge functions answer a request
 * while this runs, so the whole budget stays in single-digit seconds; a longer
 * outage lands in dead_letter, where it is visible, rather than in a timeout.
 */
export const DEFAULT_RETRY_POLICY: RetryPolicy = {
  maxAttempts: 3,
  baseDelayMs: 500,
  maxDelayMs: 4000,
};

/** Longest Retry-After we will sit through inside one request. */
export const MAX_RETRY_AFTER_MS = 5000;

/** A 'sending' row older than this is a send that died mid-flight. */
export const STALE_SENDING_MS = 15 * 60 * 1000;

// ---------------------------------------------------------------------------
// Failure classification
// ---------------------------------------------------------------------------

/** HTTP statuses worth another attempt: throttling, timeouts, server faults. */
export function isRetryableHttpStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

/**
 * Retry-After is either delta-seconds or an HTTP date. Returns milliseconds,
 * or null when absent or unreadable.
 */
export function parseRetryAfter(value: string | null | undefined, now: number = Date.now()): number | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d+$/.test(trimmed)) return Number(trimmed) * 1000;
  const at = Date.parse(trimmed);
  if (Number.isNaN(at)) return null;
  return Math.max(0, at - now);
}

/** Classify an HTTP response from a mail API. The body is only used for the message. */
export function classifyHttpFailure(
  status: number,
  body: string,
  retryAfter: string | null = null,
  now: number = Date.now(),
): TransportOutcome {
  return {
    ok: false,
    retryable: isRetryableHttpStatus(status),
    statusCode: status,
    retryAfterMs: parseRetryAfter(retryAfter, now),
    error: `HTTP ${status}: ${truncate(body, 500)}`,
  };
}

const TRANSIENT_NETWORK = /timed? ?out|timeout|ECONNRESET|ECONNREFUSED|EPIPE|broken pipe|connection (?:reset|closed|refused)|network|unexpected eof|temporar/i;

/**
 * Classify an error thrown by an SMTP client. SMTP inverts HTTP: 4xx replies
 * are transient ("try again later"), 5xx are permanent. A thrown error with no
 * reply code is a transport problem (DNS, TLS, a dropped socket), which is
 * worth one more try.
 */
export function classifySmtpError(err: unknown): TransportOutcome {
  const message = err instanceof Error ? err.message : String(err);
  const code = /\b([245]\d\d)\b/.exec(message);
  if (code) {
    const n = Number(code[1]);
    return { ok: false, retryable: n >= 400 && n < 500, statusCode: n, error: `SMTP ${truncate(message, 500)}` };
  }
  return { ok: false, retryable: TRANSIENT_NETWORK.test(message), statusCode: null, error: `SMTP ${truncate(message, 500)}` };
}

// ---------------------------------------------------------------------------
// Backoff
// ---------------------------------------------------------------------------

/** Uniform in [0, 1) from the platform CSPRNG. Jitter needs no more than that. */
export function secureRandom(): number {
  const buf = new Uint32Array(1);
  crypto.getRandomValues(buf);
  return buf[0] / 0x100000000;
}

/**
 * Delay before the attempt after `failedAttempt` (1-based). Exponential with
 * full jitter, capped; a server-sent Retry-After wins when it is longer, up to
 * MAX_RETRY_AFTER_MS.
 */
export function backoffDelayMs(
  failedAttempt: number,
  policy: RetryPolicy = DEFAULT_RETRY_POLICY,
  retryAfterMs: number | null = null,
  random: () => number = secureRandom,
): number {
  const ceiling = Math.min(policy.maxDelayMs, policy.baseDelayMs * 2 ** Math.max(0, failedAttempt - 1));
  const jittered = Math.floor(ceiling / 2 + random() * (ceiling / 2));
  if (retryAfterMs !== null && retryAfterMs > jittered) return Math.min(retryAfterMs, MAX_RETRY_AFTER_MS);
  return jittered;
}

export interface AttemptRecord {
  attempt: number;
  ok: boolean;
  error?: string;
  statusCode?: number | null;
}

export interface RetryResult {
  status: 'sent' | 'failed' | 'dead_letter';
  attempts: number;
  messageId: string | null;
  error: string | null;
  statusCode: number | null;
  history: AttemptRecord[];
}

/**
 * Send with bounded retry. Never throws: a transport that throws is treated as
 * a retryable failure, since that is what a dropped connection looks like.
 */
export async function deliverWithRetry(
  transport: EmailTransport,
  message: OutboundMessage,
  opts: {
    idempotencyKey: string;
    policy?: RetryPolicy;
    sleep?: (ms: number) => Promise<void>;
    random?: () => number;
  },
): Promise<RetryResult> {
  const policy = opts.policy ?? DEFAULT_RETRY_POLICY;
  const sleep = opts.sleep ?? ((ms: number) => new Promise<void>((r) => setTimeout(r, ms)));
  const history: AttemptRecord[] = [];
  let last: TransportOutcome = { ok: false, retryable: false, error: 'not attempted' };

  for (let attempt = 1; attempt <= Math.max(1, policy.maxAttempts); attempt++) {
    try {
      last = await transport.send(message, { idempotencyKey: opts.idempotencyKey, attempt });
    } catch (err) {
      last = {
        ok: false,
        retryable: true,
        statusCode: null,
        error: truncate(err instanceof Error ? err.message : String(err), 500),
      };
    }

    if (last.ok) {
      history.push({ attempt, ok: true });
      return { status: 'sent', attempts: attempt, messageId: last.messageId, error: null, statusCode: null, history };
    }

    history.push({ attempt, ok: false, error: last.error, statusCode: last.statusCode ?? null });

    if (!last.retryable) {
      return { status: 'failed', attempts: attempt, messageId: null, error: last.error, statusCode: last.statusCode ?? null, history };
    }
    if (attempt < policy.maxAttempts) {
      await sleep(backoffDelayMs(attempt, policy, last.retryAfterMs ?? null, opts.random));
    }
  }

  const failed = last as Extract<TransportOutcome, { ok: false }>;
  return {
    status: 'dead_letter',
    attempts: history.length,
    messageId: null,
    error: failed.error,
    statusCode: failed.statusCode ?? null,
    history,
  };
}

// ---------------------------------------------------------------------------
// Recipients and keys
// ---------------------------------------------------------------------------

const EMAIL = /^[^\s@<>(),;:"]+@[^\s@<>(),;:"]+\.[^\s@<>(),;:"]+$/;

/** Trim, lower-case the domain, drop blanks and duplicates. Invalid addresses are returned separately. */
export function normalizeRecipients(to: string | string[] | null | undefined): { valid: string[]; invalid: string[] } {
  const list = (Array.isArray(to) ? to : [to]).filter((x): x is string => typeof x === 'string');
  const seen = new Set<string>();
  const valid: string[] = [];
  const invalid: string[] = [];
  for (const raw of list) {
    const addr = raw.trim();
    if (!addr) continue;
    if (!EMAIL.test(addr)) {
      invalid.push(addr);
      continue;
    }
    const at = addr.lastIndexOf('@');
    const canonical = addr.slice(0, at) + '@' + addr.slice(at + 1).toLowerCase();
    const dedupe = canonical.toLowerCase();
    if (seen.has(dedupe)) continue;
    seen.add(dedupe);
    valid.push(canonical);
  }
  return { valid, invalid };
}

/** Idempotency keys are stored and sent as a provider tag, so keep them to a safe alphabet. */
export const IDEMPOTENCY_KEY_PATTERN = /^[A-Za-z0-9_.:-]{8,200}$/;

async function sha256Hex(input: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(input));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

/**
 * A stable key for "this message, once": the scope names the kind of mail and
 * the parts name the occasion (an invoice id and reminder type, a company and a
 * trial stage). Parts are hashed so no address or id leaks into a provider tag.
 *
 *   await emailIdempotencyKey('payment_reminder', invoiceId, 'overdue_7', '2026-09-24')
 */
export async function emailIdempotencyKey(
  scope: string,
  ...parts: Array<string | number | null | undefined>
): Promise<string> {
  const safeScope = scope.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 60) || 'email';
  const hash = await sha256Hex(JSON.stringify(parts.map((p) => (p === undefined ? null : p))));
  return `${safeScope}:${hash.slice(0, 40)}`;
}

/** A key for a one-off message with no natural occasion: it only dedupes our own retries. */
export function randomIdempotencyKey(scope = 'email'): string {
  const safeScope = scope.replace(/[^A-Za-z0-9_.-]/g, '_').slice(0, 60) || 'email';
  return `${safeScope}:${crypto.randomUUID()}`;
}

// ---------------------------------------------------------------------------
// The ledger
// ---------------------------------------------------------------------------

export interface DeliveryRowInsert {
  idempotency_key: string;
  company_id: string | null;
  provider: string;
  transport: string;
  category: EmailCategory;
  template: string | null;
  source_function: string | null;
  recipients: string[];
  subject: string;
  status: DeliveryStatus;
}

export interface DeliveryRowExisting {
  id: string;
  status: DeliveryStatus;
  provider_message_id: string | null;
  updated_at: string;
  attempts: number;
}

export interface DeliveryRowPatch {
  status: DeliveryStatus;
  attempts?: number;
  provider_message_id?: string | null;
  last_error?: string | null;
  last_status_code?: number | null;
  sent_at?: string | null;
  failed_at?: string | null;
  transport?: string;
}

/**
 * The storage the ledger needs. ses-email-service.ts implements it against
 * public.email_deliveries with a service-role client; tests use a Map.
 * Every method resolves - storage trouble is reported as { error }, never thrown.
 */
export interface DeliveryStore {
  insert(row: DeliveryRowInsert): Promise<{ id: string } | { conflict: true } | { error: string }>;
  findByKey(key: string): Promise<{ row: DeliveryRowExisting | null } | { error: string }>;
  /** Move a row back to 'sending' only if it is still exactly as read (optimistic lock on updated_at). */
  reclaim(id: string, expected: { status: DeliveryStatus; updated_at: string }): Promise<{ ok: boolean } | { error: string }>;
  update(id: string, patch: DeliveryRowPatch): Promise<{ ok: true } | { error: string }>;
}

export interface FailureReport {
  message: string;
  status: DeliveryStatus | 'ledger_error';
  idempotencyKey: string;
  template: string | null;
  companyId: string | null;
  source: string | null;
  transport: string;
  attempts: number;
  statusCode: number | null;
}

export interface SendRequest {
  message: OutboundMessage;
  idempotencyKey: string;
  category: EmailCategory;
  companyId: string | null;
  template: string | null;
  source: string | null;
  provider: string;
}

export interface SendDeps {
  transport: EmailTransport;
  /** null when no service-role client is available; the send still happens. */
  store: DeliveryStore | null;
  /** Consent gate for non-transactional mail. Resolves true to allow. */
  consent?: (recipient: string, category: EmailCategory) => Promise<boolean>;
  report: (failure: FailureReport) => Promise<void>;
  policy?: RetryPolicy;
  sleep?: (ms: number) => Promise<void>;
  random?: () => number;
  now?: () => number;
}

export interface SendOutcome {
  success: boolean;
  status: DeliveryStatus;
  messageId?: string;
  error?: string;
  deliveryId?: string;
  attempts: number;
  /** True when the key had already been sent and nothing new went out. */
  deduplicated?: boolean;
  /** True when the recipient opted out of this category. */
  suppressed?: boolean;
}

const CONSENT_EXEMPT: ReadonlySet<EmailCategory> = new Set(['transactional', 'security_alerts']);

export async function sendWithLedger(deps: SendDeps, req: SendRequest): Promise<SendOutcome> {
  const now = deps.now ?? Date.now;
  const { transport, store } = deps;
  const { message } = req;
  const baseReport = {
    idempotencyKey: req.idempotencyKey,
    template: req.template,
    companyId: req.companyId,
    source: req.source,
    transport: transport.name,
  };
  const ledgerError = async (what: string, detail: string) => {
    await deps.report({ ...baseReport, message: `email ledger ${what}: ${detail}`, status: 'ledger_error', attempts: 0, statusCode: null });
  };

  if (!IDEMPOTENCY_KEY_PATTERN.test(req.idempotencyKey)) {
    return { success: false, status: 'failed', attempts: 0, error: 'Invalid idempotency key' };
  }
  if (message.to.length === 0) {
    return { success: false, status: 'failed', attempts: 0, error: 'No valid recipient' };
  }

  const baseRow: DeliveryRowInsert = {
    idempotency_key: req.idempotencyKey,
    company_id: req.companyId,
    provider: req.provider,
    transport: transport.name,
    category: req.category,
    template: req.template,
    source_function: req.source,
    recipients: message.to,
    subject: truncate(message.subject, 500),
    status: 'sending',
  };

  // Consent. Only mail that is not required to run the account can be opted out of.
  if (deps.consent && !CONSENT_EXEMPT.has(req.category)) {
    const allowed = await Promise.all(message.to.map((r) => deps.consent!(r, req.category)));
    if (allowed.some((a) => !a)) {
      if (store) {
        const ins = await store.insert({ ...baseRow, status: 'suppressed' });
        if ('error' in ins) await ledgerError('insert', ins.error);
      }
      return { success: false, status: 'suppressed', attempts: 0, suppressed: true, error: 'Recipient has opted out of this email' };
    }
  }

  // Claim the key.
  let deliveryId: string | undefined;
  let priorAttempts = 0;
  if (store) {
    const ins = await store.insert(baseRow);
    if ('id' in ins) {
      deliveryId = ins.id;
    } else if ('conflict' in ins) {
      const found = await store.findByKey(req.idempotencyKey);
      if ('error' in found) {
        // Cannot tell whether it went out. Sending twice is the worse outcome
        // for a key the caller made stable on purpose, so do not send.
        await ledgerError('lookup', found.error);
        return { success: false, status: 'failed', attempts: 0, error: 'Could not check whether this email was already sent' };
      }
      const existing = found.row;
      if (existing && existing.status === 'sent') {
        return {
          success: true,
          status: 'sent',
          attempts: existing.attempts,
          deliveryId: existing.id,
          messageId: existing.provider_message_id ?? undefined,
          deduplicated: true,
        };
      }
      if (existing && existing.status === 'suppressed') {
        return { success: false, status: 'suppressed', attempts: 0, deliveryId: existing.id, suppressed: true, error: 'Recipient has opted out of this email' };
      }
      if (existing) {
        const stale = existing.status === 'sending' && now() - Date.parse(existing.updated_at) > STALE_SENDING_MS;
        if (existing.status === 'sending' && !stale) {
          return { success: false, status: 'sending', attempts: existing.attempts, deliveryId: existing.id, error: 'This email is already being sent' };
        }
        const re = await store.reclaim(existing.id, { status: existing.status, updated_at: existing.updated_at });
        if ('error' in re) {
          await ledgerError('reclaim', re.error);
          return { success: false, status: 'failed', attempts: 0, error: 'Could not check whether this email was already sent' };
        }
        if (!re.ok) {
          return { success: false, status: 'sending', attempts: existing.attempts, deliveryId: existing.id, error: 'This email is already being sent' };
        }
        deliveryId = existing.id;
        priorAttempts = existing.attempts;
      }
    } else {
      // Table missing or unreachable. Send anyway; say so.
      await ledgerError('insert', ins.error);
    }
  }

  const result = await deliverWithRetry(transport, message, {
    idempotencyKey: req.idempotencyKey,
    policy: deps.policy,
    sleep: deps.sleep,
    random: deps.random,
  });

  const at = new Date(now()).toISOString();
  if (store && deliveryId) {
    const patch: DeliveryRowPatch =
      result.status === 'sent'
        ? { status: 'sent', attempts: priorAttempts + result.attempts, provider_message_id: result.messageId, last_error: null, last_status_code: null, sent_at: at, transport: transport.name }
        : { status: result.status, attempts: priorAttempts + result.attempts, last_error: result.error, last_status_code: result.statusCode, failed_at: at, transport: transport.name };
    const upd = await store.update(deliveryId, patch);
    if ('error' in upd) await ledgerError('update', upd.error);
  }

  if (result.status !== 'sent') {
    await deps.report({
      ...baseReport,
      message: `email ${result.status === 'dead_letter' ? 'dead-lettered after retries' : 'rejected'}: ${result.error ?? 'unknown error'}`,
      status: result.status,
      attempts: result.attempts,
      statusCode: result.statusCode,
    });
    return { success: false, status: result.status, attempts: result.attempts, deliveryId, error: result.error ?? 'Email send failed' };
  }

  return { success: true, status: 'sent', attempts: result.attempts, deliveryId, messageId: result.messageId ?? undefined };
}

function truncate(s: string, n: number): string {
  return s.length > n ? `${s.slice(0, n)}...` : s;
}
