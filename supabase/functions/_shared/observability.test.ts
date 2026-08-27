import { describe, it, expect, vi } from 'vitest';
import { parseDsn, scrub, scrubString, buildEnvelope, captureException } from './observability';

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

  it('posts an envelope with the auth header when a DSN is set', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: true, status: 200 }) as Response);
    await captureException(new Error('x'), { fn: 'quickbooks-sync' }, { dsn: DSN, fetchImpl });

    expect(fetchImpl).toHaveBeenCalledTimes(1);
    const [url, init] = fetchImpl.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://o1234.ingest.sentry.io/api/7654321/envelope/');
    expect((init.headers as Record<string, string>)['X-Sentry-Auth']).toContain('sentry_key=abc123def456');
  });

  it('never throws when the transport fails', async () => {
    const fetchImpl = vi.fn(async () => { throw new Error('network down'); });
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: DSN, fetchImpl })).resolves.toBeUndefined();
  });

  it('never throws when Sentry rejects the event', async () => {
    const fetchImpl = vi.fn(async () => ({ ok: false, status: 429 }) as Response);
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: DSN, fetchImpl })).resolves.toBeUndefined();
  });

  it('never throws on a malformed DSN', async () => {
    const fetchImpl = vi.fn();
    await expect(captureException(new Error('x'), { fn: 'f' }, { dsn: 'garbage', fetchImpl })).resolves.toBeUndefined();
    expect(fetchImpl).not.toHaveBeenCalled();
  });
});
