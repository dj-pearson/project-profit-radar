import { test, expect } from '@playwright/test';
import { expectSignInWall, requireTestCredentials, signInAndVisit } from './fixtures/auth';

// Same shape as financial.spec.ts; see the note there for why. The old
// "/project-templates" test is gone: there is no such route, so it passed by
// asserting the URL of the 404 page.

test.describe('Projects Management - signed out', () => {
  test('/projects sends a signed-out visitor to sign in', async ({ page }) => {
    await expectSignInWall(page, '/projects');
  });

  test('the sign-in wall is usable at phone width', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await expectSignInWall(page, '/projects');
  });
});

test.describe('Projects Management - signed in', () => {
  test.beforeEach(() => {
    requireTestCredentials();
  });

  test('/projects renders with navigation', async ({ page }) => {
    await signInAndVisit(page, '/projects');
    await expect(page).toHaveURL(/\/projects$/);
    await expect(page.getByRole('heading').first()).toBeVisible({ timeout: 10_000 });
    await expect(page.getByRole('navigation').first()).toBeVisible();
  });

  test('opens a project from the list when one exists', async ({ page }) => {
    await signInAndVisit(page, '/projects');
    const projectLink = page.locator('a[href^="/projects/"]').first();
    test.skip((await projectLink.count()) === 0, 'The test account has no projects to open.');
    await projectLink.click();
    await expect(page).toHaveURL(/\/projects\/[^/]+/);
  });
});
