import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

const env = new Map<string, string>();
vi.stubGlobal('Deno', { env: { get: (k: string) => env.get(k) } });

const { requireInternalCaller, isInternalCaller } = await import('./internal-only.ts');

const req = (headers: Record<string, string> = {}) =>
  new Request('https://api.brikly.net/functions/v1/webhook-trigger', { headers });

describe('requireInternalCaller', () => {
  beforeEach(() => {
    env.clear();
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => vi.restoreAllMocks());

  it('accepts the service-role bearer', () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-key');
    expect(requireInternalCaller(req({ authorization: 'Bearer svc-key' }))).toBeNull();
  });

  it('accepts the cron secret header', () => {
    env.set('CRON_SECRET', 'cron-secret');
    expect(requireInternalCaller(req({ 'x-cron-secret': 'cron-secret' }))).toBeNull();
  });

  it('rejects the anon key, which verify_jwt would have accepted', () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-key');
    // A validly-signed project JWT that is not the service role - this is the
    // exact case verify_jwt = true lets through.
    const res = requireInternalCaller(req({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.anon.sig' }));
    expect(res?.status).toBe(404);
  });

  it('rejects a wrong cron secret', () => {
    env.set('CRON_SECRET', 'cron-secret');
    expect(requireInternalCaller(req({ 'x-cron-secret': 'guess' }))?.status).toBe(404);
  });

  it('rejects when nothing is configured, rather than failing open', () => {
    // A misconfigured internal endpoint should be unreachable, not public.
    expect(requireInternalCaller(req())?.status).toBe(404);
    expect(requireInternalCaller(req({ authorization: 'Bearer anything' }))?.status).toBe(404);
  });

  it('does not accept an empty secret as a match', () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', '');
    env.set('CRON_SECRET', '');
    expect(requireInternalCaller(req({ authorization: 'Bearer ' }))?.status).toBe(404);
    expect(requireInternalCaller(req({ 'x-cron-secret': '' }))?.status).toBe(404);
  });

  it('answers 404, not 403, so the endpoint is not confirmed to exist', async () => {
    const res = requireInternalCaller(req());
    expect(res?.status).toBe(404);
    expect(await res!.json()).toEqual({ error: 'Not found' });
  });
});

describe('isInternalCaller', () => {
  beforeEach(() => env.clear());

  it('is true for the service-role bearer and the cron secret', () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-key');
    env.set('CRON_SECRET', 'cron-secret');
    expect(isInternalCaller(req({ authorization: 'Bearer svc-key' }))).toBe(true);
    expect(isInternalCaller(req({ 'x-cron-secret': 'cron-secret' }))).toBe(true);
  });

  it('is false for a user JWT or the anon key', () => {
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-key');
    env.set('CRON_SECRET', 'cron-secret');
    expect(isInternalCaller(req({ authorization: 'Bearer eyJhbGciOiJIUzI1NiJ9.user.sig' }))).toBe(false);
    expect(isInternalCaller(req())).toBe(false);
  });

  it('is false when nothing is configured, including for an empty bearer', () => {
    expect(isInternalCaller(req({ authorization: 'Bearer ' }))).toBe(false);
    expect(isInternalCaller(req({ 'x-cron-secret': '' }))).toBe(false);
  });
});
