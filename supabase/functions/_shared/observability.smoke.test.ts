import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { request as httpsRequest } from 'node:https';
import { randomUUID } from 'node:crypto';
import { captureException } from './observability';

/**
 * US-251 AC4: an event sent with the real EDGE_SENTRY_DSN reaches Sentry.
 *
 * Opt-in. It talks to a real Sentry project, so it is skipped unless all of
 * these are set in the environment running vitest:
 *
 *   EDGE_SENTRY_DSN      the same DSN set as the Supabase secret
 *   SENTRY_AUTH_TOKEN    a Sentry auth token with event:read (to look the event up)
 *   SENTRY_ORG           organization slug
 *   SENTRY_PROJECT       project slug the DSN belongs to
 *   SENTRY_API_URL       optional, default https://sentry.io (https://de.sentry.io for EU)
 *
 *   EDGE_SENTRY_DSN=... SENTRY_AUTH_TOKEN=... SENTRY_ORG=... SENTRY_PROJECT=... \
 *     npx vitest run supabase/functions/_shared/observability.smoke.test.ts
 *
 * It sends one error through captureException, the same code path every edge
 * function uses, with a fake Stripe key and an email address in the message,
 * then polls Sentry's API for that event id and checks the function tag and
 * that the scrubbing held on the stored event.
 *
 * src/test/setup.ts replaces global fetch and crypto.randomUUID with stubs, so
 * this uses node:https and node:crypto directly.
 */

const env = process.env;
const enabled = Boolean(env.EDGE_SENTRY_DSN && env.SENTRY_AUTH_TOKEN && env.SENTRY_ORG && env.SENTRY_PROJECT);

function nodeFetch(url: string, init: { method?: string; headers?: Record<string, string>; body?: string } = {}) {
  return new Promise<{ ok: boolean; status: number; text: string }>((resolve, reject) => {
    const req = httpsRequest(url, { method: init.method ?? 'GET', headers: init.headers }, (res) => {
      let text = '';
      res.setEncoding('utf8');
      res.on('data', (c) => { text += c; });
      res.on('end', () => resolve({ ok: (res.statusCode ?? 0) < 300, status: res.statusCode ?? 0, text }));
    });
    req.on('error', reject);
    req.setTimeout(10_000, () => req.destroy(new Error('timeout')));
    if (init.body) req.write(init.body);
    req.end();
  });
}

describe.skipIf(!enabled)('Sentry smoke (US-251, opt-in)', () => {
  let savedCrypto: PropertyDescriptor | undefined;

  beforeAll(() => {
    savedCrypto = Object.getOwnPropertyDescriptor(globalThis, 'crypto');
    Object.defineProperty(globalThis, 'crypto', {
      value: { ...(globalThis.crypto ?? {}), randomUUID },
      configurable: true,
    });
  });
  afterAll(() => {
    if (savedCrypto) Object.defineProperty(globalThis, 'crypto', savedCrypto);
  });

  it('an error reported through captureException lands in Sentry, tagged and scrubbed', async () => {
    const fn = 'edge-sentry-smoke';
    const marker = `US-251 smoke ${new Date().toISOString()}`;
    const fetchImpl = (async (url: string, init: RequestInit) => {
      const r = await nodeFetch(url, { method: init.method, headers: init.headers as Record<string, string>, body: init.body as string });
      return { ok: r.ok, status: r.status } as Response;
    }) as unknown as typeof fetch;

    const eventId = await captureException(
      new Error(`${marker} key sk_live_SMOKE0000TEST for smoke@example.com`),
      { fn, requestId: 'smoke-request' },
      { dsn: env.EDGE_SENTRY_DSN, fetchImpl, timeoutMs: 10_000 },
    );
    expect(eventId, 'Sentry did not accept the envelope; check EDGE_SENTRY_DSN').toBeTruthy();

    const api = (env.SENTRY_API_URL ?? 'https://sentry.io').replace(/\/$/, '');
    const url = `${api}/api/0/projects/${env.SENTRY_ORG}/${env.SENTRY_PROJECT}/events/${eventId}/`;
    let stored: { tags?: Array<{ key: string; value: string }> } | null = null;
    let lastStatus = 0;
    // Ingestion is asynchronous; an accepted event usually shows within seconds.
    for (let i = 0; i < 20 && !stored; i++) {
      const r = await nodeFetch(url, { headers: { Authorization: `Bearer ${env.SENTRY_AUTH_TOKEN}` } });
      lastStatus = r.status;
      if (r.ok) stored = JSON.parse(r.text);
      else await new Promise((res) => setTimeout(res, 3000));
    }
    expect(stored, `event ${eventId} not found via the API (last HTTP ${lastStatus})`).not.toBeNull();

    const tags = Object.fromEntries((stored!.tags ?? []).map((t) => [t.key, t.value]));
    expect(tags.function).toBe(fn);
    expect(tags.request_id).toBe('smoke-request');

    const raw = JSON.stringify(stored);
    expect(raw).toContain(marker);
    expect(raw).not.toContain('sk_live_SMOKE0000TEST');
    expect(raw).not.toContain('smoke@example.com');
  }, 90_000);
});
