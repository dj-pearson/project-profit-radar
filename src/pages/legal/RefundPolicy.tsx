import { CreditCard } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Refund & Cancellation Policy.
 *
 * Discloses subscription billing cycle, free-trial behavior, click-to-cancel
 * compliance with the FTC Negative Option Rule, refund eligibility, and
 * dispute resolution. Linked from Pricing and the Terms of Service.
 */
const RefundPolicy = () => (
  <LegalPageLayout
    title="Refund & Cancellation Policy"
    metaDescription="Brikly refund and cancellation policy. Learn how billing cycles, free trials, prorations, and refunds work, and how to cancel your subscription at any time."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<CreditCard className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Pricing', href: '/pricing' },
      { label: 'Subscription Settings', href: '/subscription-settings' },
    ]}
  >
    <h2>1. Subscription Plans &amp; Auto-Renewal</h2>
    <p>
      Brikly subscriptions are sold on a recurring basis (monthly or annual) and renew
      automatically at the end of each term until canceled. By starting a paid subscription you
      authorize Brikly and our payment processor (Stripe) to charge your designated payment method
      on each renewal date for the then-current subscription fee plus applicable taxes.
    </p>
    <p>
      We will email a renewal reminder for annual plans at least 30 days before each renewal
      charge. The price and renewal cadence in effect for your subscription are shown on your{' '}
      <a href="/subscription-settings">Subscription Settings</a> page at all times.
    </p>

    <h2>2. Free Trials</h2>
    <ul>
      <li>Free trials run for the period stated at sign-up (currently 14 days).</li>
      <li>
        We do not require a credit card to begin a standard free trial. If a trial is started with a
        payment method on file, the card will not be charged before the end of the trial unless you
        explicitly upgrade.
      </li>
      <li>
        At trial end, your account converts to the paid plan you selected (or downgrades to a
        read-only state if no plan is selected). You will receive an email at least 3 days before
        any first paid charge.
      </li>
      <li>
        You may cancel at any time during the trial without charge from your{' '}
        <a href="/subscription-settings">Subscription Settings</a> page.
      </li>
    </ul>

    <h2>3. How to Cancel ("Click to Cancel")</h2>
    <p>
      Consistent with the FTC Negative Option Rule, you may cancel your subscription at any time
      using the same online channel you used to subscribe. To cancel:
    </p>
    <ol>
      <li>
        Sign in and open <a href="/subscription-settings">Subscription Settings</a> (or click your
        avatar &rarr; "Billing").
      </li>
      <li>Select <strong>Cancel Subscription</strong>.</li>
      <li>Confirm. You will receive a cancellation confirmation email immediately.</li>
    </ol>
    <p>
      You may also cancel by emailing <a href="mailto:billing@brikly.net">billing@brikly.net</a>{' '}
      from the email address on file. We will process email cancellations within one business day
      and will not require a phone call, retention conversation, or any additional steps to
      effectuate the cancellation.
    </p>
    <p>
      Cancellation stops future renewals. You retain access to paid features through the end of the
      current billing period unless you request immediate termination and data deletion.
    </p>

    <h2>4. Refund Eligibility</h2>
    <p>
      Subscription fees are generally non-refundable, with the following exceptions:
    </p>
    <ul>
      <li>
        <strong>30-day satisfaction guarantee (new monthly subscriptions).</strong> If you cancel
        within 30 days of your first paid monthly charge and have not used the Service materially
        beyond evaluation, you may request a full refund.
      </li>
      <li>
        <strong>Annual plans.</strong> If you cancel an annual plan within 14 days of the initial
        purchase or annual renewal, you may request a pro-rated refund of the unused portion.
      </li>
      <li>
        <strong>Duplicate or erroneous charges.</strong> We refund verified duplicate or erroneous
        charges in full.
      </li>
      <li>
        <strong>Service unavailability.</strong> If the Service experiences an outage that exceeds
        the uptime commitment in our <a href="/sla">Service Level Agreement</a>, you are entitled
        to the service credits described there.
      </li>
      <li>
        <strong>Required by law.</strong> Where applicable consumer-protection law (including
        California, Colorado, and certain EU/UK rules) entitles you to a refund, we honor those
        rights.
      </li>
    </ul>

    <h2>5. Requesting a Refund</h2>
    <p>
      Email <a href="mailto:billing@brikly.net">billing@brikly.net</a> from the address on the
      account. Include your account email and the charge date. We respond within 5 business days.
      Approved refunds are returned to the original payment method within 5–10 business days,
      subject to your bank or card issuer.
    </p>

    <h2>6. Failed Payments &amp; Dunning</h2>
    <p>
      If a renewal payment fails, we will retry the charge up to four times over 21 days and notify
      you by email. If payment is not received, your account will be downgraded or suspended. We
      will not delete your User Content during the dunning period.
    </p>

    <h2>7. Chargebacks</h2>
    <p>
      If you believe a charge is incorrect, please contact us first — we resolve most billing
      questions within one business day. Filing a chargeback without first contacting us may result
      in suspension of the account pending resolution and the loss of certain promotional pricing.
    </p>

    <h2>8. Taxes</h2>
    <p>
      Prices shown exclude applicable sales tax, VAT, GST, or similar taxes, which are calculated
      and collected at checkout based on your billing address. Tax-exempt customers may submit a
      valid exemption certificate to <a href="mailto:billing@brikly.net">billing@brikly.net</a>.
    </p>

    <h2>9. Contact</h2>
    <p>
      Billing questions: <a href="mailto:billing@brikly.net">billing@brikly.net</a>. Mailing
      address: see the contact details on our Privacy Policy page.
    </p>
  </LegalPageLayout>
);

export default RefundPolicy;
