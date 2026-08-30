import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * US-274: the response envelope.
 *
 * CLAUDE.md fixes the API response shape at `{ success, data?, error?,
 * timestamp }` and the iOS app parses against it. 696 of the 721 hand-rolled
 * `new Response(JSON.stringify(...))` sites in supabase/functions do not
 * produce it, so the client carries a special case for each.
 *
 * The interesting part is what the guard checks. "Every function calls
 * successResponse" is the obvious rule and it is the wrong one: those helpers
 * NEST the payload under `data`, and moving an existing top-level key under
 * `data` removes a field a shipped client reads - a never-in-one-release
 * change. The guard therefore checks for `success` and `timestamp` alongside
 * whatever a response already returns, which is purely additive.
 */

const GUARD = 'scripts/check-response-envelope.mjs';
const guard = readFileSync(GUARD, 'utf8');

describe('the guard measures the additive half, not the breaking one', () => {
  it('checks for success + timestamp keys rather than helper adoption', () => {
    expect(guard).toContain("keys.includes('success')");
    expect(guard).toContain("keys.includes('timestamp')");
  });

  it('says in the file why nesting under data is not what it asks for', () => {
    expect(guard).toContain('MIN_SUPPORTED_IOS_VERSION');
    expect(guard).toContain('check-subscription');
  });

  it('only reads JSON.stringify inside new Response, not fetch bodies or logs', () => {
    // Counting every JSON.stringify put 1,215 "responses" across 189 functions.
    // A fetch body and a log line are not responses.
    expect(guard).toContain('new\\s+Response\\s*\\(\\s*JSON\\.stringify');
  });

  it('aborts before printing a count when the parser finds almost nothing', () => {
    // A broken parser reports zero offenders, which reads as the best result
    // this guard could produce. The TypeScript ratchet learned this the
    // expensive way (US-258): print the abort, never the number.
    const abortAt = guard.indexOf('if (scanned < 100)');
    const summaryAt = guard.indexOf("console.log('Edge-function response-envelope guard");
    expect(abortAt).toBeGreaterThan(-1);
    expect(abortAt, 'the abort must come before the summary').toBeLessThan(summaryAt);
  });

  it('exempts provider webhooks, whose body the provider specifies', () => {
    expect(guard).toContain('stripe-webhook');
    expect(guard).toContain('ACK_ONLY');
  });

  it('fails in both directions, so the baseline cannot become a ceiling', () => {
    expect(guard).toContain('offenders.length > BASELINE');
    expect(guard).toContain('offenders.length < BASELINE');
  });
});

describe('the four anonymous marketing forms are envelope-complete', () => {
  // They already carried `success`; only `timestamp` was missing, so this
  // conversion adds one key and moves nothing. That is the shape every
  // conversion in this backlog should take until the data-nesting release.
  const FORMS = [
    'capture-lead',
    'handle-demo-request',
    'handle-sales-contact',
    'track-referral',
  ] as const;

  it.each(FORMS)('%s stamps every response it returns', (name) => {
    const src = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8')
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^[ \t]*\/\/.*$/gm, '');

    const responses = [...src.matchAll(/new\s+Response\s*\(\s*JSON\.stringify\s*\(\s*\{/g)];
    expect(responses.length, `${name} returns no JSON at all?`).toBeGreaterThan(0);

    const timestamps = [...src.matchAll(/timestamp: new Date\(\)\.toISOString\(\)/g)];
    expect(timestamps.length, `${name} has ${responses.length} responses but ${timestamps.length} timestamps`)
      .toBeGreaterThanOrEqual(responses.length);
  });

  it.each(FORMS)('%s did not move any existing key under data', (name) => {
    // The conversion is additive. A `data:` wrapper here would mean the
    // top-level keys the web app reads had been removed.
    const src = readFileSync(`supabase/functions/${name}/index.ts`, 'utf8');
    expect(src).not.toMatch(/JSON\.stringify\(\{\s*data:/);
  });
});
