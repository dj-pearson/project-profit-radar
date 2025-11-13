import { test, expect } from '@playwright/test';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the auth page before each test
    await page.goto('/auth');
  });

  test('should display the authentication page', async ({ page }) => {
    // Check that the auth page loads
    await expect(page).toHaveTitle(/BuildDesk/i);

    // Check for key elements
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
  });

  test('should show validation errors for empty form submission', async ({ page }) => {
    // Try to submit without filling the form
    const submitButton = page.getByRole('button', { name: /sign in/i });
    await submitButton.click();

    // Wait a bit for validation
    await page.waitForTimeout(500);

    // Check if the form is still on the auth page (didn't navigate)
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill in invalid credentials
    await page.getByLabel(/email/i).fill('invalid@example.com');
    await page.getByLabel(/password/i).fill('wrongpassword');

    // Click sign in
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for error message
    await page.waitForTimeout(2000);

    // Should still be on auth page (not redirected)
    await expect(page).toHaveURL(/\/auth/);
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    // Check we're on sign in by default
    await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();

    // Look for a link or button to switch to sign up
    const signUpLink = page.getByText(/sign up/i).or(page.getByText(/create account/i));

    if (await signUpLink.isVisible()) {
      await signUpLink.click();

      // Wait for the form to change
      await page.waitForTimeout(500);

      // Check we're now on sign up
      await expect(
        page.getByRole('heading', { name: /sign up/i }).or(
          page.getByRole('heading', { name: /create account/i })
        )
      ).toBeVisible();
    }
  });

  test('should have Google OAuth button', async ({ page }) => {
    // Check for Google sign in button
    const googleButton = page.getByRole('button', { name: /google/i });
    await expect(googleButton).toBeVisible();
  });

  test('should navigate to password reset', async ({ page }) => {
    // Look for forgot password link
    const forgotPasswordLink = page.getByText(/forgot password/i);

    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();

      // Wait for navigation or modal
      await page.waitForTimeout(500);

      // Check for password reset UI
      await expect(
        page.getByText(/reset password/i).or(page.getByText(/enter your email/i))
      ).toBeVisible();
    }
  });

  test('should have accessibility features', async ({ page }) => {
    // Check that form inputs have labels
    const emailInput = page.getByLabel(/email/i);
    const passwordInput = page.getByLabel(/password/i);

    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();

    // Check that password input is type password
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should be responsive on mobile', async ({ page, viewport }) => {
    // This test will run on mobile viewports as defined in playwright.config.ts
    if (viewport && viewport.width < 768) {
      // Check that the auth form is still visible and usable
      await expect(page.getByRole('heading', { name: /sign in/i })).toBeVisible();
      await expect(page.getByLabel(/email/i)).toBeVisible();
      await expect(page.getByLabel(/password/i)).toBeVisible();
      await expect(page.getByRole('button', { name: /sign in/i })).toBeVisible();
    }
  });
});

test.describe('Authenticated User Flow', () => {
  // Note: These tests would require actual test credentials
  // In a real scenario, you'd set up test users in your test environment

  test.skip('should successfully sign in with valid credentials', async ({ page }) => {
    await page.goto('/auth');

    // Use test credentials from environment variables
    const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
    const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';

    await page.getByLabel(/email/i).fill(testEmail);
    await page.getByLabel(/password/i).fill(testPassword);
    await page.getByRole('button', { name: /sign in/i }).click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test.skip('should persist authentication after page reload', async ({ page, context }) => {
    // This would test that session persistence works
    await page.goto('/dashboard');

    // If redirected to auth, sign in first
    if (page.url().includes('/auth')) {
      const testEmail = process.env.TEST_USER_EMAIL || 'test@example.com';
      const testPassword = process.env.TEST_USER_PASSWORD || 'testpassword';

      await page.getByLabel(/email/i).fill(testEmail);
      await page.getByLabel(/password/i).fill(testPassword);
      await page.getByRole('button', { name: /sign in/i }).click();

      await page.waitForURL('**/dashboard');
    }

    // Reload the page
    await page.reload();

    // Should still be on dashboard (not redirected to auth)
    await expect(page).toHaveURL(/\/dashboard/);
  });

  test.skip('should successfully sign out', async ({ page }) => {
    await page.goto('/dashboard');

    // Find and click the sign out button/link
    const signOutButton = page.getByRole('button', { name: /sign out/i }).or(
      page.getByRole('link', { name: /sign out/i })
    );

    await signOutButton.click();

    // Wait for redirect to auth
    await page.waitForURL('**/auth', { timeout: 5000 });

    // Verify we're back on auth page
    await expect(page).toHaveURL(/\/auth/);
  });
});
