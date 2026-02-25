import { test, expect } from '@playwright/test';

test.describe('Financial Management', () => {
  test('should load financial overview page', async ({ page }) => {
    await page.goto('/financial');
    await expect(page).toHaveURL(/financial/);
  });

  test('should display financial page content', async ({ page }) => {
    await page.goto('/financial');
    const content = page.locator('main, [role="main"], .container, #root').first();
    await expect(content).toBeVisible({ timeout: 10000 });
  });

  test('should load estimates page', async ({ page }) => {
    await page.goto('/estimates');
    await expect(page).toHaveURL(/estimates/);
  });

  test('should load invoices page', async ({ page }) => {
    await page.goto('/invoices');
    await expect(page).toHaveURL(/invoices/);
  });

  test('should load expenses page', async ({ page }) => {
    await page.goto('/expenses');
    await expect(page).toHaveURL(/expenses/);
  });

  test('should render financial dashboard elements', async ({ page }) => {
    await page.goto('/financial');
    // Check for cards or summary sections
    const cards = page.locator('[class*="card"], [class*="Card"]');
    await expect(cards.first()).toBeVisible({ timeout: 10000 });
  });
});
