import { describe, it, expect, vi } from 'vitest';
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import {
  type DeliveryRowExisting,
  type DeliveryRowInsert,
  type DeliveryRowPatch,
  type DeliveryStore,
  type EmailTransport,
  type FailureReport,
  type OutboundMessage,
  type TransportOutcome,
  DEFAULT_RETRY_POLICY,
  MAX_RETRY_AFTER_MS,
  STALE_SENDING_MS,
  backoffDelayMs,
  classifyHttpFailure,
  classifySmtpError,
  deliverWithRetry,
  emailIdempotencyKey,
  isRetryableHttpStatus,
  normalizeRecipients,
  parseRetryAfter,
  randomIdempotencyKey,
  sendWithLedger,
} from './email-delivery';

const msg: OutboundMessage = {
  from: 'Brikly <billing@brikly.net>',
  to: ['client@example.com'],
  subject: 'Invoice 1001',
  html: '<p>hi</p>',
};

/** A transport that answers from a script, one outcome per attempt. */
function scripted(...outcomes: Array<TransportOutcome | Error>): EmailTransport & { calls: number } {
  const t = {
    name: 'test',
    calls: 0,
    async send() {
      const o = outcomes[Math.min(t.calls, outcomes.length - 1)];
      t.calls++;
      if (o instanceof Error) throw o;
      return o;
    },
  };
  return t;
}

const ok = (id = 'msg-1'): TransportOutcome => ({ ok: true, messageId: id });
const http = (status: number, retryAfter: string | null = null) => classifyHttpFailure(status, 'body', retryAfter, 0);

const noSleep = vi.fn(async (_ms: number) => {});

/** In-memory email_deliveries with the table's unique key. */
function memoryStore(now: () => number = Date.now) {
  const rows = new Map<string, DeliveryRowInsert & DeliveryRowExisting & Partial<DeliveryRowPatch>>();
  let seq = 0;
  const store: DeliveryStore & { rows: typeof rows } = {
    rows,
    async insert(row) {
      if ([...rows.values()].some((r) => r.idempotency_key === row.idempotency_key)) return { conflict: true };
      const id = `row-${++seq}`;
      rows.set(id, { ...row, id, provider_message_id: null, attempts: 0, updated_at: new Date(now()).toISOString() });
      return { id };
    },
    async findByKey(key) {
      const r = [...rows.values()].find((x) => x.idempotency_key === key);
      return { row: r ? { id: r.id, status: r.status, provider_message_id: r.provider_message_id, updated_at: r.updated_at, attempts: r.attempts } : null };
    },
    async reclaim(id, expected) {
      const r = rows.get(id);
      if (!r || r.status !== expected.status || r.updated_at !== expected.updated_at) return { ok: false };
      r.status = 'sending';
      r.updated_at = new Date(now() + 1).toISOString();
      return { ok: true };
    },
    async update(id, patch) {
      const r = rows.get(id)!;
      Object.assign(r, patch, { updated_at: new Date(now()).toISOString() });
      return { ok: true };
    },
  };
  return store;
}

function deps(transport: EmailTransport, store: DeliveryStore | null = memoryStore()) {
  const reports: FailureReport[] = [];
  return {
    reports,
    d: {
      transport,
      store,
      report: async (f: FailureReport) => {
        reports.push(f);
      },
      sleep: noSleep,
      random: () => 0.5,
    },
  };
}

const request = (over: Partial<Parameters<typeof sendWithLedger>[1]> = {}) => ({
  message: msg,
  idempotencyKey: 'invoice:abcdef0123',
  category: 'transactional' as const,
  companyId: 'company-a',
  template: 'invoice',
  source: 'send-invoice',
  provider: 'ses',
  ...over,
});

describe('failure classification', () => {
  it('retries throttling, timeouts and server faults, not client errors', () => {
    for (const s of [408, 429, 500, 502, 503, 504]) expect(isRetryableHttpStatus(s), String(s)).toBe(true);
    for (const s of [400, 401, 403, 404, 413, 422]) expect(isRetryableHttpStatus(s), String(s)).toBe(false);
  });

  it('reads Retry-After as seconds or as an HTTP date', () => {
    expect(parseRetryAfter('3')).toBe(3000);
    expect(parseRetryAfter('Thu, 01 Jan 1970 00:00:10 GMT', 4000)).toBe(6000);
    expect(parseRetryAfter('soon')).toBeNull();
    expect(parseRetryAfter(null)).toBeNull();
  });

  it('treats SMTP 4xx as transient and 5xx as permanent, the reverse of HTTP', () => {
    expect(classifySmtpError(new Error('454 Throttling failure: Maximum sending rate exceeded'))).toMatchObject({ ok: false, retryable: true, statusCode: 454 });
    expect(classifySmtpError(new Error('421 Service not available'))).toMatchObject({ retryable: true });
    expect(classifySmtpError(new Error('554 Message rejected: Email address is not verified'))).toMatchObject({ retryable: false, statusCode: 554 });
    expect(classifySmtpError(new Error('535 Authentication Credentials Invalid'))).toMatchObject({ retryable: false });
  });

  it('retries a dropped connection but not an unexplained local error', () => {
    expect(classifySmtpError(new Error('Connection reset by peer'))).toMatchObject({ retryable: true, statusCode: null });
    expect(classifySmtpError(new Error('Request timed out'))).toMatchObject({ retryable: true });
    expect(classifySmtpError(new Error('invalid from address'))).toMatchObject({ retryable: false });
  });
});

describe('backoff', () => {
  const policy = { maxAttempts: 5, baseDelayMs: 500, maxDelayMs: 4000 };

  it('grows exponentially with jitter inside [ceiling/2, ceiling]', () => {
    expect(backoffDelayMs(1, policy, null, () => 0)).toBe(250);
    expect(backoffDelayMs(1, policy, null, () => 0.999)).toBeLessThanOrEqual(500);
    expect(backoffDelayMs(2, policy, null, () => 0)).toBe(500);
    expect(backoffDelayMs(3, policy, null, () => 0)).toBe(1000);
  });

  it('caps at maxDelayMs', () => {
    expect(backoffDelayMs(10, policy, null, () => 0.999)).toBeLessThanOrEqual(4000);
  });

  it('waits for a longer Retry-After, but never past the in-request ceiling', () => {
    expect(backoffDelayMs(1, policy, 3000, () => 0)).toBe(3000);
    expect(backoffDelayMs(1, policy, 60_000, () => 0)).toBe(MAX_RETRY_AFTER_MS);
    expect(backoffDelayMs(3, policy, 10, () => 0)).toBe(1000);
  });
});

describe('deliverWithRetry', () => {
  it('returns the messageId on first success without sleeping', async () => {
    const sleep = vi.fn(async () => {});
    const r = await deliverWithRetry(scripted(ok('abc')), msg, { idempotencyKey: 'k:12345678', sleep });
    expect(r).toMatchObject({ status: 'sent', attempts: 1, messageId: 'abc' });
    expect(sleep).not.toHaveBeenCalled();
  });

  it('retries a 503 and a 429, then succeeds', async () => {
    const t = scripted(http(503), http(429, '1'), ok('m'));
    const sleep = vi.fn(async (_ms: number) => {});
    const r = await deliverWithRetry(t, msg, { idempotencyKey: 'k:12345678', sleep, random: () => 0 });
    expect(r).toMatchObject({ status: 'sent', attempts: 3, messageId: 'm' });
    expect(t.calls).toBe(3);
    // 250ms after the 503; the 429's Retry-After (1s) beats the 500ms backoff.
    expect(sleep.mock.calls.map((c) => c[0])).toEqual([250, 1000]);
  });

  it('dead-letters when every attempt is retryable', async () => {
    const t = scripted(http(500));
    const r = await deliverWithRetry(t, msg, { idempotencyKey: 'k:12345678', sleep: noSleep });
    expect(t.calls).toBe(DEFAULT_RETRY_POLICY.maxAttempts);
    expect(r).toMatchObject({ status: 'dead_letter', attempts: DEFAULT_RETRY_POLICY.maxAttempts, statusCode: 500, messageId: null });
    expect(r.history).toHaveLength(DEFAULT_RETRY_POLICY.maxAttempts);
  });

  it('fails at once on a permanent refusal', async () => {
    const t = scripted(http(400), ok());
    const r = await deliverWithRetry(t, msg, { idempotencyKey: 'k:12345678', sleep: noSleep });
    expect(t.calls).toBe(1);
    expect(r).toMatchObject({ status: 'failed', attempts: 1, statusCode: 400 });
  });

  it('treats a thrown transport error as retryable', async () => {
    const t = scripted(new Error('socket hang up'), ok('after-throw'));
    const r = await deliverWithRetry(t, msg, { idempotencyKey: 'k:12345678', sleep: noSleep });
    expect(r).toMatchObject({ status: 'sent', attempts: 2, messageId: 'after-throw' });
  });
});

describe('recipients and keys', () => {
  it('trims, dedupes case-insensitively and separates invalid addresses', () => {
    expect(normalizeRecipients([' A@Example.COM', 'a@example.com', '', 'not-an-email', 'b@x.io'])).toEqual({
      valid: ['A@example.com', 'b@x.io'],
      invalid: ['not-an-email'],
    });
    expect(normalizeRecipients('solo@x.io').valid).toEqual(['solo@x.io']);
    expect(normalizeRecipients(null).valid).toEqual([]);
  });

  it('builds the same key for the same occasion and a different one otherwise', async () => {
    const a = await emailIdempotencyKey('payment_reminder', 'inv-1', 'overdue');
    expect(a).toBe(await emailIdempotencyKey('payment_reminder', 'inv-1', 'overdue'));
    expect(a).not.toBe(await emailIdempotencyKey('payment_reminder', 'inv-1', 'final_notice'));
    expect(a).toMatch(/^payment_reminder:[0-9a-f]{40}$/);
    // No address or id appears in the key: it is sent to SES as a message tag.
    expect(await emailIdempotencyKey('x', 'someone@example.com')).not.toContain('example');
  });

  it('gives a one-off message a unique key', () => {
    expect(randomIdempotencyKey('invoice')).not.toBe(randomIdempotencyKey('invoice'));
    expect(randomIdempotencyKey('bad scope!')).toMatch(/^bad_scope_:/);
  });
});

describe('sendWithLedger', () => {
  it('records a successful send with the provider messageId', async () => {
    const store = memoryStore();
    const { d, reports } = deps(scripted(ok('ses-123')), store);
    const r = await sendWithLedger(d, request());
    expect(r).toMatchObject({ success: true, status: 'sent', messageId: 'ses-123', attempts: 1 });
    const row = store.rows.get(r.deliveryId!)!;
    expect(row).toMatchObject({ status: 'sent', provider_message_id: 'ses-123', attempts: 1, company_id: 'company-a', template: 'invoice' });
    expect(row.sent_at).toBeTruthy();
    expect(reports).toHaveLength(0);
  });

  it('dead-letters after retries, records the error and reports it', async () => {
    const store = memoryStore();
    const { d, reports } = deps(scripted(http(503)), store);
    const r = await sendWithLedger(d, request());
    expect(r).toMatchObject({ success: false, status: 'dead_letter', attempts: 3 });
    expect(store.rows.get(r.deliveryId!)).toMatchObject({ status: 'dead_letter', attempts: 3, last_status_code: 503 });
    expect(reports).toHaveLength(1);
    expect(reports[0]).toMatchObject({ status: 'dead_letter', source: 'send-invoice', companyId: 'company-a', statusCode: 503 });
  });

  it('marks a permanent refusal failed and reports it', async () => {
    const store = memoryStore();
    const { d, reports } = deps(scripted(http(400)), store);
    const r = await sendWithLedger(d, request());
    expect(r).toMatchObject({ success: false, status: 'failed', attempts: 1 });
    expect(store.rows.get(r.deliveryId!)!.status).toBe('failed');
    expect(reports[0].status).toBe('failed');
  });

  it('does not send the same key twice', async () => {
    const store = memoryStore();
    const t = scripted(ok('first'));
    const { d } = deps(t, store);
    await sendWithLedger(d, request());
    const again = await sendWithLedger(d, request());
    expect(t.calls).toBe(1);
    expect(again).toMatchObject({ success: true, deduplicated: true, messageId: 'first' });
  });

  it('retries a key that dead-lettered earlier, on the same row', async () => {
    const store = memoryStore();
    const failing = deps(scripted(http(500)), store);
    const first = await sendWithLedger(failing.d, request());
    const later = deps(scripted(ok('second-try')), store);
    const second = await sendWithLedger(later.d, request());
    expect(second).toMatchObject({ success: true, messageId: 'second-try', deliveryId: first.deliveryId });
    expect(store.rows.get(first.deliveryId!)).toMatchObject({ status: 'sent', attempts: 4 });
  });

  it('leaves a key alone while another invocation is sending it', async () => {
    const store = memoryStore();
    await store.insert({ ...request(), idempotency_key: 'invoice:abcdef0123', company_id: null, transport: 't', source_function: null, recipients: msg.to, subject: 's', status: 'sending' } as DeliveryRowInsert);
    const t = scripted(ok());
    const { d } = deps(t, store);
    const r = await sendWithLedger(d, request());
    expect(t.calls).toBe(0);
    expect(r).toMatchObject({ success: false, status: 'sending' });
  });

  it('takes over a sending row that went stale', async () => {
    let clock = 1_000_000;
    const store = memoryStore(() => clock);
    await store.insert({ idempotency_key: 'invoice:abcdef0123', company_id: null, provider: 'ses', transport: 't', category: 'transactional', template: null, source_function: null, recipients: msg.to, subject: 's', status: 'sending' });
    clock += STALE_SENDING_MS + 1;
    const t = scripted(ok('recovered'));
    const { d } = deps(t, store);
    const r = await sendWithLedger({ ...d, now: () => clock }, request());
    expect(t.calls).toBe(1);
    expect(r).toMatchObject({ success: true, messageId: 'recovered' });
  });

  it('still sends when the ledger is unavailable, and reports the gap', async () => {
    const broken: DeliveryStore = {
      insert: async () => ({ error: 'relation "email_deliveries" does not exist' }),
      findByKey: async () => ({ error: 'x' }),
      reclaim: async () => ({ error: 'x' }),
      update: async () => ({ error: 'x' }),
    };
    const t = scripted(ok('sent-anyway'));
    const { d, reports } = deps(t, broken);
    const r = await sendWithLedger(d, request());
    expect(t.calls).toBe(1);
    expect(r).toMatchObject({ success: true, messageId: 'sent-anyway' });
    expect(reports.map((x) => x.status)).toEqual(['ledger_error']);
  });

  it('sends with no store at all', async () => {
    const t = scripted(ok('no-store'));
    const { d } = deps(t, null);
    expect(await sendWithLedger(d, request())).toMatchObject({ success: true, messageId: 'no-store' });
  });

  it('does not send when it cannot tell whether a stable key already went out', async () => {
    const store = memoryStore();
    await sendWithLedger(deps(scripted(ok()), store).d, request());
    const t = scripted(ok());
    const flaky: DeliveryStore = { ...store, findByKey: async () => ({ error: 'timeout' }) };
    const r = await sendWithLedger(deps(t, flaky).d, request());
    expect(t.calls).toBe(0);
    expect(r.success).toBe(false);
  });

  it('suppresses marketing mail to an opted-out recipient and records it', async () => {
    const store = memoryStore();
    const t = scripted(ok());
    const { d } = deps(t, store);
    const r = await sendWithLedger({ ...d, consent: async () => false }, request({ category: 'marketing', idempotencyKey: 'funnel:0000000001' }));
    expect(t.calls).toBe(0);
    expect(r).toMatchObject({ success: false, status: 'suppressed', suppressed: true });
    expect([...store.rows.values()][0].status).toBe('suppressed');
  });

  it('never consults consent for transactional or security mail', async () => {
    const consent = vi.fn(async () => false);
    const t = scripted(ok());
    const { d } = deps(t);
    await sendWithLedger({ ...d, consent }, request({ category: 'security_alerts' }));
    await sendWithLedger({ ...d, consent }, request({ idempotencyKey: 'invoice:another01' }));
    expect(consent).not.toHaveBeenCalled();
    expect(t.calls).toBe(2);
  });

  it('refuses an empty recipient list and a malformed key without sending', async () => {
    const t = scripted(ok());
    const { d } = deps(t);
    expect(await sendWithLedger(d, request({ message: { ...msg, to: [] } }))).toMatchObject({ success: false });
    expect(await sendWithLedger(d, request({ idempotencyKey: 'has spaces in it' }))).toMatchObject({ success: false });
    expect(t.calls).toBe(0);
  });
});

describe('one provider (US-253)', () => {
  // Read the tree rather than run it: entry points are Deno modules with remote
  // imports. What is asserted is mechanical - no function talks to a mail API
  // except through _shared/ses-email-service.ts.
  const FN = 'supabase/functions';
  const dirs = readdirSync(FN, { withFileTypes: true })
    .filter((d) => d.isDirectory() && d.name !== '_shared' && existsSync(`${FN}/${d.name}/index.ts`))
    .map((d) => d.name);
  const strip = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

  it('no edge function imports a mail SDK or calls a mail API directly', () => {
    const offenders: string[] = [];
    for (const name of dirs) {
      const src = strip(readFileSync(`${FN}/${name}/index.ts`, 'utf8'));
      if (/esm\.sh\/resend|api\.resend\.com|api\.sendgrid\.com|denomailer|api\.postmarkapp\.com|api\.mailgun\.net|RESEND_API_KEY|SENDGRID_API_KEY/.test(src)) {
        offenders.push(name);
      }
    }
    expect(offenders).toEqual([]);
  });

  it('denomailer is imported in exactly one place', () => {
    const shared = readdirSync(`${FN}/_shared`).filter((f) => f.endsWith('.ts') && !f.endsWith('.test.ts'));
    const users = shared.filter((f) => strip(readFileSync(`${FN}/_shared/${f}`, 'utf8')).includes('denomailer'));
    expect(users).toEqual(['ses-email-service.ts']);
  });

  it('the converted senders go through the shared sender', () => {
    for (const name of [
      'failed-payment-recovery', 'process-funnel-queue', 'send-booking-confirmation', 'send-notification',
      'send-payment-reminder', 'send-renewal-notification', 'send-safety-notification',
      'send-support-notification', 'trial-management', 'send-seo-notification',
    ]) {
      const src = readFileSync(`${FN}/${name}/index.ts`, 'utf8');
      expect(src, name).toMatch(/from ['"]\.\.\/_shared\/ses-email-service\.ts['"]/);
    }
  });
});
