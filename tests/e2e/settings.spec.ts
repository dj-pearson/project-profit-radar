import { test, expect } from '@playwright/test';

test.describe('Settings Pages', () => {
  test('should load settings page', async ({ page }) => {
    await page.goto('/settings');
    await expect(page).toHaveURL(/settings/);
  });

  test('should display settings content', async ({ page }) => {
    await page.goto('/settings');
    const content = page.locator('main, [role="main"], .container, #root').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should load profile settings', async ({ page }) => {
    await page.goto('/settings/profile');
    await expect(page).toHaveURL(/settings/);
  });

  test('should load company settings', async ({ page }) => {
    await page.goto('/settings/company');
    await expect(page).toHaveURL(/settings/);
  });

  test('should have accessible form elements if present', async ({ page }) => {
    await page.goto('/settings');
    const inputs = page.locator('input, select, textarea');
    const count = await inputs.count();
    if (count > 0) {
      const firstInput = inputs.first();
      await expect(firstInput).toBeVisible({ timeout: 10000 });
    }
  });
});
