import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

/**
 * Cancellation parity guards (US-292).
 *
 * The FTC negative-option rule and the state automatic-renewal laws (the
 * California ARL and its equivalents) require cancelling to be about as easy
 * as subscribing. Signup for Brikly is fully self-serve on the web, while
 * cancellation used to have no in-app control at all: the only route was a
 * button labelled "Manage Billing & Payment Methods", which does not tell a
 * subscriber that cancellation lives behind it.
 */
describe('cancellation path', () => {
  const UI = readFileSync('src/components/SubscriptionManager.tsx', 'utf8');
  const FN = readFileSync('supabase/functions/customer-portal/index.ts', 'utf8');

  it('offers a control that says it cancels', () => {
    expect(UI).toMatch(/Cancel Subscription/);
  });

  it('deep-links that control to the cancellation flow', () => {
    expect(UI).toContain("openCustomerPortal('cancel')");
  });

  it('does not pass the click event as the flow argument', () => {
    // onClick={openCustomerPortal} would hand React's event object in as
    // `flow`, silently sending {flow: <SyntheticEvent>} to the function.
    expect(UI).not.toMatch(/onClick=\{openCustomerPortal\}/);
  });

  it('tells the user cancellation is available through the portal', () => {
    expect(UI).toMatch(/cancel your subscription/i);
  });

  it('sends flow_data so Stripe opens on the cancel screen', () => {
    expect(FN).toContain('subscription_cancel');
    expect(FN).toContain('flow_data');
  });

  it('resolves the subscription from Stripe rather than a local column', () => {
    // stripe_subscription_id lives on `companies` while this function reads
    // `subscribers`, so a local read would have been undefined.
    expect(FN).toContain('stripe.subscriptions.list');
  });

  it('falls back to the plain portal when the subscription cannot be resolved', () => {
    expect(FN).toMatch(/falling back to plain portal/i);
  });

  it('still works for callers that send no body', () => {
    // PaymentDashboard and PaymentFailureAlert invoke with no body at all.
    expect(FN).toMatch(/catch\s*\{/);
  });
});
