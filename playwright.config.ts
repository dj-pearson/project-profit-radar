import { defineConfig, devices } from '@playwright/test';

/**
 * Read environment variables from file.
 * https://github.com/motdotla/dotenv
 */
// require('dotenv').config();

/**
 * Local escape hatch for a machine whose preinstalled Chromium does not match
 * the revision this Playwright version expects. CI runs
 * `npx playwright install chromium` and never sets this.
 */
const LOCAL_CHROMIUM = process.env.PW_CHROMIUM_EXECUTABLE
  ? { launchOptions: { executablePath: process.env.PW_CHROMIUM_EXECUTABLE } }
  : {};

/**
 * See https://playwright.dev/docs/test-configuration.
 */
export default defineConfig({
  testDir: './tests/e2e',

  /* Run tests in files in parallel */
  fullyParallel: true,

  /* Fail the build on CI if you accidentally left test.only in the source code. */
  forbidOnly: !!process.env.CI,

  /* Retry on CI only */
  retries: process.env.CI ? 2 : 0,

  /* Opt out of parallel tests on CI. */
  workers: process.env.CI ? 1 : undefined,

  /* Reporter to use. See https://playwright.dev/docs/test-reporters */
  reporter: process.env.CI
    ? [
        ['html', { outputFolder: 'playwright-report' }],
        ['junit', { outputFile: 'test-results/junit.xml' }],
        ['github'],
      ]
    : [['html', { open: 'never' }], ['list']],

  /* Shared settings for all the projects below. See https://playwright.dev/docs/api/class-testoptions. */
  use: {
    /* Base URL to use in actions like `await page.goto('/')`. */
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',

    /* Collect trace when retrying the failed test. See https://playwright.dev/docs/trace-viewer */
    trace: 'on-first-retry',

    /* Screenshot on failure */
    screenshot: 'only-on-failure',

    /* Video on failure */
    video: 'retain-on-failure',

    /* Timeout for each action */
    actionTimeout: 15000,
  },

  /* Configure projects for major browsers */
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...LOCAL_CHROMIUM },
    },

    {
      name: 'firefox',
      use: { ...devices['Desktop Firefox'] },
    },

    {
      name: 'webkit',
      use: { ...devices['Desktop Safari'] },
    },

    /* Test against mobile viewports. */
    {
      name: 'Mobile Chrome',
      use: { ...devices['Pixel 5'], ...LOCAL_CHROMIUM },
    },
    {
      name: 'Mobile Safari',
      use: { ...devices['iPhone 12'] },
    },

    /* Test against branded browsers. */
    // {
    //   name: 'Microsoft Edge',
    //   use: { ...devices['Desktop Edge'], channel: 'msedge' },
    // },
    // {
    //   name: 'Google Chrome',
    //   use: { ...devices['Desktop Chrome'], channel: 'chrome' },
    // },
  ],

  /* Refuses a production Supabase target before any server starts (US-409). */
  globalSetup: './tests/e2e/global-setup.ts',

  /*
   * What gets served (US-409):
   *   PLAYWRIGHT_BASE_URL set  -> nothing; test that URL.
   *   E2E_SERVE=build          -> `vite preview` of an existing dist/. CI does
   *                               this, so behaviour and timing are measured on
   *                               what ships (minified, chunked, service worker,
   *                               env guard), not on the dev server.
   *   otherwise                -> the dev server, as before.
   * E2E_HOST overrides the bind address for machines without IPv6, where
   * vite.config's "::" fails with EAFNOSUPPORT.
   */
  webServer: process.env.PLAYWRIGHT_BASE_URL
    ? undefined
    : {
        command:
          process.env.E2E_SERVE === 'build'
            ? `npx vite preview --port 8080 --strictPort${process.env.E2E_HOST ? ` --host ${process.env.E2E_HOST}` : ''}`
            : process.env.CI
              ? 'npm run dev:ci'
              : 'npm run dev',
        url: 'http://localhost:8080',
        reuseExistingServer: !process.env.CI,
        timeout: 120000,
      },

  /* Global timeout for each test */
  timeout: 30000,

  /* Expect timeout */
  expect: {
    timeout: 5000,
  },
});
