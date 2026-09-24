import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  API_VERSION,
  MIN_SUPPORTED_IOS_VERSION,
  parseClientHeader,
  getClientInfo,
  clientAtLeast,
  stampEnvelope,
  stampResponse,
  withApiVersion,
  apiVersionHeaders,
} from './api-version';

// US-273. The rule under test: anything the parser does not recognise is
// legacy, and legacy never opts into a new response shape. Every iOS build
// shipped before this story sends no client header at all.

const req = (headers: Record<string, string>) => new Request('https://x.test/fn', { headers });

describe('parseClientHeader', () => {
  it.each([
    ['ios/1.2.3', 'ios', [1, 2, 3]],
    ['iOS/1.2', 'ios', [1, 2, 0]],
    ['web/7', 'web', [7, 0, 0]],
    ['brikly-web/2026.9.24', 'web', [2026, 9, 24]],
    ['ios/1.4.0 (build 88; iOS 18.1)', 'ios', [1, 4, 0]],
    ['  android/0.1.0  ', 'android', [0, 1, 0]],
  ])('reads %s', (value, platform, [major, minor, patch]) => {
    const c = parseClientHeader(value);
    expect(c.legacy).toBe(false);
    expect(c.platform).toBe(platform);
    expect(c.version).toEqual({ major, minor, patch });
  });

  it.each([
    [null],
    [undefined],
    [''],
    ['   '],
    ['brikly-mobile'], // what the web client sent before US-273
    ['supabase-js-web/2.50.3'], // supabase-js default x-client-info
    ['desktop/1.0.0'],
    ['ios'],
    ['ios/'],
    ['ios/abc'],
    ['ios/1.2.3.4'],
    ['ios/1.2.'],
    ['ios/' + '1'.repeat(300)],
  ])('treats %s as legacy', (value) => {
    const c = parseClientHeader(value as string | null | undefined);
    expect(c.legacy).toBe(true);
    expect(c.platform).toBeNull();
    expect(c.version).toBeNull();
  });
});

describe('getClientInfo', () => {
  it('is legacy with no headers, like every iOS build before US-273', () => {
    expect(getClientInfo(req({})).legacy).toBe(true);
  });

  it('prefers X-Brikly-Client', () => {
    const c = getClientInfo(req({ 'X-Brikly-Client': 'ios/1.3.0', 'x-client-info': 'brikly-web/9.0.0' }));
    expect(c.platform).toBe('ios');
  });

  it('falls back to a brikly- x-client-info (the web client)', () => {
    const c = getClientInfo(req({ 'x-client-info': 'brikly-web/1.0.0' }));
    expect(c).toMatchObject({ legacy: false, platform: 'web' });
  });

  it('ignores a non-brikly x-client-info', () => {
    expect(getClientInfo(req({ 'x-client-info': 'supabase-js-web/2.50.3' })).legacy).toBe(true);
    expect(getClientInfo(req({ 'x-client-info': 'web/1.0.0' })).legacy).toBe(true);
  });
});

describe('clientAtLeast', () => {
  const ios13 = parseClientHeader('ios/1.3.0');

  it('compares numerically, not as strings', () => {
    expect(clientAtLeast(parseClientHeader('ios/1.10.0'), 'ios', '1.9.0')).toBe(true);
    expect(clientAtLeast(parseClientHeader('ios/1.9.9'), 'ios', '1.10.0')).toBe(false);
  });

  it('is inclusive at the floor', () => {
    expect(clientAtLeast(ios13, 'ios', '1.3')).toBe(true);
    expect(clientAtLeast(ios13, 'ios', '1.3.1')).toBe(false);
  });

  it('never opts a legacy caller in', () => {
    expect(clientAtLeast(parseClientHeader(null), 'ios', '0.0.0')).toBe(false);
    expect(clientAtLeast(parseClientHeader(null), { ios: '0', web: '0' })).toBe(false);
  });

  it('does not opt in a platform the check did not name', () => {
    expect(clientAtLeast(parseClientHeader('web/99.0.0'), 'ios', '1.0.0')).toBe(false);
    expect(clientAtLeast(parseClientHeader('web/99.0.0'), { ios: '1.0.0' })).toBe(false);
    expect(clientAtLeast(parseClientHeader('web/1.0.0'), { ios: '2.0.0', web: '1.0.0' })).toBe(true);
  });

  it('throws on a malformed floor rather than guessing', () => {
    expect(() => clientAtLeast(ios13, 'ios', '1.x')).toThrow(/bad version/);
  });
});

describe('stamping', () => {
  it('adds api_version to an envelope and moves nothing', () => {
    const body = { success: true, data: { a: 1 }, timestamp: 't' };
    expect(stampEnvelope(body)).toEqual({ ...body, api_version: API_VERSION });
  });

  it('leaves non-objects and an existing api_version alone', () => {
    expect(stampEnvelope([1, 2])).toEqual([1, 2]);
    expect(stampEnvelope('ok')).toBe('ok');
    expect(stampEnvelope(null)).toBeNull();
    expect(stampEnvelope({ api_version: 7 })).toEqual({ api_version: 7 });
  });

  it('names the iOS floor in X-Min-Supported-Client', () => {
    expect(apiVersionHeaders()['X-Min-Supported-Client']).toContain(`ios=${MIN_SUPPORTED_IOS_VERSION}`);
    expect(apiVersionHeaders()['X-API-Version']).toBe(String(API_VERSION));
  });

  it('stamps a JSON response, keeping status and existing headers', async () => {
    const res = await stampResponse(new Response(JSON.stringify({ success: false, error: 'no' }), {
      status: 403,
      headers: { 'Content-Type': 'application/json', 'X-Request-ID': 'r1' },
    }));
    expect(res.status).toBe(403);
    expect(res.headers.get('X-Request-ID')).toBe('r1');
    expect(res.headers.get('X-API-Version')).toBe(String(API_VERSION));
    expect(await res.json()).toEqual({ success: false, error: 'no', api_version: API_VERSION });
  });

  it('keeps the bytes of non-JSON and bodiless responses', async () => {
    const text = await stampResponse(new Response('ok', { headers: { 'Content-Type': 'text/plain' } }));
    expect(await text.text()).toBe('ok');
    expect(text.headers.get('X-API-Version')).toBe(String(API_VERSION));

    const preflight = await stampResponse(new Response(null, { status: 204 }));
    expect(preflight.status).toBe(204);
    expect(preflight.body).toBeNull();

    const broken = await stampResponse(new Response('{not json', { headers: { 'Content-Type': 'application/json' } }));
    expect(await broken.text()).toBe('{not json');
  });

  it('withApiVersion stamps whatever the handler returns', async () => {
    const handler = withApiVersion(async () =>
      new Response(JSON.stringify({ success: true, timestamp: 't' }), {
        headers: { 'Content-Type': 'application/json' },
      }));
    const res = await handler(req({}));
    expect((await res.json()).api_version).toBe(API_VERSION);
  });
});

describe('wiring', () => {
  const read = (p: string) => readFileSync(p, 'utf8');

  it('the shared envelope helpers stamp the version and headers', () => {
    const src = read('supabase/functions/_shared/auth-helpers.ts');
    expect(src.match(/api_version: API_VERSION/g)?.length).toBe(2);
    expect(src.match(/\.\.\.apiVersionHeaders\(\)/g)?.length).toBe(2);
  });

  it('projects: its two non-helper responses are stamped in _shared', () => {
    expect(read('supabase/functions/_shared/entitlements.ts')).toContain('api_version: API_VERSION');
    expect(read('supabase/functions/_shared/project-delete.ts')).toContain('stampEnvelope(projectHasFinancialRecordsBody())');
  });

  it('verify-mfa-login (auth) stamps headers on every response and the version on every success', () => {
    const src = read('supabase/functions/verify-mfa-login/index.ts');
    expect(src).toContain('const corsHeaders = { ...getCorsHeaders(req), ...apiVersionHeaders() };');
    const successes = src.match(/success: true,/g)?.length ?? 0;
    expect(successes).toBeGreaterThan(0);
    expect(src.match(/api_version: API_VERSION,/g)?.length).toBe(successes);
  });

  it.each(['projects', 'time-tracking', 'generate-invoice'])('%s answers through the stamped helpers', (fn) => {
    const src = read(`supabase/functions/${fn}/index.ts`);
    expect(src).toContain('successResponse');
    // No hand-rolled JSON response that would bypass the stamp.
    expect(src).not.toMatch(/new\s+Response\s*\(\s*JSON\.stringify/);
  });

  it('the web client identifies itself on x-client-info', () => {
    const src = read('src/integrations/supabase/client.ts');
    expect(src).toContain("'x-client-info': BRIKLY_CLIENT_INFO");
    expect(src).toContain('brikly-web/');
  });

  it('the iOS edge-function client sends X-Brikly-Client', () => {
    const src = read('Brikly-iOS/Brikly/Services/SupabaseService.swift');
    expect(src).toContain('forHTTPHeaderField: "X-Brikly-Client"');
  });
});
