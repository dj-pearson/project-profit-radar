import React from 'react';
import { Activity } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Service Level Agreement (SLA).
 *
 * Documents uptime commitment, measurement methodology, exclusions, and
 * service-credit remedies. Required for enterprise sales and refund-eligibility
 * calculations under the Refund Policy.
 */
const ServiceLevelAgreement = () => (
  <LegalPageLayout
    title="Service Level Agreement"
    metaDescription="Brikly's Service Level Agreement: 99.9% uptime commitment, measurement methodology, scheduled maintenance, support response times, and service credits."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Activity className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Refund & Cancellation Policy', href: '/refund-policy' },
      { label: 'Status Page', href: 'https://status.brikly.net' },
    ]}
  >
    <p>
      This Service Level Agreement ("<strong>SLA</strong>") describes Brikly's uptime commitment
      for paid subscriptions to the Brikly construction-management platform (the "
      <strong>Service</strong>"). This SLA is incorporated into and governed by the{' '}
      <a href="/terms-of-service">Terms of Service</a>.
    </p>

    <h2>1. Uptime Commitment</h2>
    <p>
      Brikly will use commercially reasonable efforts to make the Service available with a{' '}
      <strong>Monthly Uptime Percentage of at least 99.9%</strong> during each calendar month
      ("<strong>Service Commitment</strong>").
    </p>

    <h2>2. Definitions</h2>
    <ul>
      <li>
        <strong>Monthly Uptime Percentage</strong> = (Total Minutes in the Month − Unavailable
        Minutes) ÷ Total Minutes in the Month, expressed as a percentage.
      </li>
      <li>
        <strong>Unavailable</strong> means the production Service returns server-side errors (HTTP
        5xx) for more than 5% of requests for at least 5 consecutive minutes, as measured by
        Brikly's external monitoring infrastructure.
      </li>
      <li>
        <strong>Excluded Time</strong> includes Scheduled Maintenance and the Excluded Causes in
        Section 5.
      </li>
    </ul>

    <h2>3. Scheduled Maintenance</h2>
    <p>
      Brikly may perform scheduled maintenance during off-peak hours. Scheduled maintenance windows
      are announced at least 48 hours in advance through the in-app notification system, the{' '}
      <a href="https://status.brikly.net">status page</a>, or email. Scheduled Maintenance does not
      count as Unavailable.
    </p>

    <h2>4. Support Response Times</h2>
    <table>
      <thead>
        <tr>
          <th>Severity</th>
          <th>Description</th>
          <th>Initial Response</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Sev 1 — Critical</td>
          <td>Production Service unavailable for all users</td>
          <td>1 hour, 24×7</td>
        </tr>
        <tr>
          <td>Sev 2 — High</td>
          <td>Major feature unavailable or significantly degraded</td>
          <td>4 business hours</td>
        </tr>
        <tr>
          <td>Sev 3 — Normal</td>
          <td>Minor feature issue with workaround</td>
          <td>1 business day</td>
        </tr>
        <tr>
          <td>Sev 4 — Low</td>
          <td>Question, feature request, documentation issue</td>
          <td>2 business days</td>
        </tr>
      </tbody>
    </table>

    <h2>5. Excluded Causes</h2>
    <p>The Service Commitment does not apply to unavailability caused by:</p>
    <ul>
      <li>Scheduled Maintenance or emergency security patches;</li>
      <li>
        Factors outside Brikly's reasonable control, including force majeure, internet backbone
        failures, denial-of-service attacks, or third-party platform outages (e.g., Supabase,
        Cloudflare, Stripe, AWS);
      </li>
      <li>Customer's equipment, software, network, or other technology issues;</li>
      <li>
        Customer's failure to comply with required configurations, supported browsers, or the{' '}
        <a href="/acceptable-use-policy">Acceptable Use Policy</a>;
      </li>
      <li>Suspension or termination in accordance with the Terms of Service;</li>
      <li>Beta, preview, or experimental features.</li>
    </ul>

    <h2>6. Service Credits</h2>
    <table>
      <thead>
        <tr>
          <th>Monthly Uptime Percentage</th>
          <th>Service Credit</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>&lt; 99.9% but ≥ 99.0%</td>
          <td>10% of monthly fee</td>
        </tr>
        <tr>
          <td>&lt; 99.0% but ≥ 95.0%</td>
          <td>25% of monthly fee</td>
        </tr>
        <tr>
          <td>&lt; 95.0%</td>
          <td>50% of monthly fee</td>
        </tr>
      </tbody>
    </table>
    <p>
      Service Credits are calculated against the affected month's subscription fee for the impacted
      Service and are issued as a credit to the customer's account against future invoices. Service
      Credits are the customer's <strong>sole and exclusive remedy</strong> for any failure to meet
      the Service Commitment, and the maximum aggregate credit issued in any month will not exceed
      50% of that month's subscription fee.
    </p>

    <h2>7. Credit Request Procedure</h2>
    <p>
      To receive a Service Credit you must submit a request to{' '}
      <a href="mailto:billing@brikly.net">billing@brikly.net</a> within 30 days after the end of
      the affected month. The request must include the dates and times of unavailability and any
      relevant logs or screenshots. Brikly will validate the request against its monitoring data
      and respond within 30 days.
    </p>

    <h2>8. Status Page &amp; Incident Reporting</h2>
    <p>
      Real-time service status, incident history, and post-mortems are published at{' '}
      <a href="https://status.brikly.net">status.brikly.net</a>. Customers may subscribe to email
      or SMS notifications for incident updates.
    </p>
  </LegalPageLayout>
);

export default ServiceLevelAgreement;
