import { defineConfig } from '@playwright/test';

/**
 * Playwright config for app store screenshot capture.
 * Used by: npm run mobile:screenshots
 */
export default defineConfig({
  testDir: './scripts/mobile',
  testMatch: 'capture-screenshots.ts',

  fullyParallel: false,
  retries: 0,
  workers: 1,

  reporter: [['list']],

  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:8080',
    trace: 'off',
    screenshot: 'off',
    video: 'off',
    actionTimeout: 15000,
  },

  /* Single Chromium project — screenshots don't need cross-browser */
  projects: [
    {
      name: 'screenshots',
      use: {
        browserName: 'chromium',
      },
    },
  ],

  webServer: {
    command: 'npm run dev',
    url: 'http://localhost:8080',
    reuseExistingServer: true,
    timeout: 120000,
  },

  timeout: 60000,
});
