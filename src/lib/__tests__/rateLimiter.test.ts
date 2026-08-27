import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * This file used to re-implement the whole of _shared/rate-limiter.ts and test
 * the copy, handing it a mock pre-seeded with rows. Twenty-odd cases passed
 * while the real limiter had never blocked a single request: it counted rows in
 * rate_limit_violations to decide `allowed` and wrote one only when the request
 * was already over the limit, so from an empty table the count stayed at 0
 * forever. The tests proved the arithmetic and never asked how a row got into
 * the table (US-307).
 *
 * The real cases now live in supabase/functions/_shared/rate-limiter.test.ts,
 * which imports the module. What is left here is the guard against the copy
 * coming back, because a test that reconstructs its subject tests the
 * reconstruction.
 */
describe('the rate limiter is tested against itself, not a copy', () => {
  const REAL_TEST = 'supabase/functions/_shared/rate-limiter.test.ts';

  it('the real module has a test that imports it', () => {
    const src = readFileSync(REAL_TEST, 'utf8');
    expect(src).toContain("from './rate-limiter.ts'");
    expect(src).toContain('checkRateLimit');
  });

  it('that test drives requests from an empty store rather than seeded rows', () => {
    const src = readFileSync(REAL_TEST, 'utf8');
    // The distinguishing case: N requests through the real module, N - limit
    // of them refused. A pre-seeded mock cannot demonstrate this.
    expect(src).toContain('blocks the 47 requests beyond a limit of 3');
  });

  it('this file does not re-implement checkRateLimit', () => {
    const self = readFileSync('src/lib/__tests__/rateLimiter.test.ts', 'utf8');
    expect(self).not.toMatch(/(?:async )?function checkRateLimit\s*\(/);
  });
});
