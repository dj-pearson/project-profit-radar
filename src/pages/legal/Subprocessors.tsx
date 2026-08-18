import { Network } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

interface Subprocessor {
  name: string;
  purpose: string;
  dataCategories: string;
  region: string;
  url: string;
}

/**
 * Public list of Brikly's third-party sub-processors. Updated whenever a
 * sub-processor is added, replaced, or removed. Required by GDPR Article 28(2)
 * and CCPA service-provider terms; supports the Data Processing Agreement.
 */
const SUBPROCESSORS: Subprocessor[] = [
  {
    name: 'Supabase, Inc.',
    purpose: 'Primary database (PostgreSQL), authentication, file storage, edge functions',
    dataCategories: 'All Customer Personal Data submitted to the Service',
    region: 'United States (us-east-1)',
    url: 'https://supabase.com/privacy',
  },
  {
    name: 'Cloudflare, Inc.',
    purpose: 'Web hosting (Cloudflare Pages), CDN, DNS, DDoS protection, WAF',
    dataCategories: 'IP addresses, request metadata, account session tokens',
    region: 'Global edge network',
    url: 'https://www.cloudflare.com/privacypolicy/',
  },
  {
    name: 'Stripe, Inc.',
    purpose: 'Subscription billing and payment processing',
    dataCategories: 'Billing contact, payment-method tokens, transaction history',
    region: 'United States; global processing',
    url: 'https://stripe.com/privacy',
  },
  {
    name: 'Functional Software, Inc. (Sentry)',
    purpose: 'Error monitoring and performance telemetry',
    dataCategories: 'Diagnostic logs, browser metadata, user IDs (pseudonymous)',
    region: 'United States',
    url: 'https://sentry.io/privacy/',
  },
  {
    name: 'PostHog, Inc.',
    purpose: 'Product analytics and feature flags',
    dataCategories: 'Page views, feature usage events, pseudonymous user IDs',
    region: 'United States / European Union (configurable)',
    url: 'https://posthog.com/privacy',
  },
  {
    name: 'Anthropic, PBC',
    purpose: 'AI features (estimating, content generation, document analysis)',
    dataCategories: 'User-submitted prompts and content where the user invokes AI features',
    region: 'United States',
    url: 'https://www.anthropic.com/legal/privacy',
  },
  {
    name: 'OpenAI, L.L.C.',
    purpose:
      'AI features (document classification, voice transcription, predictive analytics, resource and timeline optimization, content generation)',
    dataCategories:
      'User-submitted prompts and content where the user invokes AI features, including uploaded document text and recorded audio submitted for transcription',
    region: 'United States',
    url: 'https://openai.com/policies/privacy-policy',
  },
  {
    name: 'Google LLC',
    purpose:
      'Website analytics (Google Analytics 4) on our marketing site, subject to your cookie choices; optional Google Calendar and Google OAuth integrations',
    dataCategories:
      'Marketing-site page views, pseudonymous analytics identifiers and IP-derived approximate location (only where analytics cookies are consented to); calendar events and basic profile data (only if user enables the integration)',
    region: 'United States; global',
    url: 'https://policies.google.com/privacy',
  },
  {
    name: 'Microsoft Corporation',
    purpose: 'Optional Outlook Calendar and Microsoft 365 integrations',
    dataCategories: 'Calendar events, basic profile data (only if user enables integration)',
    region: 'United States; global',
    url: 'https://privacy.microsoft.com/privacystatement',
  },
  {
    name: 'Intuit, Inc.',
    purpose: 'Optional QuickBooks Online accounting integration',
    dataCategories: 'Customer/vendor records, invoice and expense data (only if user enables integration)',
    region: 'United States',
    url: 'https://www.intuit.com/privacy/statement/',
  },
  {
    name: 'Amazon Web Services, Inc. (Amazon SES)',
    purpose: 'Transactional and notification email delivery',
    dataCategories: 'Recipient email addresses, email subject and body content',
    region: 'United States',
    url: 'https://aws.amazon.com/privacy/',
  },
  {
    name: 'Resend, Inc.',
    purpose:
      'Transactional and lifecycle email delivery (notifications, payment and renewal reminders, safety alerts, trial and funnel sequences)',
    dataCategories: 'Recipient email addresses, email subject and body content',
    region: 'United States',
    url: 'https://resend.com/legal/privacy-policy',
  },
  {
    name: 'Twilio Inc. (SendGrid)',
    purpose: 'Email delivery for SEO and reporting notifications',
    dataCategories: 'Recipient email addresses, email subject and body content',
    region: 'United States',
    url: 'https://www.twilio.com/legal/privacy',
  },
  {
    name: 'Twilio Inc.',
    purpose: 'Outbound voice calling and SMS notifications',
    dataCategories: 'Phone numbers, call/message metadata and content',
    region: 'United States; global processing',
    url: 'https://www.twilio.com/legal/privacy',
  },
];

const Subprocessors = () => (
  <LegalPageLayout
    title="Subprocessors"
    metaDescription="List of third-party subprocessors that Brikly uses to provide its construction-management platform, including purpose, data categories, and processing region."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Network className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Data Processing Agreement', href: '/dpa' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Security', href: '/legal/security' },
    ]}
  >
    <p>
      Brikly engages the third-party service providers listed below ("<strong>Sub-processors</strong>")
      to help us deliver, secure, and improve the Service. We perform a security and
      privacy review before onboarding each Sub-processor, contractually require them to apply
      appropriate safeguards, and remain responsible to our customers for their performance.
    </p>

    <h2>Notification of Changes</h2>
    <p>
      We will notify Customers of new or replacement Sub-processors at least 14 days before the
      change takes effect, by email to the billing or privacy contact on file or via in-app
      notification. To receive these notifications by email, write to{' '}
      <a href="mailto:privacy@brikly.net">privacy@brikly.net</a> with the subject line
      "Subprocessor Notifications."
    </p>

    <h2>Current Sub-processors</h2>
    <table>
      <thead>
        <tr>
          <th>Provider</th>
          <th>Purpose</th>
          <th>Data Categories</th>
          <th>Region</th>
          <th>Privacy Policy</th>
        </tr>
      </thead>
      <tbody>
        {SUBPROCESSORS.map((sp) => (
          <tr key={sp.name}>
            <td>{sp.name}</td>
            <td>{sp.purpose}</td>
            <td>{sp.dataCategories}</td>
            <td>{sp.region}</td>
            <td>
              <a href={sp.url} target="_blank" rel="noopener noreferrer">
                Link
              </a>
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <h2>Affiliates &amp; Internal Service Providers</h2>
    <p>
      Brikly may also rely on its corporate affiliates to provide internal support functions
      (e.g., engineering on-call, customer support). All such affiliates are bound by
      confidentiality and data-protection terms at least as strict as those in our customer
      agreements.
    </p>
  </LegalPageLayout>
);

export default Subprocessors;
