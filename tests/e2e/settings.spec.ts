import { test, expect } from '@playwright/test';
import { expectSignInWall, requireTestCredentials, signInAndVisit } from './fixtures/auth';

// This file used to visit /settings, /settings/profile and /settings/company.
// None of those is a route, so every test passed by asserting the URL of the
// 404 page. The real settings routes are below. Same shape as
// financial.spec.ts otherwise.
const PATHS = ['/user-settings', '/profile', '/company-settings'];

test.describe('Settings - signed out', () => {
  for (const path of PATHS) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await expectSignInWall(page, path);
    });
  }
});

test.describe('Settings - signed in', () => {
  test.beforeEach(() => {
    requireTestCredentials();
  });

  for (const path of PATHS) {
    test(`${path} renders a form for a signed-in user`, async ({ page }) => {
      await signInAndVisit(page, path);
      await expect(page).toHaveURL(new RegExp(`${path}$`));
      await expect(page.locator('input, select, textarea').first()).toBeVisible({ timeout: 10_000 });
    });
  }
});
