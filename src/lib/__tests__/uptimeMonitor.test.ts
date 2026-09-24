import { describe, it, expect } from 'vitest';
import {
  classifyResponse,
  decide,
  formatSlackMessage,
  probe,
  run,
  stateAfterFailedNotify,
  // @ts-expect-error - plain .mjs script, no types
} from '../../../scripts/uptime-monitor.mjs';
import { evaluateHealth, runCheck, toPublicChecks } from '../../../supabase/functions/health-check/evaluate';

/**
 * US-280: the uptime workflow is a thin shell around scripts/uptime-monitor.mjs.
 * The part worth pinning is when it pages: once on the way down, every 6h while
 * down, once on the way back, and never when HEALTH_CHECK_URL is unset.
 */

const healthy = JSON.stringify({
  success: true,
  status: 'healthy',
  timestamp: '2026-09-24T00:00:00Z',
  services: {
    database: { status: 'healthy', responseTime: 12 },
    auth: { status: 'healthy', responseTime: 8 },
    storage: { status: 'healthy', responseTime: 20 },
  },
});

const storageDown = JSON.stringify({
  success: false,
  status: 'degraded',
  timestamp: '2026-09-24T00:00:00Z',
  services: {
    database: { status: 'healthy', responseTime: 12 },
    auth: { status: 'healthy', responseTime: 8 },
    storage: { status: 'degraded', responseTime: 20 },
  },
});

const T0 = Date.parse('2026-09-24T12:00:00Z');
const MIN = 60_000;

function fakeFetch(responses: Array<{ status: number; body: string } | Error>) {
  const calls: Array<{ url: string; init: RequestInit }> = [];
  let i = 0;
  const impl = async (url: string, init: RequestInit) => {
    calls.push({ url, init });
    const r = responses[Math.min(i++, responses.length - 1)];
    if (r instanceof Error) throw r;
    return new Response(r.body, { status: r.status });
  };
  return { impl, calls };
}

describe('classifyResponse', () => {
  it('is up only for 200 + status healthy', () => {
    expect(classifyResponse({ httpStatus: 200, bodyText: healthy }).up).toBe(true);
  });

  it('names the failing dependency from the 503 envelope', () => {
    const r = classifyResponse({ httpStatus: 503, bodyText: storageDown });
    expect(r.up).toBe(false);
    expect(r.failing).toEqual(['storage=degraded']);
    expect(r.reason).toBe('HTTP 503, status=degraded (storage=degraded)');
  });

  it('treats a 200 that is not the envelope as down (a gateway page, a proxy)', () => {
    expect(classifyResponse({ httpStatus: 200, bodyText: '<html>ok</html>' }).up).toBe(false);
    expect(classifyResponse({ httpStatus: 200, bodyText: '{"message":"hi"}' }).up).toBe(false);
  });

  it('treats a 200 claiming healthy with success=false as down', () => {
    const body = JSON.stringify({ success: false, status: 'healthy', services: {} });
    expect(classifyResponse({ httpStatus: 200, bodyText: body }).up).toBe(false);
  });

  it('reports a network error as unreachable', () => {
    const r = classifyResponse({ error: 'ECONNREFUSED' });
    expect(r).toMatchObject({ up: false, status: 'unreachable', reason: 'ECONNREFUSED' });
  });
});

describe('decide', () => {
  const up = { up: true, reason: 'healthy' };
  const down = { up: false, reason: 'HTTP 503' };
  const remindAfterMs = 360 * MIN;

  it('stays quiet while up, including the first run with no saved state', () => {
    expect(decide(null, up, T0).action).toBe('none');
    expect(decide({ up: true, since: 'x', lastAlertAt: null }, up, T0).action).toBe('none');
  });

  it('alerts on up -> down and on a first run that finds it down', () => {
    expect(decide({ up: true, since: 'x', lastAlertAt: null }, down, T0).action).toBe('alert');
    expect(decide(null, down, T0).action).toBe('alert');
  });

  it('does not repeat the alert every run while down', () => {
    const { state } = decide(null, down, T0, { remindAfterMs });
    expect(decide(state, down, T0 + 10 * MIN, { remindAfterMs }).action).toBe('none');
    expect(decide(state, down, T0 + 359 * MIN, { remindAfterMs }).action).toBe('none');
  });

  it('reminds once the reminder interval passes, keeping the original since', () => {
    const { state } = decide(null, down, T0, { remindAfterMs });
    const r = decide(state, down, T0 + 360 * MIN, { remindAfterMs });
    expect(r.action).toBe('remind');
    expect(r.state.since).toBe(new Date(T0).toISOString());
    expect(decide(r.state, down, T0 + 370 * MIN, { remindAfterMs }).action).toBe('none');
  });

  it('sends one recovery on down -> up, then goes quiet', () => {
    const { state } = decide(null, down, T0);
    const r = decide(state, up, T0 + 42 * MIN);
    expect(r.action).toBe('recover');
    expect(r.state.downSince).toBe(new Date(T0).toISOString());
    expect(decide(r.state, up, T0 + 52 * MIN).action).toBe('none');
  });
});

describe('stateAfterFailedNotify', () => {
  it('leaves an undelivered alert due on the next run', () => {
    const d = decide(null, { up: false }, T0);
    const s = stateAfterFailedNotify(null, d);
    expect(decide(s, { up: false }, T0 + MIN).action).toBe('remind');
  });

  it('keeps the down state when the recovery message was not delivered', () => {
    const prev = { up: false, since: new Date(T0).toISOString(), lastAlertAt: new Date(T0).toISOString() };
    const d = decide(prev, { up: true }, T0 + MIN);
    const s = stateAfterFailedNotify(prev, d);
    expect(decide(s, { up: true }, T0 + 2 * MIN).action).toBe('recover');
  });
});

describe('formatSlackMessage', () => {
  it('says how long it was down on recovery', () => {
    const text = formatSlackMessage('recover', { reason: 'healthy' }, { downSince: new Date(T0).toISOString() }, {
      runUrl: 'https://github.com/o/r/actions/runs/1',
      nowMs: T0 + 95 * MIN,
    });
    expect(text).toBe(':white_check_mark: Brikly health check RECOVERED after 1h 35m down. Run: https://github.com/o/r/actions/runs/1');
  });

  it('marks a simulated alert', () => {
    const text = formatSlackMessage('alert', { reason: 'simulated' }, {}, { nowMs: T0, simulated: true });
    expect(text).toContain('[SIMULATED]');
  });
});

describe('probe', () => {
  it('retries and stops at the first healthy answer', async () => {
    const f = fakeFetch([{ status: 503, body: storageDown }, { status: 200, body: healthy }]);
    const r = await probe('https://x/health-check', { attempts: 3, delayMs: 0, sleep: async () => {}, fetchImpl: f.impl });
    expect(r.up).toBe(true);
    expect(f.calls).toHaveLength(2);
  });

  it('turns a timeout into a clean down result instead of throwing', async () => {
    const err = Object.assign(new Error('aborted'), { name: 'TimeoutError' });
    const f = fakeFetch([err]);
    const r = await probe('https://x/health-check', { attempts: 2, delayMs: 0, sleep: async () => {}, fetchImpl: f.impl, timeoutMs: 20000 });
    expect(r).toMatchObject({ up: false, status: 'unreachable', reason: 'timed out after 20000ms' });
    expect(f.calls).toHaveLength(2);
  });

  it('sends the anon key as apikey and as a bearer token (verify_jwt gateway)', async () => {
    const f = fakeFetch([{ status: 200, body: healthy }]);
    await probe('https://x/health-check', { attempts: 1, fetchImpl: f.impl, apiKey: 'anon' });
    const headers = f.calls[0].init.headers as Record<string, string>;
    expect(headers.apikey).toBe('anon');
    expect(headers.authorization).toBe('Bearer anon');
  });
});

describe('run', () => {
  function harness(responses: Array<{ status: number; body: string } | Error>, saved: unknown = null) {
    const f = fakeFetch(responses);
    const files: Record<string, unknown> = {};
    const logs: string[] = [];
    const deps = {
      fetchImpl: f.impl,
      now: () => T0,
      sleep: async () => {},
      log: (m: string) => logs.push(m),
      read: () => saved,
      write: (p: string, s: unknown) => { files[p] = s; },
      output: () => {},
    };
    return { f, files, logs, deps };
  }

  it('skips with a notice and touches nothing when HEALTH_CHECK_URL is unset', async () => {
    const h = harness([]);
    const out = await run({ SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x' }, h.deps);
    expect(out).toMatchObject({ skipped: 'true', fail_run: 'false', persist: 'false' });
    expect(h.logs[0]).toMatch(/^::notice::HEALTH_CHECK_URL is not set/);
    expect(h.f.calls).toHaveLength(0);
    expect(h.files).toEqual({});
  });

  it('posts one Slack alert on the first failure and fails the run', async () => {
    const h = harness([{ status: 503, body: storageDown }, { status: 503, body: storageDown }, { status: 503, body: storageDown }, { status: 200, body: 'ok' }]);
    const out = await run({ HEALTH_CHECK_URL: 'https://x/health-check', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x', STATE_FILE: 's.json' }, h.deps);
    expect(out).toMatchObject({ action: 'alert', up: 'false', fail_run: 'true', persist: 'true' });
    const slackCalls = h.f.calls.filter((c) => c.url.startsWith('https://hooks.slack.test'));
    expect(slackCalls).toHaveLength(1);
    expect(JSON.parse(String(slackCalls[0].init.body)).text).toContain('FAILING: HTTP 503, status=degraded (storage=degraded)');
    expect(h.files['s.json']).toMatchObject({ up: false });
  });

  it('stays silent and green on a continuing outage inside the reminder window', async () => {
    const saved = { up: false, since: new Date(T0 - 20 * MIN).toISOString(), lastAlertAt: new Date(T0 - 20 * MIN).toISOString() };
    const h = harness([{ status: 503, body: storageDown }], saved);
    const out = await run({ HEALTH_CHECK_URL: 'https://x/h', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x', ATTEMPTS: '1' }, h.deps);
    expect(out).toMatchObject({ action: 'none', fail_run: 'false' });
    expect(h.f.calls.filter((c) => c.url.startsWith('https://hooks.slack.test'))).toHaveLength(0);
  });

  it('posts a recovery when it comes back', async () => {
    const saved = { up: false, since: new Date(T0 - 30 * MIN).toISOString(), lastAlertAt: new Date(T0 - 30 * MIN).toISOString() };
    const h = harness([{ status: 200, body: healthy }, { status: 200, body: 'ok' }], saved);
    const out = await run({ HEALTH_CHECK_URL: 'https://x/h', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x' }, h.deps);
    expect(out).toMatchObject({ action: 'recover', up: 'true', fail_run: 'false' });
    const slack = h.f.calls.find((c) => c.url.startsWith('https://hooks.slack.test'));
    expect(JSON.parse(String(slack!.init.body)).text).toContain('RECOVERED after 30m down');
  });

  it('still fails the run when Slack is not configured, so the email path pages', async () => {
    const h = harness([{ status: 503, body: storageDown }]);
    const out = await run({ HEALTH_CHECK_URL: 'https://x/h', ATTEMPTS: '1' }, h.deps);
    expect(out).toMatchObject({ action: 'alert', fail_run: 'true' });
    expect(h.logs.some((l) => l.startsWith('::notice::SLACK_WEBHOOK_URL is not set'))).toBe(true);
  });

  it('a simulated failure alerts but never saves state', async () => {
    const h = harness([{ status: 200, body: 'ok' }]);
    const out = await run({ SIMULATE_FAILURE: 'true', SLACK_WEBHOOK_URL: 'https://hooks.slack.test/x' }, h.deps);
    expect(out).toMatchObject({ action: 'alert', persist: 'false', fail_run: 'true' });
    expect(h.files).toEqual({});
  });
});

/**
 * The other half of the contract: health-check itself. evaluate.ts has no Deno
 * imports, so it runs here too (deno is not in CI).
 */
describe('health-check probes', () => {
  it('turns each dependency outcome into the status the monitor pages on', async () => {
    const database = await runCheck(async () => ({ error: null }));
    const auth = await runCheck(() => Promise.reject(new Error('ECONNREFUSED 10.0.0.4:9999')));
    const storage = await runCheck(() => new Promise(() => {}), 20);
    expect([database.status, auth.status, storage.status]).toEqual(['healthy', 'unhealthy', 'unhealthy']);
    expect(storage.error).toBe('timed out after 20ms');
    expect(evaluateHealth({ database, auth, storage })).toEqual({ overallStatus: 'unhealthy', httpStatus: 503 });
  });

  it('a dependency that answers with an error is degraded -> 503', async () => {
    const storage = await runCheck(async () => ({ error: { message: 'bucket list failed' } }));
    expect(storage).toMatchObject({ status: 'degraded', error: 'bucket list failed' });
    expect(evaluateHealth({ storage }).httpStatus).toBe(503);
  });

  it('never puts dependency error text in the public body', async () => {
    const auth = await runCheck(() => Promise.reject(new Error('ECONNREFUSED 10.0.0.4:9999')));
    const body = JSON.stringify(toPublicChecks({ auth }));
    expect(body).not.toContain('10.0.0.4');
    expect(Object.keys(toPublicChecks({ auth }).auth)).toEqual(['status', 'responseTime']);
  });

  it('what health-check returns on a dependency outage is what the monitor alerts on', async () => {
    const checks = { database: await runCheck(async () => ({ error: { message: 'x' } })) };
    const { overallStatus, httpStatus } = evaluateHealth(checks);
    const bodyText = JSON.stringify({ success: httpStatus < 400, status: overallStatus, services: toPublicChecks(checks) });
    expect(classifyResponse({ httpStatus, bodyText })).toMatchObject({ up: false, failing: ['database=degraded'] });
  });
});
