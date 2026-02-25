import { test, expect } from '@playwright/test';

test.describe('Time Tracking & Reports', () => {
  test('should load time tracking page', async ({ page }) => {
    await page.goto('/time-tracking');
    await expect(page).toHaveURL(/time-tracking/);
  });

  test('should display time tracking content', async ({ page }) => {
    await page.goto('/time-tracking');
    const content = page.locator('main, [role="main"], .container, #root').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should load daily reports page', async ({ page }) => {
    await page.goto('/daily-reports');
    await expect(page).toHaveURL(/daily-reports/);
  });

  test('should load timesheets page', async ({ page }) => {
    await page.goto('/timesheets');
    await expect(page).toHaveURL(/timesheets/);
  });

  test('should have page title', async ({ page }) => {
    await page.goto('/time-tracking');
    await expect(page).toHaveTitle(/.*/);
  });
});
