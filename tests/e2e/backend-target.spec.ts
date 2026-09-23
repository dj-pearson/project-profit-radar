import { test, expect } from '@playwright/test';
import { signInForm } from './fixtures/auth';
import { answerCookieBanner } from './fixtures/server';

/**
 * The served app never talks to the production API (US-409).
 *
 * global-setup.ts checks the env the suite was started with. This checks the
 * thing that matters, the bundle actually served: the Supabase URL is compiled
 * in at build time, and client.ts falls back to https://api.brikly.net when it
 * was missing then. A build made without the E2E env would pass global-setup
 * and still point at production; this catches it.
 *
 * Only the API surfaces count. index.html links a public logo from
 * api.brikly.net/storage, which is a static asset, not the database.
 */
const PRODUCTION_API = /^https:\/\/(api|functions)\.brikly\.net\/(rest|auth|functions|realtime|graphql)\/v1\b|^https:\/\/ilhzuvemiuyfuxfegtlv\.supabase\.co\/(rest|auth|functions|realtime)\//;

test('a visit and a sign-in attempt never reach the production API', async ({ page }) => {
  const hits: string[] = [];
  page.on('request', (req) => {
    if (PRODUCTION_API.test(req.url())) hits.push(`${req.method()} ${req.url()}`);
  });
  // Abort rather than let one through if the bundle is wrong.
  await page.route(PRODUCTION_API, (route) => route.abort());

  await answerCookieBanner(page);
  await page.goto('/');
  await page.waitForLoadState('networkidle');

  await page.goto('/auth');
  const { email, password, submit } = signInForm(page);
  await email.fill('e2e-target-check@example.com');
  await password.fill('not-a-real-password');
  await submit.click();
  // The first auth-related request goes out within a second of the click.
  await page.waitForTimeout(1500);

  expect(hits, `requests to the production API:\n${hits.join('\n')}`).toEqual([]);
});
