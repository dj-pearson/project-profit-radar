/**
 * How long a profile fetch may take before it is given up on, and how long
 * RouteGuard waits for a profile before redirecting to /auth (US-356).
 *
 * They were 10 s and 4 s. So on a slow first load RouteGuard gave up while the
 * fetch was still inside its own timeout, bounced to /auth, came back, and did
 * it again until the redirect-loop breaker showed "Recovery Mode". One
 * constant, so the guard never gives up on a fetch that is still allowed to
 * succeed.
 */
export const PROFILE_FETCH_TIMEOUT_MS = 8000;
