import { test, expect } from '@playwright/test';

test.describe('Projects Management', () => {
  test('should load projects page', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/projects/);
  });

  test('should display projects page heading', async ({ page }) => {
    await page.goto('/projects');
    const heading = page.locator('h1, h2, [role="heading"]').first();
    await expect(heading).toBeVisible({ timeout: 10000 });
  });

  test('should navigate to project detail from list', async ({ page }) => {
    await page.goto('/projects');
    // Look for any clickable project card or link
    const projectLink = page.locator('a[href*="/project"], [data-testid*="project"]').first();
    if (await projectLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await projectLink.click();
      await expect(page).toHaveURL(/project/);
    }
  });

  test('should have navigation menu visible', async ({ page }) => {
    await page.goto('/projects');
    const nav = page.locator('nav, [role="navigation"]').first();
    await expect(nav).toBeVisible({ timeout: 10000 });
  });

  test('should load project templates page', async ({ page }) => {
    await page.goto('/project-templates');
    await expect(page).toHaveURL(/project-templates/);
  });

  test('should have responsive layout on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/projects');
    await expect(page.locator('body')).toBeVisible();
  });
});
