import { test, type Page } from '@playwright/test';

/**
 * Which app the suite is pointed at. `E2E_SERVE=build` makes playwright.config
 * serve dist/ with `vite preview`; PLAYWRIGHT_BASE_URL points at something
 * already running, which is assumed to be a build. Anything else is `vite dev`.
 *
 * Timing assertions only mean something against a build: the dev server
 * compiles modules on demand, so a first navigation measured ~13s for
 * DOMContentLoaded against a 3000ms threshold - the bundler, not the product.
 * CI serves the build (ci.yml), so these run there; a local `vite dev` run
 * skips them and says so.
 */
export const SERVING_BUILT_APP =
  process.env.E2E_SERVE === 'build' || Boolean(process.env.PLAYWRIGHT_BASE_URL);

export const WHY_TIMING_SKIPPED =
  'Timing assertion needs the production build, and this run is serving vite ' +
  'dev, which compiles on demand. Run with E2E_SERVE=build (after npm run ' +
  'build) or PLAYWRIGHT_BASE_URL pointing at a served dist/.';

export function skipUnlessBuiltApp(reason: string = WHY_TIMING_SKIPPED) {
  test.skip(!SERVING_BUILT_APP, reason);
}

/**
 * main.tsx wraps the app in StrictMode in dev only. React 19's StrictMode
 * simulates an unmount/remount of every component on mount, and
 * react-helmet-async 2.0.5 registers each <Helmet> during render and forgets it
 * on unmount, so under vite dev the head can settle on a stale renderer's tags.
 * Measured: 8/8 homepage loads settle on the page's own title against the
 * build and with StrictMode off, about half against vite dev.
 */
export const WHY_HEAD_OWNER_SKIPPED =
  'Which renderer owns the settled head is only meaningful on the production ' +
  'build: vite dev runs StrictMode, whose simulated remount breaks ' +
  "react-helmet-async's instance tracking. Run with E2E_SERVE=build.";

/**
 * CI points the app at a placeholder Supabase URL so a pull request can never
 * reach production (ci.yml). Nothing answers there, so every data call fails and
 * the app logs it - which is the app behaving correctly, not a defect.
 *
 * An uncaught exception is a different thing and is never filtered: those come
 * through page.on('pageerror') and stay assertable. This filter only drops
 * console noise that is downstream of there being no backend.
 */
const NO_BACKEND = [
  'net::ERR_CONNECTION_REFUSED',
  'net::ERR_NAME_NOT_RESOLVED',
  'net::ERR_CONNECTION_TIMED_OUT',
  'Failed to load resource',
  'Failed to fetch',
  'TypeError: Load failed',
];

const ENVIRONMENTAL = [
  'ResizeObserver',
  'Extension',
  'chrome-extension',
  'favicon',
];

export function isCriticalConsoleError(text: string): boolean {
  return ![...ENVIRONMENTAL, ...NO_BACKEND].some((noise) => text.includes(noise));
}

/**
 * Answer the cookie banner before the page loads, as a returning visitor who
 * rejected optional cookies would have. At phone width the banner covers the
 * lower half of /auth, so clicks on "Sign in" or "Create one" landed on it.
 * Specs that are about the banner, or that scan what a first-time visitor sees
 * (accessibility.spec.ts), should not call this.
 */
export async function answerCookieBanner(page: Page): Promise<void> {
  await page.addInitScript(() => {
    try {
      window.localStorage.setItem(
        'brikly_cookie_consent_v1',
        JSON.stringify({
          v: 1,
          state: { essential: true, analytics: false, marketing: false, preferences: false },
          recordedAt: new Date().toISOString(),
          method: 'reject-all',
          gpc: false,
        }),
      );
    } catch {
      /* storage blocked: the banner shows and the spec will say so */
    }
  });
}
