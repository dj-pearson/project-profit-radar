import { Shield } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Privacy Policy.
 *
 * Aligned with GDPR, UK GDPR, CCPA/CPRA, Virginia CDPA, Colorado CPA,
 * Connecticut DPA, Texas DPSA, and other U.S. state privacy laws.
 * Discloses categories of personal information collected, sources, purposes,
 * disclosures, retention, individual rights (incl. opt-out of sale/share and
 * sensitive-data limits), international transfers, AI processing, and
 * the contact channel for DSARs.
 */
const PrivacyPolicy = () => (
  <LegalPageLayout
    title="Privacy Policy"
    metaDescription="Brikly's Privacy Policy: what personal information we collect, how we use and share it, your privacy rights under U.S. state laws, GDPR, and UK GDPR, and how to exercise them."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Shield className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'AI Disclosure', href: '/ai-disclosure' },
      { label: 'Subprocessors', href: '/subprocessors' },
      { label: 'Data Processing Agreement', href: '/dpa' },
      { label: 'Your Privacy Choices', href: '/do-not-sell' },
    ]}
  >
    <p>
      Brikly Inc. ("<strong>Brikly</strong>", "we", "us", "our") provides a construction-management
      platform to small and mid-sized contractors. This Privacy Policy explains how we collect,
      use, share, and protect personal information when you visit our websites, use our mobile and
      web applications, or otherwise interact with us (collectively, the "<strong>Service</strong>
      "). Capitalized terms not defined here have the meaning given in our{' '}
      <a href="/terms-of-service">Terms of Service</a>.
    </p>

    <h2>1. Our Role</h2>
    <p>
      For most data submitted to the Service by our paying customers ("<strong>Customer Content</strong>
      "), Brikly acts as a "service provider" under the CCPA/CPRA, a "processor" under the GDPR, and
      a comparable role under other applicable laws, processing data on behalf of the customer
      organization that purchased the Service. For our marketing websites, account billing data,
      and visitor analytics, Brikly acts as the controller / business.
    </p>

    <h2>2. Information We Collect</h2>
    <h3>2.1 Information you provide</h3>
    <ul>
      <li>
        <strong>Account &amp; profile:</strong> name, email, phone, job title, company, password
        hash, profile photo, language and accessibility preferences.
      </li>
      <li>
        <strong>Customer Content:</strong> projects, estimates, daily reports, photos, drawings,
        documents, change orders, schedules, communications, time entries, and any other data your
        organization chooses to submit.
      </li>
      <li>
        <strong>Billing:</strong> billing contact, billing address, tax IDs, and payment-method
        tokens (full card numbers are processed by Stripe and never touch our servers).
      </li>
      <li>
        <strong>Support &amp; communications:</strong> messages you send to support, survey
        responses, demo requests.
      </li>
    </ul>
    <h3>2.2 Information collected automatically</h3>
    <ul>
      <li>
        <strong>Device &amp; usage:</strong> IP address, user agent, device identifiers, operating
        system, language, time zone, pages viewed, features used, click events, error reports,
        approximate location derived from IP.
      </li>
      <li>
        <strong>Precise location:</strong> if you enable GPS check-ins on a mobile device, latitude
        and longitude at the time of clock-in / clock-out, with the customer's geofence
        configuration. Precise location is collected only with on-device permission and only when
        the feature is invoked.
      </li>
      <li>
        <strong>Cookies &amp; similar technologies:</strong> see our{' '}
        <a href="/cookie-policy">Cookie Policy</a>.
      </li>
    </ul>
    <h3>2.3 Information from third parties</h3>
    <ul>
      <li>
        <strong>Single sign-on:</strong> if you log in via Google, Microsoft, Apple, or a SAML
        identity provider, we receive your name, email, and unique identifier.
      </li>
      <li>
        <strong>Integrations you enable:</strong> accounting (QuickBooks), calendar (Google /
        Outlook), and similar integrations may share data into the Service in accordance with the
        permissions you grant.
      </li>
      <li>
        <strong>Public sources:</strong> business information, lead enrichment data from
        commercially available sources for sales and marketing.
      </li>
    </ul>

    <h2>3. Sources, Purposes &amp; Legal Bases</h2>
    <p>We use personal information for the following purposes:</p>
    <ul>
      <li>
        <strong>Provide and operate the Service</strong> (contract; legitimate interests):
        delivering features you request, processing transactions, syncing integrations.
      </li>
      <li>
        <strong>Security &amp; fraud prevention</strong> (legitimate interests; legal obligation):
        authentication, MFA, abuse detection, audit logs, incident response.
      </li>
      <li>
        <strong>Customer support</strong> (contract; legitimate interests).
      </li>
      <li>
        <strong>Service improvement &amp; analytics</strong> (legitimate interests; consent where
        required): aggregate usage metrics, error monitoring, feature experimentation.
      </li>
      <li>
        <strong>Marketing</strong> (consent where required; legitimate interests otherwise):
        emails about Brikly products, events, and content. You can opt out of marketing email at
        any time.
      </li>
      <li>
        <strong>Legal compliance</strong> (legal obligation): tax, accounting, anti-fraud,
        responding to lawful requests.
      </li>
    </ul>
    <p>
      We do <strong>not</strong> use sensitive personal information for inferences about a
      consumer, and we do <strong>not</strong> sell personal information for money.
    </p>

    <h2>4. Disclosure of Personal Information</h2>
    <p>We disclose personal information to:</p>
    <ul>
      <li>
        <strong>Subprocessors / service providers</strong> that host, secure, and operate the
        Service. See our <a href="/subprocessors">subprocessor list</a>.
      </li>
      <li>
        <strong>Your organization</strong> — administrators of the workspace you belong to may view
        your account, role, and activity within the workspace.
      </li>
      <li>
        <strong>Integration partners you enable</strong>, in the scope you authorize.
      </li>
      <li>
        <strong>Professional advisors</strong> (lawyers, auditors, accountants) under
        confidentiality.
      </li>
      <li>
        <strong>Authorities</strong> when required by law, valid legal process, or to protect
        rights, property, and safety.
      </li>
      <li>
        <strong>Successors</strong> in connection with a merger, acquisition, financing, or sale of
        assets, subject to appropriate confidentiality and the obligations of this Privacy Policy.
      </li>
    </ul>
    <p>
      We do not sell personal information for monetary consideration. To the extent that the use
      of analytics or advertising cookies on our marketing website constitutes "sharing" or "sale"
      under the CCPA/CPRA, we honor opt-outs through the cookie banner, the in-product privacy
      controls, and the Global Privacy Control (GPC) signal.
    </p>

    <h2>5. Retention</h2>
    <p>
      We retain personal information for as long as necessary to provide the Service, comply with
      legal obligations (tax, accounting, audit, employment-records laws), resolve disputes, and
      enforce our agreements. Customer Content is retained until the customer deletes it or for
      30 days after subscription termination, after which it is deleted from production systems
      and rolled out of backups within 90 days, unless the customer requests immediate deletion or
      law requires longer retention.
    </p>

    <h2>6. Your Privacy Rights</h2>
    <p>
      Depending on where you live, you may have the following rights, exercisable at no cost and
      without retaliation:
    </p>
    <ul>
      <li>
        <strong>Access</strong> the personal information we hold about you and information about
        how we process it.
      </li>
      <li>
        <strong>Correct</strong> inaccurate personal information.
      </li>
      <li>
        <strong>Delete</strong> personal information, subject to legal exceptions.
      </li>
      <li>
        <strong>Port</strong> a copy of your personal information in a portable, machine-readable
        format.
      </li>
      <li>
        <strong>Restrict / object</strong> to certain processing, including direct marketing.
      </li>
      <li>
        <strong>Opt out of "sale" or "sharing"</strong> of personal information for cross-context
        behavioral advertising (CCPA/CPRA, Colorado, Connecticut, Virginia, Texas, and other
        states).
      </li>
      <li>
        <strong>Limit use of sensitive personal information</strong> to disclosed business purposes
        (CCPA/CPRA).
      </li>
      <li>
        <strong>Withdraw consent</strong> at any time where processing is based on consent.
      </li>
      <li>
        <strong>Lodge a complaint</strong> with a supervisory authority (EEA, UK) or your state
        attorney general.
      </li>
      <li>
        <strong>Avoid solely automated decisions</strong> with legal or similarly significant
        effects, except where permitted.
      </li>
    </ul>
    <p>
      <strong>How to exercise your rights:</strong> use our self-service{' '}
      <a href="/gdpr-compliance">Privacy Center</a>, email{' '}
      <a href="mailto:privacy@brikly.net">privacy@brikly.net</a>, or write to the address in
      Section 12. We will verify your identity using account credentials or government-issued ID
      where appropriate. You may use an authorized agent (the agent must provide written proof of
      authorization). We respond within 45 days (extendable by 45 days where permitted).
    </p>
    <p>
      If you are an end user of a Brikly customer (your employer's account), please direct your
      request to your workspace administrator first; we will assist them in responding.
    </p>

    <h2>7. Cookies, Tracking &amp; Global Privacy Control</h2>
    <p>
      We use cookies and similar technologies as described in our{' '}
      <a href="/cookie-policy">Cookie Policy</a>. We honor browser-based opt-out signals such as
      Global Privacy Control as a valid request to opt out of "sale" and "sharing" under
      applicable U.S. state laws.
    </p>

    <h2>8. International Transfers</h2>
    <p>
      We are headquartered in the United States. When personal information is transferred from the
      EEA, UK, or Switzerland to the United States or other jurisdictions, we rely on the European
      Commission's Standard Contractual Clauses, the UK International Data Transfer Addendum, and
      the Swiss authority's amendments, together with supplementary measures (encryption, access
      controls, transparency reporting). Customers may execute our{' '}
      <a href="/dpa">Data Processing Agreement</a> to receive these clauses contractually.
    </p>

    <h2>9. Security</h2>
    <p>
      We maintain technical and organizational measures designed to protect personal information,
      including TLS 1.2+ in transit and AES-256 at rest, role-based access control, multi-factor
      authentication, audit logging, secret rotation, multi-tenant data isolation via Postgres
      Row-Level Security, vendor security review, and regular penetration testing. No system is
      perfectly secure; we will notify affected parties of qualifying personal-data breaches as
      required by applicable law (within 72 hours where the GDPR applies).
    </p>

    <h2>10. AI Features</h2>
    <p>
      The Service includes optional AI-assisted features. Inputs you submit to those features may
      be transmitted to third-party AI providers under contracts that prohibit them from using
      your data to train general models. We do not sell AI inputs or outputs and do not use
      Customer Content to train Brikly foundation models. See our{' '}
      <a href="/ai-disclosure">AI Disclosure</a>.
    </p>

    <h2>11. Children</h2>
    <p>
      The Service is not directed to children under 16, and we do not knowingly collect personal
      information from children under 16. If you believe a child has provided us with personal
      information, contact <a href="mailto:privacy@brikly.net">privacy@brikly.net</a> and we will
      delete it.
    </p>

    <h2>12. Contact &amp; Data Protection Officer</h2>
    <address className="not-italic bg-muted p-4 rounded-md">
      <strong>Brikly Inc. — Privacy Team</strong>
      <br />
      Email: <a href="mailto:privacy@brikly.net">privacy@brikly.net</a>
      <br />
      Mail: 123 Construction Way, Suite 100, Builder City, BC 12345, USA
    </address>
    <p>
      For EEA / UK matters you may contact our designated representative at the same email
      address; we will assign a Data Protection Officer where required by law and publish their
      contact details here.
    </p>

    <h2>13. Changes to This Policy</h2>
    <p>
      We will post any changes to this Privacy Policy on this page and update the "Last updated"
      date. Material changes will be announced through the Service or by email at least 30 days
      before they take effect.
    </p>

    <h2>14. California "Shine the Light"</h2>
    <p>
      California residents may request, once per year and free of charge, information about
      categories of personal information disclosed to third parties for those parties' direct
      marketing purposes. Brikly does not disclose personal information for third-party direct
      marketing.
    </p>

    <h2>15. Notice of Financial Incentives</h2>
    <p>
      We do not offer financial incentives in exchange for personal information.
    </p>
  </LegalPageLayout>
);

export default PrivacyPolicy;
