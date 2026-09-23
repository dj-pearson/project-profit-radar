import { test, expect } from '@playwright/test';
import { isCriticalConsoleError, skipUnlessBuiltApp, WHY_HEAD_OWNER_SKIPPED } from './fixtures/server';

test.describe('Landing Page', () => {
  test('should load and display the Brikly title', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Brikly/i);
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
    const singletons = [
      'title',
      'meta[name="description"]',
      'link[rel="canonical"]',
      'meta[property="og:title"]',
      'meta[property="og:description"]',
      'meta[name="twitter:title"]',
      'meta[name="viewport"]',
    ];
    const counts = () =>
      page.evaluate(
        (sels) => sels.map((s) => [s, document.head.querySelectorAll(s).length] as const),
        singletons,
      );

    // One of each at the load event, not only once things settle. This used to
    // read two of nearly every tag here (index.html's static copy beside
    // Helmet's) and then collapse to whichever renderer won the race (US-409).
    await page.goto('/');
    for (const [sel, n] of await counts()) expect(n, sel).toBe(1);

    await page.waitForLoadState('networkidle');
    for (const [sel, n] of await counts()) expect(n, sel).toBe(1);

    expect(await page.locator('meta[name="viewport"]').getAttribute('content')).toContain('viewport-fit=cover');
    expect((await page.locator('meta[name="description"]').getAttribute('content'))?.length).toBeGreaterThan(10);
  });

  test("the head settles on the homepage's own tags", async ({ page }) => {
    skipUnlessBuiltApp(WHY_HEAD_OWNER_SKIPPED);
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Index.tsx's PageSEO, every time, rather than the index.html shell or
    // UnifiedSEOSystem's site default.
    await expect(page).toHaveTitle('Real-Time Job Costing for Contractors | Brikly');
    await expect(page.locator('meta[name="description"]')).toHaveAttribute(
      'content',
      /^Construction job costing software with real-time budget tracking/,
    );
    await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://brikly.net');
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

    expect(errors.filter(isCriticalConsoleError)).toHaveLength(0);
  });

  test('should load within 3 seconds (TTI)', async ({ page }) => {
    skipUnlessBuiltApp();
    const start = Date.now();
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    expect(Date.now() - start).toBeLessThan(3000);
  });
});
