#!/usr/bin/env node
/**
 * Uptime monitor for the health-check edge function (US-280).
 *
 * Run by .github/workflows/uptime-health-check.yml on a schedule. It calls
 * HEALTH_CHECK_URL, reads the { success, status, services, timestamp } body,
 * and posts to Slack only when something changes:
 *
 *   up   -> down   "FAILING" alert
 *   down -> down   silent, except a reminder every REMIND_AFTER_MINUTES
 *   down -> up     "RECOVERED" message with how long it was down
 *   up   -> up     silent
 *
 * The previous state lives in a small JSON file (STATE_FILE) that the workflow
 * carries between runs through the Actions cache. A missing or unreadable file
 * means "unknown": a down result then alerts, an up result stays quiet.
 *
 * Env:
 *   HEALTH_CHECK_URL      required; unset -> prints a notice and exits 0
 *   HEALTH_CHECK_ANON_KEY anon key; sent as apikey and Authorization: Bearer
 *   SLACK_WEBHOOK_URL     optional; unset -> the failed run's email is the page
 *   STATE_FILE            default .uptime-state/state.json
 *   ATTEMPTS              default 3
 *   RETRY_DELAY_MS        default 15000
 *   TIMEOUT_MS            default 20000 per attempt
 *   REMIND_AFTER_MINUTES  default 360
 *   SIMULATE_FAILURE      "true" -> force a down result, never saved as state
 *   GITHUB_OUTPUT         outputs: action, up, fail_run, persist, skipped
 *
 * The exported functions are pure (fetch, clock and sleep are injected) and
 * are tested in src/lib/__tests__/uptimeMonitor.test.ts.
 */
import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

/**
 * Turn one HTTP result into { up, httpStatus, status, failing, reason }.
 * Up means HTTP 200 AND status "healthy" AND success !== false. Anything else,
 * including a body that is not the health envelope, is down.
 */
export function classifyResponse({ httpStatus, bodyText, error }) {
  if (error) {
    return { up: false, httpStatus: 0, status: 'unreachable', failing: [], reason: String(error) };
  }
  let body = null;
  try {
    body = JSON.parse(bodyText ?? '');
  } catch {
    body = null;
  }
  if (!body || typeof body !== 'object' || typeof body.status !== 'string') {
    return {
      up: false,
      httpStatus,
      status: 'unknown',
      failing: [],
      reason: `HTTP ${httpStatus}, body is not the health-check envelope`,
    };
  }
  const services = body.services && typeof body.services === 'object' ? body.services : {};
  const failing = Object.entries(services)
    .filter(([, s]) => !s || s.status !== 'healthy')
    .map(([name, s]) => `${name}=${(s && s.status) || 'unknown'}`);
  const up = httpStatus === 200 && body.status === 'healthy' && body.success !== false;
  const reason = up
    ? 'healthy'
    : `HTTP ${httpStatus}, status=${body.status}${failing.length ? ` (${failing.join(', ')})` : ''}`;
  return { up, httpStatus, status: body.status, failing, reason };
}

/**
 * Decide what to send given the last saved state and this run's result.
 * prev: { up: boolean, since: iso, lastAlertAt: iso|null } | null
 * Returns { action: 'alert'|'remind'|'recover'|'none', state }.
 */
export function decide(prev, result, nowMs, { remindAfterMs = 6 * 60 * 60 * 1000 } = {}) {
  const now = new Date(nowMs).toISOString();
  const known = prev && typeof prev.up === 'boolean';

  if (result.up) {
    if (known && prev.up === false) {
      return { action: 'recover', state: { up: true, since: now, lastAlertAt: null, downSince: prev.since ?? null } };
    }
    return { action: 'none', state: { up: true, since: known && prev.up ? prev.since : now, lastAlertAt: null } };
  }

  if (!known || prev.up === true) {
    return { action: 'alert', state: { up: false, since: now, lastAlertAt: now } };
  }

  const last = prev.lastAlertAt ? Date.parse(prev.lastAlertAt) : NaN;
  if (Number.isNaN(last) || nowMs - last >= remindAfterMs) {
    return { action: 'remind', state: { up: false, since: prev.since ?? now, lastAlertAt: now } };
  }
  return { action: 'none', state: { up: false, since: prev.since ?? now, lastAlertAt: prev.lastAlertAt } };
}

/**
 * The state to save when the Slack post for `action` did not go through, so
 * the next run tries again instead of treating the message as delivered.
 */
export function stateAfterFailedNotify(prev, decision) {
  if (decision.action === 'recover') return prev;
  if (decision.action === 'alert' || decision.action === 'remind') {
    return { ...decision.state, lastAlertAt: null };
  }
  return decision.state;
}

export function formatDuration(ms) {
  const mins = Math.max(0, Math.round(ms / 60000));
  if (mins < 60) return `${mins}m`;
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

export function formatSlackMessage(action, result, state, { runUrl, nowMs, simulated = false }) {
  const tag = simulated ? '[SIMULATED] ' : '';
  const link = runUrl ? ` Run: ${runUrl}` : '';
  if (action === 'alert') {
    return `:rotating_light: ${tag}Brikly health check FAILING: ${result.reason}.${link}`;
  }
  if (action === 'remind') {
    const down = state.since ? ` Down for ${formatDuration(nowMs - Date.parse(state.since))}.` : '';
    return `:rotating_light: ${tag}Brikly health check STILL FAILING: ${result.reason}.${down}${link}`;
  }
  if (action === 'recover') {
    const down = state.downSince ? ` after ${formatDuration(nowMs - Date.parse(state.downSince))} down` : '';
    return `:white_check_mark: ${tag}Brikly health check RECOVERED${down}.${link}`;
  }
  return null;
}

/** One request, bounded by timeoutMs. Never throws. */
export async function probeOnce(url, { fetchImpl = fetch, timeoutMs = 20000, apiKey } = {}) {
  const headers = { accept: 'application/json' };
  // health-check is not listed in supabase/config.toml, so it keeps the
  // default verify_jwt = true: the gateway wants the anon key as a bearer JWT,
  // not only as apikey. The anon key is public; it grants nothing here.
  if (apiKey) {
    headers.apikey = apiKey;
    headers.authorization = `Bearer ${apiKey}`;
  }
  try {
    const res = await fetchImpl(url, { headers, signal: AbortSignal.timeout(timeoutMs) });
    const bodyText = await res.text();
    return classifyResponse({ httpStatus: res.status, bodyText });
  } catch (err) {
    const name = err && err.name;
    const msg = name === 'TimeoutError' || name === 'AbortError'
      ? `timed out after ${timeoutMs}ms`
      : (err && err.message) || String(err);
    return classifyResponse({ error: msg });
  }
}

/** Up to `attempts` probes, `delayMs` apart; stops at the first up result. */
export async function probe(url, { attempts = 3, delayMs = 15000, sleep, log = () => {}, ...opts } = {}) {
  const wait = sleep ?? ((ms) => new Promise((r) => setTimeout(r, ms)));
  let result;
  for (let i = 1; i <= attempts; i++) {
    result = await probeOnce(url, opts);
    log(`attempt ${i}/${attempts}: ${result.reason}`);
    if (result.up) return result;
    if (i < attempts) await wait(delayMs);
  }
  return result;
}

export async function postSlack(webhookUrl, text, { fetchImpl = fetch, timeoutMs = 10000 } = {}) {
  try {
    const res = await fetchImpl(webhookUrl, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ text }),
      signal: AbortSignal.timeout(timeoutMs),
    });
    return res.ok ? { ok: true } : { ok: false, error: `Slack answered HTTP ${res.status}` };
  } catch (err) {
    return { ok: false, error: (err && err.message) || String(err) };
  }
}

export function readState(path) {
  try {
    const s = JSON.parse(readFileSync(path, 'utf8'));
    return s && typeof s.up === 'boolean' ? s : null;
  } catch {
    return null;
  }
}

function num(v, fallback) {
  const n = Number(v);
  return Number.isFinite(n) && n >= 0 ? n : fallback;
}

/**
 * Whole run. Returns the outputs it wrote so tests can assert on them.
 * `deps` lets tests replace fetch, the clock, sleep and file IO.
 */
export async function run(env = process.env, deps = {}) {
  const {
    fetchImpl = fetch,
    now = () => Date.now(),
    sleep,
    log = (m) => console.log(m),
    read = readState,
    write = (p, s) => { mkdirSync(dirname(p), { recursive: true }); writeFileSync(p, JSON.stringify(s, null, 2) + '\n'); },
    output = (k, v) => { if (env.GITHUB_OUTPUT) appendFileSync(env.GITHUB_OUTPUT, `${k}=${v}\n`); },
  } = deps;

  const outputs = {};
  const set = (k, v) => { outputs[k] = String(v); output(k, String(v)); };

  const url = (env.HEALTH_CHECK_URL || '').trim();
  const simulated = env.SIMULATE_FAILURE === 'true';
  if (!url && !simulated) {
    log('::notice::HEALTH_CHECK_URL is not set - uptime monitoring is inert. Set it under Settings > Secrets and variables > Actions (see docs/RUNBOOK_MONITORING.md).');
    set('skipped', true);
    set('action', 'none');
    set('fail_run', false);
    set('persist', false);
    return outputs;
  }
  set('skipped', false);

  const slack = (env.SLACK_WEBHOOK_URL || '').trim();
  if (!slack) {
    log('::notice::SLACK_WEBHOOK_URL is not set - alerts go only through the failed run (Actions email).');
  }

  const statePath = env.STATE_FILE || '.uptime-state/state.json';
  const prev = read(statePath);

  const result = simulated
    ? { up: false, httpStatus: 0, status: 'simulated', failing: [], reason: 'simulated failure (workflow_dispatch)' }
    : await probe(url, {
      attempts: Math.max(1, num(env.ATTEMPTS, 3)),
      delayMs: num(env.RETRY_DELAY_MS, 15000),
      timeoutMs: num(env.TIMEOUT_MS, 20000),
      apiKey: env.HEALTH_CHECK_ANON_KEY || undefined,
      fetchImpl,
      sleep,
      log,
    });

  const nowMs = now();
  // A simulated run always sends, and never touches the saved state.
  const decision = simulated
    ? { action: 'alert', state: prev }
    : decide(prev, result, nowMs, { remindAfterMs: num(env.REMIND_AFTER_MINUTES, 360) * 60000 });

  let state = decision.state;
  const runUrl = env.GITHUB_RUN_ID
    ? `${env.GITHUB_SERVER_URL || 'https://github.com'}/${env.GITHUB_REPOSITORY}/actions/runs/${env.GITHUB_RUN_ID}`
    : '';

  if (decision.action !== 'none') {
    const text = formatSlackMessage(decision.action, result, decision.state ?? {}, { runUrl, nowMs, simulated });
    log(text);
    if (slack) {
      const sent = await postSlack(slack, text, { fetchImpl });
      if (!sent.ok) {
        log(`::warning::Slack post failed (${sent.error}); will retry next run.`);
        if (!simulated) state = stateAfterFailedNotify(prev, decision);
      }
    }
  }

  if (result.up) {
    log(`Health check OK (${result.reason}).`);
  } else {
    log(`::error::Health check down: ${result.reason}`);
  }

  if (!simulated) write(statePath, state);
  set('action', decision.action);
  set('up', result.up);
  set('persist', !simulated);
  // Fail the run (Actions emails the admins) only when an alert or reminder
  // went out, so a long outage does not email on every 10-minute run.
  set('fail_run', decision.action === 'alert' || decision.action === 'remind');
  return outputs;
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  run().catch((err) => {
    console.log(`::error::uptime-monitor crashed: ${(err && err.stack) || err}`);
    process.exit(1);
  });
}
