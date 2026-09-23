import { test, expect } from '@playwright/test';
import { requireTestCredentials, signIn, signInForm, TEST_EMAIL, TEST_PASSWORD } from './fixtures/auth';
import { answerCookieBanner } from './fixtures/server';

test.describe('Authentication', () => {
  test.beforeEach(async ({ page }) => {
    await answerCookieBanner(page);
    await page.goto('/auth');
  });

  test('should display the authentication page', async ({ page }) => {
    await expect(page).toHaveTitle(/Brikly/i);
    // The sign-in view's heading is "Welcome back"; there has been no heading
    // reading "Sign in" since the auth page was split into SignInForm.
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(signInForm(page).form).toBeVisible();
  });

  test('should block an empty form submission', async ({ page }) => {
    const { email, submit } = signInForm(page);
    await submit.click();

    // The form validates with react-hook-form + Zod (US-268): the submit is
    // stopped before any request and the error is shown inline. The inputs
    // keep `required`, so their validity state still says why.
    expect(await email.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
    await expect(page.getByText('Email is required')).toBeVisible();
    await expect(page).toHaveURL(/\/auth$/);
  });

  test('a failed sign-in keeps the visitor on /auth and says why', async ({ page }) => {
    // Against a real backend this is a credential rejection; against CI's
    // placeholder it is an unreachable backend. Either way the visitor must
    // stay here with the form back and a reason on screen. The unreachable
    // case takes ~14s because the client retries with backoff, hence the
    // longer budget.
    test.setTimeout(60_000);
    const { email, password, submit } = signInForm(page);
    await email.fill('invalid@example.com');
    await password.fill('wrongpassword');
    await submit.click();

    await expect(submit).toBeEnabled({ timeout: 40_000 });
    await expect(page).toHaveURL(/\/auth$/);
    await expect(page.getByText(/sign in failed/i).first()).toBeVisible();
  });

  test('should toggle between sign in and sign up', async ({ page }) => {
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();

    // Used to be wrapped in `if (await link.isVisible())`, which passed whether
    // or not the toggle existed. It exists; assert it.
    await page.getByRole('button', { name: 'Create one' }).click();
    await expect(page.getByRole('heading', { name: 'Create your account' })).toBeVisible();
  });

  test('should have Google OAuth button', async ({ page }) => {
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
  });

  test('should navigate to password reset', async ({ page }) => {
    await page.getByRole('button', { name: 'Forgot password?' }).click();
    await expect(page.getByRole('heading', { name: 'Reset password' })).toBeVisible();
  });

  test('should have accessibility features', async ({ page }) => {
    const { email, password } = signInForm(page);
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(password).toHaveAttribute('type', 'password');
    // The show/hide toggle is labelled, which is why the password locator must
    // be exact.
    await expect(page.getByRole('button', { name: 'Show password' })).toBeVisible();
  });

  test('should be responsive on mobile', async ({ page, viewport }) => {
    test.skip(!viewport || viewport.width >= 768, 'Mobile-width check; runs under the Mobile Chrome project.');
    const { email, password, submit } = signInForm(page);
    await expect(page.getByRole('heading', { name: 'Welcome back' })).toBeVisible();
    await expect(email).toBeVisible();
    await expect(password).toBeVisible();
    await expect(submit).toBeVisible();
  });
});

test.describe('Authenticated User Flow', () => {
  // These run wherever TEST_USER_EMAIL and TEST_USER_PASSWORD name an account
  // on the target environment, and skip with that reason where they do not
  // (US-214). They were `test.skip(...)`, which never ran anywhere and said
  // nothing about why.
  test.beforeEach(() => {
    requireTestCredentials();
  });

  test('should successfully sign in with valid credentials', async ({ page }) => {
    await answerCookieBanner(page);
    await page.goto('/auth');

    // Use test credentials from environment variables
    const testEmail = TEST_EMAIL!;
    const testPassword = TEST_PASSWORD!;

    const form = signInForm(page);
    await form.email.fill(testEmail);
    await form.password.fill(testPassword);
    await form.submit.click();

    // Wait for navigation to dashboard
    await page.waitForURL('**/dashboard', { timeout: 10000 });

    // Verify we're on the dashboard
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
  });

  test('should persist authentication after page reload', async ({ page }) => {
    // Sign in unconditionally rather than "go to /dashboard, and if we were
    // bounced to /auth then sign in". That branch made the test pass either
    // way: if the redirect never happened the body was skipped and the reload
    // proved nothing, and a session that failed to persist looked identical to
    // one that was never established.
    await signIn(page);

    await page.reload();

    await expect(page).toHaveURL(/\/dashboard/);
  });

  test('should successfully sign out', async ({ page }) => {
    // Has to sign in first. Landing on /dashboard unauthenticated redirects to
    // /auth, where there is no sign-out control, so this used to fail on a
    // missing button rather than on anything about signing out.
    await signIn(page);

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
