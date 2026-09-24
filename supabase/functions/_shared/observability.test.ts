import { describe, it, expect, vi } from 'vitest';
import {
  parseDsn, scrub, scrubString, buildEnvelope, captureException, withErrorReporting,
  requestInfo, normalizeError, parseStack, luhnValid,
} from './observability';

const DSN = 'https://abc123def456@o1234.ingest.sentry.io/7654321';

describe('parseDsn', () => {
  it('derives the envelope endpoint and key', () => {
    expect(parseDsn(DSN)).toEqual({
      ingestUrl: 'https://o1234.ingest.sentry.io/api/7654321/envelope/',
      publicKey: 'abc123def456',
      projectId: '7654321',
    });
  });

  it('returns null rather than throwing on junk', () => {
    for (const bad of [undefined, null, '', 'not-a-url', 'https://no-key.example.com/1', 'https://key@host/']) {
      expect(parseDsn(bad as string)).toBeNull();
    }
  });
});

describe('scrub', () => {
  it('redacts sensitive keys at any depth', () => {
    const out = scrub({
      ok: 'keep',
      Authorization: 'Bearer abcdefghijklmnop',
      nested: { api_key: 'sk_live_xyz', deeper: { refresh_token: 'r' } },
    }) as any;
    expect(out.ok).toBe('keep');
    expect(out.Authorization).toBe('[redacted]');
    expect(out.nested.api_key).toBe('[redacted]');
    expect(out.nested.deeper.refresh_token).toBe('[redacted]');
  });

  it('redacts secret-shaped values even under an innocent key', () => {
    const out = scrub({
      note: 'failed for sk_live_ABCDEFGH1234 while calling',
      detail: 'token eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiIxIn0.abcdefghijk',
    }) as any;
    expect(out.note).toContain('[stripe-secret-key]');
    expect(out.note).not.toContain('sk_live_ABCDEFGH1234');
    expect(out.detail).toContain('[jwt]');
  });

  it('redacts email addresses, which are PII', () => {
    expect(scrubString('could not mail alice@example.com')).toBe('could not mail [email]');
  });

  it('stops at a depth limit instead of recursing forever', () => {
    const deep: any = {};
    let node = deep;
    for (let i = 0; i < 12; i++) { node.next = {}; node = node.next; }
    expect(() => scrub(deep)).not.toThrow();
    expect(JSON.stringify(scrub(deep))).toContain('depth-limit');
  });

  it('leaves primitives alone', () => {
    expect(scrub(42)).toBe(42);
    expect(scrub(true)).toBe(true);
    expect(scrub(null)).toBeNull();
  });
});

describe('buildEnvelope', () => {
  const parsed = parseDsn(DSN)!;
  const at = '2026-08-27T00:00:00.000Z';

  it('tags the event with the function name and company', () => {
    const body = buildEnvelope(new Error('boom'), { fn: 'stripe-webhook', companyId: 'co-1', requestId: 'evt_9' }, parsed, at);
    const [, , event] = body.trim().split('\n');
    const parsedEvent = JSON.parse(event);
    expect(parsedEvent.tags).toMatchObject({ function: 'stripe-webhook', company_id: 'co-1', request_id: 'evt_9' });
    expect(parsedEvent.exception.values[0].value).toBe('boom');
  });

  it('scrubs secrets out of the message before it leaves', () => {
    const body = buildEnvelope(new Error('bad key sk_live_ABCDEFGH1234'), { fn: 'f' }, parsed, at);
    expect(body).not.toContain('sk_live_ABCDEFGH1234');
    expect(body).toContain('[stripe-secret-key]');
  });

  it('scrubs extras too', () => {
    const body = buildEnvelope(new Error('x'), { fn: 'f', extra: { Authorization: 'Bearer sekritsekrit' } }, parsed, at);
    expect(body).not.toContain('sekritsekrit');
  });

  it('accepts a non-Error throwable', () => {
    const body = buildEnvelope('a string was thrown', { fn: 'f' }, parsed, at);
    expect(body).toContain('a string was thrown');
  });
});

describe('captureException', () => {
  it('does nothing at all when no DSN is configured', async () => {
    const fetchImpl = vi.fn();
    await captureException(new Error('x'), { fn: 'f' }, { dsn: undefined, fetchImpl });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('posts an envelope with the auth header when a DSN is set, and returns its event id', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    const id = await captureException(new Error('x'), { fn: 'quickbooks-sync' }, { dsn: DSN, fetchImpl });
    expect(typeof id).toBe('string'); // the test setup stubs crypto.randomUUID
    const sent = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string;
    expect(JSON.parse(sent.split('\n')[0]).event_id).toBe(id);

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://o1234.ingest.sentry.io/api/7654321/envelope/');
    expect((init.headers as Record<string, string>)['X-Sentry-Auth']).toContain('sentry_key=abc123def456');
  });

  it('never throws when the transport fails', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down'); });
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: DSN, fetchImpl })).resolves.toBeNull();
  });

  it('never throws when Sentry rejects the event', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429 }) as Response);
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: DSN, fetchImpl })).resolves.toBeNull();
  });

  it('never throws on a malformed DSN', async () => {
    const fetchImpl = vi.fn();
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: 'garbage', fetchImpl })).resolves.toBeNull();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});

describe('scrub: wider secret and PII coverage', () => {
  it('redacts keys by substring, so env-style and header-style names are caught', () => {
    const out = scrub({
      STRIPE_SECRET_KEY: 'x', 'x-api-key': 'x', 'stripe-signature': 'x', sb_access_token: 'x',
      service_role_key: 'x', otp_code: '123456', card_number: 'x', company_id: 'keep',
    }) as Record<string, unknown>;
    expect(out.company_id).toBe('keep');
    for (const k of ['STRIPE_SECRET_KEY', 'x-api-key', 'stripe-signature', 'sb_access_token', 'otp_code', 'card_number']) {
      expect(out[k]).toBe('[redacted]');
    }
  });

  it('redacts provider key shapes inside free text', () => {
    const text = [
      'rk_live_ABCDEFGH1234',
      'sk-ant-api03-abcdefghijklmnopqrstuvwx',
      'AKIAABCDEFGHIJKLMNOP',
      'xoxb-1234567890-abcdefghij',
      'ghp_abcdefghijklmnopqrstuvwxyz0123',
    ].join(' ');
    const out = scrubString(text);
    expect(out).not.toMatch(/rk_live_|sk-ant-api03|AKIAABCD|xoxb-1234|ghp_abcd/);
  });

  it('redacts credentials in a connection string and tokens in a query string', () => {
    const out = scrubString('connect postgres://admin:hunter2@db.internal:5432/app failed; GET /cb?code=abc123&state=ok&access_token=zzz');
    expect(out).not.toContain('hunter2');
    expect(out).toContain('postgres://[redacted]@db.internal');
    expect(out).not.toContain('abc123');
    expect(out).not.toContain('zzz');
    expect(out).toContain('state=ok');
  });

  it('redacts Luhn-valid card numbers and phone numbers but keeps timestamps', () => {
    expect(scrubString('card 4242 4242 4242 4242 declined')).toBe('card [card-number] declined');
    expect(scrubString('call (555) 123-4567 now')).toContain('[phone]');
    expect(scrubString('at 1724745600001')).toBe('at 1724745600001');
  });

  it('luhnValid matches the published test numbers', () => {
    expect(luhnValid('4242424242424242')).toBe(true);
    expect(luhnValid('4242424242424241')).toBe(false);
    expect(luhnValid('12')).toBe(false);
  });
});

describe('requestInfo', () => {
  it('takes method, path and a request id, and drops the query string', () => {
    const req = new Request('https://x.supabase.co/functions/v1/send-email?token=secret', {
      method: 'POST',
      headers: { 'x-request-id': 'req-42', Authorization: 'Bearer abcdefghijklmnop' },
    });
    expect(requestInfo(req)).toEqual({
      requestId: 'req-42',
      method: 'POST',
      url: 'https://x.supabase.co/functions/v1/send-email',
    });
  });

  it('prefers sb-request-id and survives a missing or odd request', () => {
    const req = new Request('https://x/f', { headers: { 'sb-request-id': 'sb-1', 'cf-ray': 'ray' } });
    expect(requestInfo(req).requestId).toBe('sb-1');
    expect(requestInfo(undefined)).toEqual({ requestId: null, method: null, url: null });
    expect(requestInfo({} as Request)).toEqual({ requestId: null, method: null, url: null });
  });
});

describe('buildEnvelope with a request', () => {
  const parsed = parseDsn(DSN)!;
  const at = '2026-09-24T00:00:00.000Z';

  it('tags request_id from the request and never sends headers or the query', () => {
    const req = new Request('https://x/functions/v1/f?apikey=anon-key-value', {
      method: 'POST',
      headers: { 'cf-ray': 'ray-7', Authorization: 'Bearer abcdefghijklmnop', Cookie: 'sid=1' },
    });
    const body = buildEnvelope(new Error('boom'), { fn: 'f', req }, parsed, at);
    const event = JSON.parse(body.trim().split('\n')[2]);
    expect(event.tags).toMatchObject({ function: 'f', request_id: 'ray-7', method: 'POST' });
    expect(event.request).toEqual({ method: 'POST', url: 'https://x/functions/v1/f' });
    expect(body).not.toContain('anon-key-value');
    expect(body).not.toContain('abcdefghijklmnop');
    expect(body).not.toContain('sid=1');
  });

  it('an explicit requestId wins over the header', () => {
    const req = new Request('https://x/f', { headers: { 'x-request-id': 'hdr' } });
    const event = JSON.parse(buildEnvelope(new Error('e'), { fn: 'f', req, requestId: 'evt_1' }, parsed, at).trim().split('\n')[2]);
    expect(event.tags.request_id).toBe('evt_1');
  });

  it('keeps the message and fields of a thrown supabase-js error object, scrubbed', () => {
    const pgErr = { message: 'duplicate key for bob@example.com', code: '23505', details: 'Key (email)=(bob@example.com)', hint: null };
    const body = buildEnvelope(pgErr, { fn: 'f' }, parsed, at);
    const event = JSON.parse(body.trim().split('\n')[2]);
    expect(event.exception.values[0].value).toBe('duplicate key for [email]');
    expect(event.exception.values[0].type).toBe('Error 23505');
    expect(event.extra.thrown.code).toBe('23505');
    expect(body).not.toContain('bob@example.com');
  });

  it('sends parsed stack frames, oldest first', () => {
    const err = new Error('x');
    err.stack = 'Error: x\n    at inner (file:///functions/f/index.ts:10:5)\n    at outer (file:///functions/f/index.ts:20:3)';
    const event = JSON.parse(buildEnvelope(err, { fn: 'f' }, parsed, at).trim().split('\n')[2]);
    expect(event.exception.values[0].stacktrace.frames.map((f: { function: string }) => f.function)).toEqual(['outer', 'inner']);
  });
});

describe('normalizeError / parseStack', () => {
  it('handles every throwable shape without throwing', () => {
    expect(normalizeError(new TypeError('t'))).toMatchObject({ type: 'TypeError', message: 't' });
    expect(normalizeError('s')).toEqual({ type: 'NonErrorThrown', message: 's' });
    expect(normalizeError(undefined)).toEqual({ type: 'NonErrorThrown', message: 'undefined' });
    const circular: Record<string, unknown> = {}; circular.self = circular;
    expect(() => normalizeError(circular)).not.toThrow();
  });

  it('skips lines it does not recognise', () => {
    expect(parseStack(undefined)).toEqual([]);
    expect(parseStack('Error: x\n    garbage line')).toEqual([]);
  });
});

describe('captureException timeout', () => {
  it('abandons a Sentry request that hangs instead of hanging the response', async () => {
    const fetchImpl = vi.fn((_url: string, init: RequestInit) => new Promise<Response>((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new Error('aborted')));
    }));
    const started = Date.now();
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: DSN, fetchImpl: fetchImpl as unknown as typeof fetch, timeoutMs: 20 })).resolves.toBeNull();
    expect(Date.now() - started).toBeLessThan(1000);
  });
});

describe('withErrorReporting', () => {
  it('passes a response through untouched and reports nothing', async () => {
    const fetchImpl = vi.fn();
    const res = new Response('ok');
    const wrapped = withErrorReporting('f', async () => res, { dsn: DSN, fetchImpl });
    expect(await wrapped(new Request('https://x/f'))).toBe(res);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('reports an escaping error with the function name, then rethrows the same error', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    const boom = new Error('escaped');
    const wrapped = withErrorReporting('data-subject-export', async () => { throw boom; }, { dsn: DSN, fetchImpl });
    await expect(wrapped(new Request('https://x/f'))).rejects.toBe(boom);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const body = (fetchImpl.mock.calls[0] as unknown as [string, RequestInit])[1].body as string;
    expect(JSON.parse(body.trim().split('\n')[2]).tags.function).toBe('data-subject-export');
  });

  it('still rethrows the original error when reporting itself fails', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down'); });
    const boom = new Error('escaped');
    const wrapped = withErrorReporting('f', () => { throw boom; }, { dsn: DSN, fetchImpl });
    await expect(wrapped(new Request('https://x/f'))).rejects.toBe(boom);
  });
});
