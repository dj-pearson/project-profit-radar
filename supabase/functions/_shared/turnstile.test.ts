import { describe, it, expect, vi } from 'vitest';
import { verifyTurnstile, SITEVERIFY_URL } from './turnstile.ts';

const reply = (status: number, body: unknown) =>
  vi.fn(async () => new Response(JSON.stringify(body), { status })) as unknown as typeof fetch;

describe('verifyTurnstile (US-351)', () => {
  it('is skipped, and says so, while no secret is configured', async () => {
    const fetchImpl = reply(200, { success: true });
    expect(await verifyTurnstile(undefined, '203.0.113.9', { secret: undefined, fetchImpl })).toEqual({ ok: true, enforced: false });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('refuses a missing token once enforced, without calling Cloudflare', async () => {
    const fetchImpl = reply(200, { success: true });
    expect(await verifyTurnstile(undefined, null, { secret: 's', fetchImpl })).toMatchObject({ ok: false, reason: 'missing-token' });
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it('accepts a token Cloudflare confirms, sending secret, token and IP', async () => {
    const fetchImpl = reply(200, { success: true });
    expect(await verifyTurnstile('tok', '203.0.113.9', { secret: 's', fetchImpl })).toEqual({ ok: true, enforced: true });
    const [url, init] = (fetchImpl as unknown as ReturnType<typeof vi.fn>).mock.calls[0] as [string, RequestInit];
    expect(url).toBe(SITEVERIFY_URL);
    const form = init.body as URLSearchParams;
    expect(form.get('secret')).toBe('s');
    expect(form.get('response')).toBe('tok');
    expect(form.get('remoteip')).toBe('203.0.113.9');
  });

  it('refuses a token Cloudflare rejects', async () => {
    const r = await verifyTurnstile('tok', null, { secret: 's', fetchImpl: reply(200, { success: false, 'error-codes': ['invalid-input-response'] }) });
    expect(r).toEqual({ ok: false, reason: 'rejected', codes: ['invalid-input-response'] });
  });

  it('fails closed when siteverify errors or cannot be reached', async () => {
    expect(await verifyTurnstile('tok', null, { secret: 's', fetchImpl: reply(500, {}) })).toMatchObject({ ok: false, reason: 'unreachable' });
    const down = vi.fn(async () => { throw new Error('offline'); }) as unknown as typeof fetch;
    expect(await verifyTurnstile('tok', null, { secret: 's', fetchImpl: down })).toMatchObject({ ok: false, reason: 'unreachable' });
  });
});

describe('the three lead functions check Turnstile before writing (US-351)', () => {
  it.each(['capture-lead', 'handle-demo-request', 'handle-sales-contact'])('%s', async (fn) => {
    const { readFileSync } = await import('node:fs');
    const src = readFileSync(`supabase/functions/${fn}/index.ts`, 'utf8');
    const check = src.indexOf('verifyTurnstile(');
    const firstInsert = src.indexOf('.insert(');
    expect(check).toBeGreaterThan(-1);
    expect(check).toBeLessThan(firstInsert);
    expect(src).toContain("Deno.env.get('TURNSTILE_SECRET_KEY')");
  });
});
