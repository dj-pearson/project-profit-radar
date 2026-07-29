import { ShieldCheck } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Public security overview & responsible-disclosure policy.
 *
 * Referenced by the Data Processing Agreement and the Subprocessors page
 * (both link to /legal/security), and by the Contact page. Describes the
 * security program at a level appropriate for a public page and gives
 * researchers a clear, safe path to report vulnerabilities.
 *
 * All statements here reflect controls implemented in the platform (TLS via
 * Cloudflare, encryption at rest via Supabase, row-level security scoped by
 * company_id, RBAC, MFA/SSO, audit logging, and the 72-hour breach-
 * notification commitment in the DPA). Do not add certification claims that
 * have not actually been obtained.
 */
const Security = () => (
  <LegalPageLayout
    title="Security"
    metaDescription="Overview of Brikly's security program — encryption, tenant isolation, access controls, monitoring, incident response — and how to responsibly report a vulnerability."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<ShieldCheck className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Data Processing Agreement', href: '/dpa' },
      { label: 'Subprocessors', href: '/subprocessors' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
    ]}
  >
    <p>
      Security is foundational to how we build and operate Brikly. This page summarizes the
      technical and organizational measures we use to protect Customer data and explains how to
      report a security concern. Customers with a signed{' '}
      <a href="/dpa">Data Processing Agreement</a> may request additional detail for their
      vendor-security reviews by emailing{' '}
      <a href="mailto:security@brikly.net">security@brikly.net</a>.
    </p>

    <h2>Reporting a Vulnerability</h2>
    <p>
      If you believe you have found a security vulnerability in Brikly, please report it to{' '}
      <a href="mailto:security@brikly.net">security@brikly.net</a>. Include a description of the
      issue, the steps to reproduce it, and any proof-of-concept material. We aim to acknowledge
      reports within three business days and to keep you informed as we investigate and remediate.
    </p>
    <p>
      <strong>Safe harbor.</strong> We will not pursue or support legal action against researchers
      who act in good faith and in accordance with this policy: only interact with accounts you own
      or have explicit permission to test, avoid privacy violations and service degradation, do not
      access or modify other users' data, and give us a reasonable opportunity to remediate before
      any public disclosure. Please do not run automated scanning that could impact availability, and
      never exfiltrate data beyond the minimum needed to demonstrate a finding.
    </p>

    <h2>Encryption</h2>
    <p>
      Data is encrypted in transit using TLS 1.2 or higher for all connections to the Service, with
      HTTPS enforced at the edge. Customer data at rest in our primary database and file storage is
      encrypted using industry-standard algorithms managed by our infrastructure providers.
    </p>

    <h2>Tenant Isolation &amp; Access Control</h2>
    <p>
      Brikly is a multi-tenant platform. Every tenant's data is logically isolated and scoped to its
      company using database row-level security policies, so one customer's users cannot read or
      write another customer's records. Within a tenant, access is governed by role-based access
      control (administrator, project manager, field supervisor, office staff, accounting, and
      client-portal roles). Accounts support multi-factor authentication (MFA), and enterprise
      customers can enforce single sign-on via SAML or OAuth.
    </p>

    <h2>Monitoring &amp; Auditing</h2>
    <p>
      Critical actions are written to an audit trail. We operate application and uptime monitoring
      with alerting so that degraded dependencies and outages are detected and escalated. Access to
      production systems by our personnel is limited to those who need it to operate the Service and
      is logged.
    </p>

    <h2>Infrastructure &amp; Subprocessors</h2>
    <p>
      The Service is hosted on established cloud infrastructure providers that maintain their own
      recognized security certifications, including web-application-firewall and DDoS protection at
      the network edge. We perform a security and privacy review before engaging any subprocessor and
      contractually require appropriate safeguards. Our current subprocessors are listed on our{' '}
      <a href="/subprocessors">Subprocessors</a> page.
    </p>

    <h2>Incident Response &amp; Breach Notification</h2>
    <p>
      We maintain an incident-response process for identifying, investigating, and remediating
      security events. Consistent with our{' '}
      <a href="/dpa">Data Processing Agreement</a>, in the event of a personal-data breach we will
      notify affected Customers without undue delay and, in any event, within 72 hours of becoming
      aware of it, and will provide the information Customers need to meet their own notification
      obligations.
    </p>

    <h2>Compliance</h2>
    <p>
      Our program is designed to support Customer compliance with the GDPR, UK GDPR, and U.S. state
      privacy laws (including the CCPA/CPRA). A SOC 2 Type II examination is in progress; contact{' '}
      <a href="mailto:security@brikly.net">security@brikly.net</a> for the current status and, where
      available under NDA, the report.
    </p>

    <h2>Contact</h2>
    <p>
      For security questions or to report an issue, email{' '}
      <a href="mailto:security@brikly.net">security@brikly.net</a>. For privacy requests, see our{' '}
      <a href="/privacy-policy">Privacy Policy</a>.
    </p>
  </LegalPageLayout>
);

export default Security;
