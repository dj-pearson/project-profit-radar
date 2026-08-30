import { test, type Page, expect } from '@playwright/test';

/**
 * The authenticated-flow path for E2E (US-214 AC2).
 *
 * Fourteen specs covering sign-in, session persistence, sign-out and the whole
 * dashboard were written as `test.skip('name', fn)`. That form is invisible: it
 * never runs, it reports as a bare skip with no reason, and nothing tells you
 * what would make it run. Six of them were the highest-value flows in the
 * product, so the suite read as green while validating none of them.
 *
 * They now use `requireTestCredentials()`, which skips with a reason naming the
 * two variables to set. Same outcome where nothing is configured, but the skip
 * is legible and the tests actually execute wherever credentials exist - CI,
 * a developer's machine, a future staging project.
 *
 * WHAT THIS DELIBERATELY IS NOT: a forged session. Seeding localStorage with a
 * fake Supabase token would make the UI render for an unauthenticated user, and
 * every request it then made would still be rejected server-side - so the tests
 * would exercise a state no real user is ever in, and pass while proving
 * nothing. AC2 asks for "no flakiness from real PROD auth", which is a reason
 * to point these at a test project, not a reason to fake the session. That
 * project is US-247.
 */

export const TEST_EMAIL = process.env.TEST_USER_EMAIL;
export const TEST_PASSWORD = process.env.TEST_USER_PASSWORD;

export const hasTestCredentials = Boolean(TEST_EMAIL && TEST_PASSWORD);

const WHY_SKIPPED =
  'Needs TEST_USER_EMAIL and TEST_USER_PASSWORD for an account on the target ' +
  'environment. Unset here, so the authenticated flows cannot run. See US-214 / US-247.';

/** Call first in any spec that needs a signed-in user. */
export function requireTestCredentials(): void {
  test.skip(!hasTestCredentials, WHY_SKIPPED);
}

/**
 * Sign in through the real form rather than the API, because the form is part
 * of what these tests are for - a broken label or button breaks sign-in, and a
 * programmatic session would hide that.
 */
export async function signIn(page: Page): Promise<void> {
  if (!hasTestCredentials) {
    throw new Error('signIn() called without credentials; call requireTestCredentials() first.');
  }

  await page.goto('/auth');
  await page.getByLabel(/email/i).fill(TEST_EMAIL!);
  await page.getByLabel(/password/i).fill(TEST_PASSWORD!);
  await page.getByRole('button', { name: /sign in/i }).click();
  await page.waitForURL('**/dashboard', { timeout: 15_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

/** Sign in once and land on `path`. */
export async function signInAndVisit(page: Page, path: string): Promise<void> {
  await signIn(page);
  if (path !== '/dashboard') {
    await page.goto(path);
  }
}
