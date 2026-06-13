import { describe, it, expect } from 'vitest';
import { queryClient } from '../queryClient';

/**
 * Tests for the QueryClient retry/backoff policy (US-211).
 * We read the configured defaults off the client so we exercise the exact
 * functions the app ships with.
 */
describe('queryClient retry policy', () => {
  const queryDefaults = queryClient.getDefaultOptions().queries!;
  const mutationDefaults = queryClient.getDefaultOptions().mutations!;

  const callRetry = (
    retry: unknown,
    failureCount: number,
    error: unknown
  ): boolean => (retry as (n: number, e: unknown) => boolean)(failureCount, error);

  const callDelay = (delay: unknown, attempt: number): number =>
    (delay as (n: number) => number)(attempt);

  it('retries transient query failures up to 2 times', () => {
    const retry = queryDefaults.retry;
    expect(callRetry(retry, 0, new Error('flaky'))).toBe(true);
    expect(callRetry(retry, 1, new Error('flaky'))).toBe(true);
    expect(callRetry(retry, 2, new Error('flaky'))).toBe(false);
  });

  it('never retries auth/client errors (401/403/404/422)', () => {
    const retry = queryDefaults.retry;
    for (const status of [401, 403, 404, 422]) {
      expect(callRetry(retry, 0, { status })).toBe(false);
    }
  });

  it('still retries server errors (500)', () => {
    const retry = queryDefaults.retry;
    expect(callRetry(retry, 0, { status: 500 })).toBe(true);
  });

  it('retries mutations at most once and skips non-retryable errors', () => {
    const retry = mutationDefaults.retry;
    expect(callRetry(retry, 0, new Error('flaky'))).toBe(true);
    expect(callRetry(retry, 1, new Error('flaky'))).toBe(false);
    expect(callRetry(retry, 0, { status: 403 })).toBe(false);
  });

  it('uses capped exponential backoff with jitter', () => {
    const delay = queryDefaults.retryDelay;
    // attempt 0 -> ~1s, attempt 1 -> ~2s, attempt 2 -> ~4s (plus <=1s jitter)
    expect(callDelay(delay, 0)).toBeGreaterThanOrEqual(1000);
    expect(callDelay(delay, 0)).toBeLessThanOrEqual(2000);
    expect(callDelay(delay, 1)).toBeGreaterThanOrEqual(2000);
    expect(callDelay(delay, 1)).toBeLessThanOrEqual(3000);
    // Large attempt index is capped at 30s base (+ jitter).
    expect(callDelay(delay, 20)).toBeLessThanOrEqual(31_000);
    expect(callDelay(delay, 20)).toBeGreaterThanOrEqual(30_000);
  });
});
