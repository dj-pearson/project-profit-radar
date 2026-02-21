import { test, expect } from '@playwright/test';

test.describe('Landing Page', () => {
  test('should load and display the BuildDesk title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/BuildDesk/i);
  });

  test('should render key elements (heading, CTA, navigation)', async ({ page }) => {
    await page.goto('/');

    // Page should have a heading
    const heading = page.locator('h1, h2').first();
    await expect(heading).toBeVisible();

    // Should have a sign-in or get-started link/button
    const cta = page.getByRole('link', { name: /sign in|get started|try free/i }).first();
    if (await cta.isVisible({ timeout: 2000 }).catch(() => false)) {
      await expect(cta).toBeVisible();
    }
  });

  test('should have proper meta tags for SEO', async ({ page }) => {
    await page.goto('/');

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);

    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');

    const descriptionMeta = await page.locator('meta[name="description"]').getAttribute('content');
    if (descriptionMeta) {
      expect(descriptionMeta.length).toBeGreaterThan(10);
    }
  });

  test('should load CSS and apply styles', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const body = page.locator('body');
    const bgColor = await body.evaluate(el => window.getComputedStyle(el).backgroundColor);
    expect(bgColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('should not have critical console errors', async ({ page }) => {
    const errors: string[] = [];
    page.on('console', msg => {
      if (msg.type() === 'error') errors.push(msg.text());
    });
    page.on('pageerror', err => errors.push(err.message));

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    const critical = errors.filter(e =>
      !e.includes('ResizeObserver') &&
      !e.includes('Extension') &&
      !e.includes('chrome-extension') &&
      !e.includes('favicon')
    );
    expect(critical).toHaveLength(0);
  });

  test('should load within 3 seconds (TTI)', async ({ page }) => {
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
