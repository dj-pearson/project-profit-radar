import { describe, it, expect, vi, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * requireInternalCallerOrRootAdmin gates send-renewal-notification (a run
 * that emails every subscriber on the platform) and the two Google APIs
 * sync-analytics-data calls with the service-role client. Company admins are
 * refused; cron and other edge functions get in on the service-role bearer
 * or CRON_SECRET; nothing fails open.
 */

const env = new Map<string, string>();
vi.stubGlobal('Deno', { env: { get: (k: string) => env.get(k) } });

let caller: { id: string; role: string | null } | null = null;
vi.mock('./auth-helpers.ts', () => ({
  initializeAuthContext: async () =>
    caller
      ? {
          user: { id: caller.id },
          supabase: {
            from: () => ({
              select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: caller!.role ? { role: caller!.role } : null }) }) }),
            }),
          },
        }
      : null,
}));

const { requireInternalCallerOrRootAdmin } = await import('./system-auth.ts');

const req = (headers: Record<string, string> = {}) =>
  new Request('https://api.brikly.net/functions/v1/send-renewal-notification', { method: 'POST', headers });

describe('requireInternalCallerOrRootAdmin', () => {
  beforeEach(() => {
    env.clear();
    env.set('SUPABASE_SERVICE_ROLE_KEY', 'svc-key');
    env.set('CRON_SECRET', 'cron-secret');
    caller = null;
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  it('lets the service-role bearer in, which is how check-renewal-notifications and sync-analytics-data call', async () => {
    expect(await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer svc-key' }))).toBeNull();
  });

  it('lets the cron secret in', async () => {
    expect(await requireInternalCallerOrRootAdmin(req({ 'x-cron-secret': 'cron-secret' }))).toBeNull();
  });

  it('lets a signed-in root_admin in', async () => {
    caller = { id: 'u1', role: 'root_admin' };
    expect(await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer user-jwt' }))).toBeNull();
  });

  it.each(['admin', 'project_manager', 'office_staff'])('refuses a signed-in %s with 403', async (role) => {
    caller = { id: 'u1', role };
    const res = await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer user-jwt' }), {
      corsHeaders: { 'Access-Control-Allow-Origin': 'https://brikly.net' },
    });
    expect(res?.status).toBe(403);
    expect(res?.headers.get('Access-Control-Allow-Origin')).toBe('https://brikly.net');
    const body = await res!.json();
    expect(body.success).toBe(false);
    expect(typeof body.timestamp).toBe('string');
  });

  it('refuses a caller with no profile, and one with no session', async () => {
    caller = { id: 'u1', role: null };
    expect((await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer user-jwt' })))?.status).toBe(403);
    caller = null;
    expect((await requireInternalCallerOrRootAdmin(req()))?.status).toBe(401);
  });

  it('does not fail open when CRON_SECRET is unset, unlike requireSystemOrAdmin', async () => {
    env.delete('CRON_SECRET');
    expect((await requireInternalCallerOrRootAdmin(req()))?.status).toBe(401);
    caller = { id: 'u1', role: 'admin' };
    expect((await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer user-jwt' })))?.status).toBe(403);
  });

  it('uses the forbidden message a function passes', async () => {
    caller = { id: 'u1', role: 'admin' };
    const res = await requireInternalCallerOrRootAdmin(req({ authorization: 'Bearer user-jwt' }), {
      forbiddenMessage: 'Access denied. Root admin required.',
    });
    expect((await res!.json()).error).toBe('Access denied. Root admin required.');
  });
});

// The entry points are Deno serve() handlers vitest cannot import, so their
// use of the gate is pinned by reading the source.
const code = (name: string) =>
  readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:'"`])\/\/.*$/gm, '$1');

const at = (src: string, needle: string) => {
  const i = src.indexOf(needle);
  expect(i, `missing: ${needle}`).toBeGreaterThan(-1);
  return i;
};

describe('send-renewal-notification', () => {
  const src = code('send-renewal-notification');

  it('is gated by requireInternalCallerOrRootAdmin, not requireSystemOrAdmin', () => {
    expect(src).not.toContain('requireSystemOrAdmin');
    expect(at(src, 'requireInternalCallerOrRootAdmin(req')).toBeLessThan(at(src, ".from('subscribers')"));
    expect(at(src, 'requireInternalCallerOrRootAdmin(req')).toBeLessThan(at(src, 'RESEND_API_KEY'));
  });

  it('is still reachable by the daily run, which calls it with the service-role client', () => {
    const cron = code('check-renewal-notifications');
    expect(cron).toContain('SUPABASE_SERVICE_ROLE_KEY');
    expect(cron).toContain("functions.invoke('send-renewal-notification')");
  });
});

describe.each(['google-analytics-api', 'google-search-console-api'])('%s', (name) => {
  const src = code(name);

  it('is gated by requireInternalCallerOrRootAdmin, since sync-analytics-data calls it with the service-role client', () => {
    expect(code('sync-analytics-data')).toContain(`serviceClient.functions.invoke('${name}'`);
    const gate = at(src, 'requireInternalCallerOrRootAdmin(req');
    expect(gate).toBeLessThan(at(src, 'validateBody('));
    expect(gate).toBeLessThan(at(src, 'getGoogleAccessToken(googleClientEmail'));
  });

  it('no longer runs its own getUser() check, which refused the service-role bearer', () => {
    expect(src).not.toMatch(/auth\.getUser\(/);
  });
});
