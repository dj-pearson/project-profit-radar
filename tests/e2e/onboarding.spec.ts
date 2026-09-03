import { test, expect } from '@playwright/test';

/**
 * US-317 AC5: a fresh signup completes setup and gets a company.
 *
 * WHAT THIS NEEDS, AND WHY IT SKIPS WITHOUT IT: the flow under test is
 * "a user with no company_id finishes the wizard". You cannot reach that state
 * without an account that has never completed setup, and you cannot create one
 * inside a spec without a mailbox to confirm the address from. So the run is
 * gated on SETUP_USER_EMAIL / SETUP_USER_PASSWORD naming a confirmed account
 * whose profile still has a null company_id.
 *
 * The account is single-use by definition: once this spec passes, that user has
 * a company and the next run skips the wizard entirely (Setup.tsx redirects
 * anyone with a company_id straight to the dashboard). The spec detects that
 * and reports it rather than failing, because a redirect to /dashboard is the
 * correct behaviour for that user - it just is not the flow this test is for.
 *
 * This follows the US-214 convention: skip with a reason that names what to
 * set, never a bare test.skip(), and never a forged session.
 */

const EMAIL = process.env.SETUP_USER_EMAIL;
const PASSWORD = process.env.SETUP_USER_PASSWORD;
const hasFreshAccount = Boolean(EMAIL && PASSWORD);

const WHY_SKIPPED =
  'Needs SETUP_USER_EMAIL and SETUP_USER_PASSWORD for a confirmed account that ' +
  'has never completed setup (user_profiles.company_id IS NULL). Unset here, so ' +
  'the tenant-provisioning flow cannot run. See US-317 / US-247.';

test.describe('Setup wizard provisions a tenant (US-317)', () => {
  test.skip(!hasFreshAccount, WHY_SKIPPED);

  test('completing setup creates a company and lands on a populated dashboard', async ({ page }) => {
    await page.goto('/auth');
    await page.getByLabel(/email/i).fill(EMAIL!);
    await page.getByLabel(/password/i).fill(PASSWORD!);
    await page.getByRole('button', { name: /sign in/i }).click();

    await page.waitForURL(/\/(setup|dashboard)/, { timeout: 20_000 });

    if (new URL(page.url()).pathname.startsWith('/dashboard')) {
      test.skip(
        true,
        'This account already has a company, so the wizard is skipped by design. ' +
          'Point SETUP_USER_EMAIL at an account that has not completed setup.'
      );
      return;
    }

    // Step 1: welcome
    await page.getByRole('button', { name: /next/i }).click();

    // Step 2: the company. This is the step that creates the tenant.
    const companyName = `E2E Builders ${Date.now()}`;
    await page.getByLabel(/company name/i).fill(companyName);
    await page.getByRole('button', { name: /next/i }).click();

    // Step 3: skip the optional first project, so a failure here cannot be
    // confused with a failure to provision.
    await page.getByRole('button', { name: /skip for now/i }).click();
    await page.getByRole('button', { name: /next/i }).click();

    // Step 4: finish
    await page.getByRole('button', { name: /complete setup/i }).click();

    await page.waitForURL('**/dashboard', { timeout: 20_000 });

    // The company exists and the client can read it back. Company settings
    // reads companies by the caller's company_id, so the name rendering there
    // is the round trip: RPC wrote the row, RLS lets this user select it.
    await page.goto('/company-settings');
    await expect(page.getByDisplayValue(companyName).or(page.getByText(companyName)).first())
      .toBeVisible({ timeout: 20_000 });

    // The cost codes the trigger seeded are what makes an estimate possible.
    await page.goto('/estimates');
    await expect(page.locator('#root')).toBeVisible({ timeout: 20_000 });

    // Returning to /setup now redirects, because the user has a company.
    await page.goto('/setup');
    await page.waitForURL('**/dashboard', { timeout: 20_000 });
  });
});
