import { test, expect } from '@playwright/test';
import { expectSignInWall, requireTestCredentials, signInAndVisit } from './fixtures/auth';

// Same shape as financial.spec.ts; see the note there for why.
const PATHS = ['/time-tracking', '/daily-reports', '/timesheets'];

test.describe('Time Tracking & Reports - signed out', () => {
  for (const path of PATHS) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await expectSignInWall(page, path);
    });
  }
});

test.describe('Time Tracking & Reports - signed in', () => {
  test.beforeEach(() => {
    requireTestCredentials();
  });

  for (const path of PATHS) {
    test(`${path} renders for a signed-in user`, async ({ page }) => {
      await signInAndVisit(page, path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});
