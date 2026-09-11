import { test } from '@playwright/test';

/**
 * CI serves the E2E suite from `vite dev` (ci.yml's `npm run dev:ci`), not from
 * the production build. That is fine for behaviour, and useless for timing: the
 * dev server compiles modules on demand, so a first navigation measures the
 * bundler rather than the product. Measured here, DOMContentLoaded on the
 * homepage takes ~13s against `vite dev` and would be a small fraction of that
 * against `dist/`.
 *
 * These assertions are kept rather than deleted because the thresholds are the
 * right ones - they just need a real build under them. US-409 covers serving
 * the build artifact the `build` job already uploads.
 */
export const SERVING_DEV_BUILD = !process.env.PLAYWRIGHT_BASE_URL;

export const WHY_TIMING_SKIPPED =
  'Timing assertion needs the production build. CI serves vite dev, which ' +
  'compiles on demand, so this would measure the bundler (US-409). Set ' +
  'PLAYWRIGHT_BASE_URL to a served dist/ to run it.';

export function skipUnlessBuiltApp() {
  test.skip(SERVING_DEV_BUILD, WHY_TIMING_SKIPPED);
}

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
