// Stripe Configuration for BuildDesk
// This file contains Stripe product and price IDs
//
// IMPORTANT: After running the setup script (scripts/setup-stripe-products.sh or .ps1),
// update these IDs with the actual values from your Stripe account.
//
// For test mode, use test price IDs (price_xxx from test mode)
// For live mode, use live price IDs (price_xxx from live mode)

import { type SubscriptionTier, type BillingPeriod } from './pricing';

/**
 * Stripe Product IDs
 * These are created when you run the setup script
 */
export const STRIPE_PRODUCTS = {
  starter: '', // prod_xxx - Update after running setup script
  professional: '', // prod_xxx - Update after running setup script
  enterprise: '', // prod_xxx - Update after running setup script
} as const;

/**
 * Stripe Price IDs
 * These are the recurring price IDs for each tier and billing period
 */
export const STRIPE_PRICES = {
  starter_monthly: '', // price_xxx - $149/month
  starter_annual: '', // price_xxx - $1,490/year
  professional_monthly: '', // price_xxx - $299/month
  professional_annual: '', // price_xxx - $2,990/year
  enterprise_monthly: '', // price_xxx - $599/month
  enterprise_annual: '', // price_xxx - $5,990/year
} as const;

/**
 * Stripe Payment Links
 * Pre-generated payment links for direct checkout without API calls
 */
export const STRIPE_PAYMENT_LINKS = {
  starter_monthly: '', // https://buy.stripe.com/xxx
  starter_annual: '', // https://buy.stripe.com/xxx
  professional_monthly: '', // https://buy.stripe.com/xxx
  professional_annual: '', // https://buy.stripe.com/xxx
  enterprise_monthly: '', // https://buy.stripe.com/xxx
  enterprise_annual: '', // https://buy.stripe.com/xxx
} as const;

/**
 * Get the Stripe Price ID for a given tier and billing period
 */
export const getStripePriceId = (
  tier: SubscriptionTier,
  billingPeriod: BillingPeriod
): string => {
  const key = `${tier}_${billingPeriod}` as keyof typeof STRIPE_PRICES;
  return STRIPE_PRICES[key];
};

/**
 * Get the payment link URL for a given tier and billing period
 */
export const getPaymentLink = (
  tier: SubscriptionTier,
  billingPeriod: BillingPeriod
): string => {
  const key = `${tier}_${billingPeriod}` as keyof typeof STRIPE_PAYMENT_LINKS;
  return STRIPE_PAYMENT_LINKS[key];
};

/**
 * Check if Stripe is configured (price IDs are set)
 */
export const isStripeConfigured = (): boolean => {
  return Object.values(STRIPE_PRICES).every((id) => id.length > 0);
};

/**
 * Stripe Configuration Status
 * Useful for debugging and admin panels
 */
export const getStripeConfigStatus = () => {
  const pricesConfigured = Object.entries(STRIPE_PRICES).map(([key, value]) => ({
    key,
    configured: value.length > 0,
    value: value || 'NOT SET',
  }));

  const paymentLinksConfigured = Object.entries(STRIPE_PAYMENT_LINKS).map(
    ([key, value]) => ({
      key,
      configured: value.length > 0,
      value: value || 'NOT SET',
    })
  );

  return {
    isConfigured: isStripeConfigured(),
    prices: pricesConfigured,
    paymentLinks: paymentLinksConfigured,
  };
};

/**
 * Pricing amounts in cents (for reference/validation)
 * These should match what's configured in Stripe
 */
export const STRIPE_PRICING_AMOUNTS = {
  starter_monthly: 14900, // $149.00
  starter_annual: 149000, // $1,490.00
  professional_monthly: 29900, // $299.00
  professional_annual: 299000, // $2,990.00
  enterprise_monthly: 59900, // $599.00
  enterprise_annual: 599000, // $5,990.00
} as const;

/**
 * Trial period in days
 */
export const STRIPE_TRIAL_DAYS = 14;

/**
 * Stripe webhook events we handle
 */
export const STRIPE_WEBHOOK_EVENTS = [
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
  'invoice.paid',
  'invoice.payment_failed',
  'customer.subscription.trial_will_end',
] as const;
