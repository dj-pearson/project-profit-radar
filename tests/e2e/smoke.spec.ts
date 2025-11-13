import { test, expect } from '@playwright/test';

/**
 * Smoke tests - Quick tests to verify critical paths work
 * These should be fast and catch major breakages
 */
test.describe('Smoke Tests', () => {
  test('homepage should load successfully', async ({ page }) => {
    await page.goto('/');

    // Check that page loaded
    await expect(page).toHaveTitle(/BuildDesk/i);

    // Page should not have crashed
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('auth page should load successfully', async ({ page }) => {
    await page.goto('/auth');

    // Check page loaded
    await expect(page).toHaveURL(/\/auth/);

    // Check for auth form
    await expect(page.getByLabel(/email/i)).toBeVisible();
  });

  test('should handle 404 pages gracefully', async ({ page }) => {
    const response = await page.goto('/this-page-does-not-exist-12345');

    // Either get a 404 response or redirect to home
    if (response) {
      expect([200, 404]).toContain(response.status());
    }

    // Page should still render something
    const bodyText = await page.textContent('body');
    expect(bodyText).toBeTruthy();
  });

  test('should not have console errors on homepage', async ({ page }) => {
    const errors: string[] = [];

    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('ResizeObserver') &&
        !error.includes('Extension') &&
        !error.includes('chrome-extension') &&
        !error.includes('favicon')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test('assets should load (CSS, JS)', async ({ page }) => {
    await page.goto('/');

    // Wait for all resources to load
    await page.waitForLoadState('networkidle');

    // Check that the page has styles applied
    const body = page.locator('body');
    const backgroundColor = await body.evaluate((el) => {
      return window.getComputedStyle(el).backgroundColor;
    });

    // Should have some background color set (not transparent)
    expect(backgroundColor).not.toBe('rgba(0, 0, 0, 0)');
  });

  test('API endpoints should be reachable', async ({ page, request }) => {
    // Navigate to page first to establish context
    await page.goto('/');

    // Try to fetch from Supabase (should at least get a response)
    try {
      const response = await request.get('https://ilhzuvemiuyfuxfegtlv.supabase.co/rest/v1/', {
        headers: {
          'apikey': 'test', // This will fail auth but proves endpoint is up
        },
      });

      // We expect auth failure (401) or success, not 500 or timeout
      expect([200, 401, 403]).toContain(response.status());
    } catch (error) {
      // If network error, that's a problem
      throw error;
    }
  });

  test('navigation between pages should work', async ({ page }) => {
    await page.goto('/');

    // Try to navigate to features page if it exists
    const featuresLink = page.getByRole('link', { name: /features/i }).first();

    if (await featuresLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await featuresLink.click();
      await page.waitForLoadState('networkidle');

      // Should have navigated
      expect(page.url()).not.toBe('/');
    }
  });

  test('responsive design should work on mobile', async ({ page, viewport }) => {
    await page.goto('/');

    if (viewport && viewport.width < 768) {
      // Check that mobile menu exists or navigation is adapted
      const mobileNav =
        (await page.getByRole('button', { name: /menu/i }).isVisible().catch(() => false)) ||
        (await page.locator('nav').isVisible().catch(() => false));

      expect(mobileNav).toBeTruthy();
    }
  });

  test('page should be interactive quickly (TTI)', async ({ page }) => {
    const startTime = Date.now();

    await page.goto('/');

    // Wait for page to be interactive
    await page.waitForLoadState('domcontentloaded');

    const loadTime = Date.now() - startTime;

    // DOM should be ready within 3 seconds
    expect(loadTime).toBeLessThan(3000);
  });

  test('images should load with proper attributes', async ({ page }) => {
    await page.goto('/');

    // Get all images
    const images = await page.locator('img').all();

    if (images.length > 0) {
      for (const img of images.slice(0, 5)) {
        // Check first 5 images
        const src = await img.getAttribute('src');
        const alt = await img.getAttribute('alt');

        // Images should have src
        expect(src).toBeTruthy();

        // Alt attribute should exist (can be empty for decorative)
        expect(alt).not.toBeNull();
      }
    }
  });

  test('should have proper meta tags', async ({ page }) => {
    await page.goto('/');

    // Check for basic meta tags
    const title = await page.title();
    expect(title).toBeTruthy();
    expect(title.length).toBeGreaterThan(0);

    // Check for viewport meta tag (important for mobile)
    const viewportMeta = await page.locator('meta[name="viewport"]').getAttribute('content');
    expect(viewportMeta).toContain('width=device-width');
  });

  test('fonts should load', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('networkidle');

    // Check that fonts are applied
    const body = page.locator('body');
    const fontFamily = await body.evaluate((el) => {
      return window.getComputedStyle(el).fontFamily;
    });

    expect(fontFamily).toBeTruthy();
    expect(fontFamily).not.toBe('');
  });
});
