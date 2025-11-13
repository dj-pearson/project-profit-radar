import { test, expect } from '@playwright/test';

test.describe('Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to dashboard (will redirect to auth if not logged in)
    await page.goto('/dashboard');
  });

  test('should redirect to auth when not logged in', async ({ page }) => {
    // Should be redirected to auth page
    await page.waitForURL('**/auth', { timeout: 5000 });
    await expect(page).toHaveURL(/\/auth/);
  });

  test.skip('should display dashboard for authenticated user', async ({ page }) => {
    // This test requires authentication
    // Skip for now, would need test credentials

    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test.skip('should display key metrics and widgets', async ({ page }) => {
    // Check for common dashboard elements
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for dashboard widgets/cards
    // These selectors would need to match your actual dashboard
    const dashboardContent = page.locator('main, [role="main"]');
    await expect(dashboardContent).toBeVisible();
  });

  test.skip('should navigate to projects from dashboard', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Find and click projects link
    const projectsLink = page.getByRole('link', { name: /projects/i });
    await projectsLink.click();

    // Wait for navigation
    await page.waitForURL('**/projects', { timeout: 5000 });
    await expect(page).toHaveURL(/\/projects/);
  });

  test.skip('should have working sidebar navigation', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Check that sidebar is present
    const sidebar = page.locator('nav, aside').first();
    await expect(sidebar).toBeVisible();

    // Check for common nav links
    await expect(sidebar.getByRole('link', { name: /dashboard/i })).toBeVisible();
    await expect(sidebar.getByRole('link', { name: /projects/i })).toBeVisible();
  });

  test.skip('should display user profile information', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);

    // Look for user menu or profile section
    const userMenu = page.getByRole('button', { name: /profile/i }).or(
      page.locator('[data-testid="user-menu"]')
    );

    if (await userMenu.isVisible()) {
      await userMenu.click();

      // Check for user-related options
      await expect(
        page.getByRole('menuitem', { name: /settings/i }).or(
          page.getByRole('menuitem', { name: /profile/i })
        )
      ).toBeVisible();
    }
  });

  test.skip('should be responsive on mobile', async ({ page, viewport }) => {
    if (viewport && viewport.width < 768) {
      await expect(page).toHaveURL(/\/dashboard/);

      // Mobile dashboard should show mobile nav
      const mobileMenu = page.getByRole('button', { name: /menu/i });
      if (await mobileMenu.isVisible()) {
        await mobileMenu.click();

        // Nav should appear
        await expect(page.getByRole('navigation')).toBeVisible();
      }
    }
  });

  test.skip('should load dashboard without errors', async ({ page }) => {
    const errors: string[] = [];

    // Listen for console errors
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Listen for page errors
    page.on('pageerror', (error) => {
      errors.push(error.message);
    });

    await page.goto('/dashboard');
    await page.waitForLoadState('networkidle');

    // Filter out known non-critical errors
    const criticalErrors = errors.filter(
      (error) =>
        !error.includes('ResizeObserver') &&
        !error.includes('Extension') &&
        !error.includes('chrome-extension')
    );

    expect(criticalErrors).toHaveLength(0);
  });

  test.skip('should have good performance metrics', async ({ page }) => {
    await page.goto('/dashboard');

    // Wait for page to be fully loaded
    await page.waitForLoadState('networkidle');

    // Get performance metrics
    const performanceMetrics = await page.evaluate(() => {
      const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
      return {
        domContentLoaded: navigation.domContentLoadedEventEnd - navigation.domContentLoadedEventStart,
        loadComplete: navigation.loadEventEnd - navigation.loadEventStart,
        domInteractive: navigation.domInteractive - navigation.fetchStart,
      };
    });

    // Assert reasonable load times
    expect(performanceMetrics.domInteractive).toBeLessThan(3000); // DOM interactive < 3s
    expect(performanceMetrics.loadComplete).toBeLessThan(5000); // Full load < 5s
  });
});

test.describe('Dashboard - Accessibility', () => {
  test.skip('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/dashboard');

    // Check that there's a main heading
    const h1 = page.locator('h1').first();
    await expect(h1).toBeVisible();

    // Check for proper heading levels
    const headings = await page.locator('h1, h2, h3, h4, h5, h6').all();
    expect(headings.length).toBeGreaterThan(0);
  });

  test.skip('should be keyboard navigable', async ({ page }) => {
    await page.goto('/dashboard');

    // Start tabbing through the page
    await page.keyboard.press('Tab');

    // Check that focus is visible
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });

  test.skip('should have alt text on images', async ({ page }) => {
    await page.goto('/dashboard');

    // Get all images
    const images = await page.locator('img').all();

    for (const img of images) {
      const alt = await img.getAttribute('alt');
      // Alt can be empty string for decorative images, but should exist
      expect(alt).not.toBeNull();
    }
  });
});
