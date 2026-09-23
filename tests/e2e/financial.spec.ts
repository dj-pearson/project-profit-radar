import { test, expect } from '@playwright/test';
import { expectSignInWall, requireTestCredentials, signInAndVisit } from './fixtures/auth';

/**
 * These specs used to goto a guarded route as a stranger and assert the URL
 * still matched, with a second test checking `#root` was visible. Once the
 * route guard redirected promptly they failed; before that they passed while
 * rendering a spinner. What a signed-out visitor should see is the sign-in
 * wall, so that is asserted here, and the page itself is checked signed in.
 */
const PATHS = ['/financial', '/estimates', '/invoices', '/expenses'];

test.describe('Financial Management - signed out', () => {
  for (const path of PATHS) {
    test(`${path} sends a signed-out visitor to sign in`, async ({ page }) => {
      await expectSignInWall(page, path);
    });
  }
});

test.describe('Financial Management - signed in', () => {
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
