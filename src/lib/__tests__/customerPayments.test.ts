/**
 * US-324: a customer paying a contractor's invoice.
 *
 * Three breaks, each enough on its own:
 *
 *   1. Both portals disabled the Pay button unless invoice.stripe_invoice_id
 *      was set, and nothing in the product writes that column - its only
 *      writer is payment_failures, for Brikly's OWN subscriptions. The button
 *      was permanently disabled on every invoice ever raised.
 *   2. stripe-webhook handled subscription, refund and dispute events only, so
 *      a payment that somehow happened would never be recorded.
 *   3. processManualPayment updated invoices.amount_paid directly and built a
 *      payment record it returned without inserting, so a cheque left no
 *      history and bypassed the trigger that owns the invoice totals.
 *
 * The money-routing decision is asserted here too, because it is the part a
 * future change is most likely to get wrong quietly.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';

const strip = (path: string) =>
  readFileSync(path, 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .split('\n')
    .filter((line) => !line.trim().startsWith('//') && !line.trim().startsWith('--'))
    .join('\n');

const migration = strip('supabase/migrations/20260903070000_customer_payments.sql');
const payFn = strip('supabase/functions/process-invoice-payment/index.ts');
const webhook = strip('supabase/functions/stripe-webhook/index.ts');
const portal = strip('src/pages/ClientPortalEnhanced.tsx');
const sendFn = strip('supabase/functions/send-invoice/index.ts');

describe('the client can pay (US-324)', () => {
  it('no longer gates the Pay button on a column nothing writes', () => {
    expect(portal).not.toMatch(/!invoice\.stripe_invoice_id/);
    expect(portal).toMatch(/invoice\.amount_due > 0/);
    expect(portal).toMatch(/payment_method: 'stripe_checkout'/);
  });

  it('collects on the contractor own Stripe account, not the platform', () => {
    // Holding other businesses' customer receipts makes the platform a money
    // transmitter in most jurisdictions and puts the contractor's cash flow
    // behind a payout the platform controls.
    expect(payFn).toMatch(/function connectedAccount/);
    expect(payFn).toMatch(/stripe_connect_account_id/);
    // Both Stripe entry points, not just one: a Checkout session on the
    // connected account and a PaymentIntent on the platform would split a
    // contractor's receipts across two balances.
    const routed = payFn.match(/\}, \{ stripeAccount \}\)/g) || [];
    expect(routed.length).toBe(2);
    expect(payFn.match(/connectedAccount\(invoice\)/g) || []).toHaveLength(2);
    expect(migration).toMatch(/stripe_connect_account_id TEXT/);
  });

  it('refuses clearly when no Stripe account is connected', () => {
    // Rather than silently routing the money somewhere else.
    expect(payFn).toMatch(/has not connected a Stripe account/);
    expect(payFn).toMatch(/onboarding for this company is not finished/);
  });
});

describe('the payment is recorded (US-324)', () => {
  it('handles both events a Checkout payment produces', () => {
    expect(webhook).toMatch(/case 'checkout\.session\.completed'/);
    expect(webhook).toMatch(/case 'payment_intent\.succeeded'/);
  });

  it('is idempotent on the Stripe reference', () => {
    // A Checkout payment fires both events, so the same charge reaches the
    // recorder twice by design.
    expect(migration).toMatch(/WHERE stripe_payment_intent_id = p_stripe_payment_intent_id/);
    expect(migration).toMatch(/RETURN v_existing/);
  });

  it('reads the error rather than losing money silently', () => {
    // An unrecorded payment is money the contractor received and cannot see.
    expect(webhook).toMatch(/Could not record invoice payment/);
  });

  it('records manual payments through invoice_payments', () => {
    expect(payFn).toMatch(/record_invoice_payment/);
    // and no longer writes the invoice totals itself
    const manual = payFn.slice(payFn.indexOf('async function processManualPayment'));
    expect(manual).not.toMatch(/amount_paid: newAmountPaid/);
  });

  it('leaves the invoice totals to the trigger that owns them', () => {
    // Writing amount_paid here as well as in the trigger is how an invoice
    // ends up with a balance its own payment rows do not explain. Asserted on
    // the code, not on the comment saying so.
    expect(migration).toMatch(/INSERT INTO public\.invoice_payments/);
    expect(migration).not.toMatch(/UPDATE public\.invoices/);
  });

  it('refuses a payment that is not a positive amount', () => {
    expect(migration).toMatch(/A payment must be a positive amount/);
  });
});

describe('the invoice is actually sent (US-324)', () => {
  it('emails the client and only then marks it sent', () => {
    // An invoice marked sent but never delivered is what the reminder
    // functions would then chase the client about.
    const sendIndex = sendFn.indexOf('sendEmail(');
    const statusIndex = sendFn.indexOf("status: invoice.status === \"draft\"");
    expect(sendIndex).toBeGreaterThan(-1);
    expect(statusIndex).toBeGreaterThan(sendIndex);
    expect(sendFn).toMatch(/sent_at: new Date\(\)\.toISOString\(\)/);
  });

  it('does not promise online payment the contractor cannot accept', () => {
    expect(sendFn).toMatch(/canPayOnline/);
    expect(sendFn).toMatch(/stripe_connect_charges_enabled/);
  });

  it('escapes client and company names in the email body', () => {
    expect(sendFn).toMatch(/escapeHtml\(companyName\)/);
    expect(sendFn).toMatch(/escapeHtml\(invoice\.client_name/);
  });
});
