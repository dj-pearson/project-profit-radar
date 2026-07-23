import { Mail } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Public contact / imprint page.
 *
 * Referenced by the Acceptable Use Policy ("Report Abuse") and the "Do Not
 * Sell" page ("Contact Us"). Provides a directory of role-based contact
 * addresses so users can reach the right team. Postal correspondence is
 * directed to the address disclosed in the Privacy Policy rather than
 * duplicating it here.
 */
const CONTACTS: Array<{ subject: string; email: string; note: string; link?: { label: string; href: string } }> = [
  {
    subject: 'General & Support',
    email: 'support@brikly.net',
    note: 'Product help, account questions, and general inquiries.',
  },
  {
    subject: 'Privacy & Data Requests',
    email: 'privacy@brikly.net',
    note: 'Access, deletion, correction, and other data-subject requests.',
    link: { label: 'Privacy Policy', href: '/privacy-policy' },
  },
  {
    subject: 'Your Privacy Choices',
    email: 'privacy@brikly.net',
    note: 'Opt out of "sale" or "sharing" under U.S. state privacy laws.',
    link: { label: 'Do Not Sell or Share', href: '/do-not-sell' },
  },
  {
    subject: 'Security & Vulnerability Reports',
    email: 'security@brikly.net',
    note: 'Report a suspected security issue. See our disclosure policy.',
    link: { label: 'Security', href: '/legal/security' },
  },
  {
    subject: 'Abuse Reports',
    email: 'abuse@brikly.net',
    note: 'Report misuse or violations of our Acceptable Use Policy.',
    link: { label: 'Acceptable Use Policy', href: '/acceptable-use-policy' },
  },
  {
    subject: 'Copyright (DMCA)',
    email: 'dmca@brikly.net',
    note: 'Copyright infringement notices and counter-notices.',
    link: { label: 'DMCA Policy', href: '/dmca' },
  },
  {
    subject: 'Accessibility',
    email: 'accessibility@brikly.net',
    note: 'Accessibility feedback or requests for an accessible format.',
    link: { label: 'Accessibility Statement', href: '/accessibility-statement' },
  },
  {
    subject: 'Legal',
    email: 'legal@brikly.net',
    note: 'Terms of Service and other legal matters.',
    link: { label: 'Terms of Service', href: '/terms-of-service' },
  },
  {
    subject: 'Billing',
    email: 'billing@brikly.net',
    note: 'Invoices, subscriptions, and payment questions.',
    link: { label: 'Refund Policy', href: '/refund-policy' },
  },
];

const Contact = () => (
  <LegalPageLayout
    title="Contact Us"
    metaDescription="How to reach Brikly — support, privacy, security, abuse, DMCA, accessibility, legal, and billing contacts for our construction-management platform."
    lastUpdated="April 13, 2026"
    icon={<Mail className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Security', href: '/legal/security' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ]}
  >
    <p>
      We're happy to help. Use the address below that best matches your request so it reaches the
      right team as quickly as possible.
    </p>

    <h2>Contact Directory</h2>
    <table>
      <thead>
        <tr>
          <th>Topic</th>
          <th>Email</th>
          <th>What it's for</th>
        </tr>
      </thead>
      <tbody>
        {CONTACTS.map((c) => (
          <tr key={`${c.subject}-${c.email}`}>
            <td>{c.subject}</td>
            <td>
              <a href={`mailto:${c.email}`}>{c.email}</a>
            </td>
            <td>
              {c.note}
              {c.link && (
                <>
                  {' '}
                  <a href={c.link.href}>{c.link.label}</a>.
                </>
              )}
            </td>
          </tr>
        ))}
      </tbody>
    </table>

    <h2>Postal Mail</h2>
    <p>
      For correspondence by post, our registered mailing address is listed in Section 12 of our{' '}
      <a href="/privacy-policy">Privacy Policy</a>.
    </p>
  </LegalPageLayout>
);

export default Contact;
