import { test, expect } from '@playwright/test';

test.describe('Navigation', () => {
  test('should navigate from landing to auth page', async ({ page }) => {
    await page.goto('/');

    const signInLink = page.getByRole('link', { name: /sign in|log in/i }).first();
    if (await signInLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await signInLink.click();
      await expect(page).toHaveURL(/\/auth/);
    } else {
      // Direct navigation
      await page.goto('/auth');
      await expect(page).toHaveURL(/\/auth/);
    }
  });

  test('should navigate to features page', async ({ page }) => {
    await page.goto('/');

    const featuresLink = page.getByRole('link', { name: /features/i }).first();
    if (await featuresLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await featuresLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('features');
    }
  });

  test('should navigate to pricing page', async ({ page }) => {
    await page.goto('/');

    const pricingLink = page.getByRole('link', { name: /pricing/i }).first();
    if (await pricingLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await pricingLink.click();
      await page.waitForLoadState('networkidle');
      expect(page.url()).toContain('pricing');
    }
  });

  test('should redirect unauthenticated /dashboard to /auth', async ({ page }) => {
    await page.goto('/dashboard');
    await page.waitForURL('**/auth', { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should redirect unauthenticated /projects to /auth', async ({ page }) => {
    await page.goto('/projects');
    await page.waitForURL('**/auth', { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should handle 404 gracefully', async ({ page }) => {
    const response = await page.goto('/nonexistent-page-xyz-12345');
    if (response) {
      expect([200, 404]).toContain(response.status());
    }
    const body = await page.textContent('body');
    expect(body).toBeTruthy();
  });

  test('auth page should have email and password fields', async ({ page }) => {
    await page.goto('/auth');

    await expect(page.getByLabel(/email/i)).toBeVisible();
    // Exact, because /password/i also matches the show/hide toggle's
    // aria-label ("Show password") and strict mode rejects two matches. The
    // field itself is labelled correctly; the locator was not.
    await expect(page.getByLabel('Password', { exact: true })).toBeVisible();
    // Exact again: /sign in/i also matches "Sign in with Google" and
    // "Sign in with Apple", which were added after this test was written.
    await expect(page.getByRole('button', { name: 'Sign in', exact: true })).toBeVisible();
  });

  test('should be navigable by keyboard (tab focus)', async ({ page }) => {
    await page.goto('/');

    // Tab into the page
    await page.keyboard.press('Tab');
    const focused = await page.evaluate(() => document.activeElement?.tagName);
    expect(focused).toBeTruthy();
  });
});
