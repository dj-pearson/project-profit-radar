import React from 'react';
import { Database } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Data Processing Agreement (DPA) Template.
 *
 * Public, pre-signed DPA template for B2B/enterprise customers covering GDPR
 * Article 28, UK GDPR, and CCPA/CPRA service-provider obligations. Customers
 * may execute the DPA by completing the form on this page or downloading the
 * PDF version from /legal/dpa.pdf.
 */
const DataProcessingAgreement = () => (
  <LegalPageLayout
    title="Data Processing Agreement"
    metaDescription="Brikly's standard Data Processing Agreement (DPA) for B2B customers, covering GDPR Article 28, UK GDPR, CCPA/CPRA service-provider terms, sub-processors, and Standard Contractual Clauses."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Database className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Subprocessors', href: '/subprocessors' },
      { label: 'Security', href: '/legal/security' },
      { label: 'Terms of Service', href: '/terms-of-service' },
    ]}
  >
    <p>
      This Data Processing Agreement ("<strong>DPA</strong>") forms part of, and is incorporated
      into, the Brikly Terms of Service or other written agreement between Brikly Inc. ("
      <strong>Brikly</strong>" or "<strong>Processor</strong>") and the customer identified in the
      applicable order ("<strong>Customer</strong>" or "<strong>Controller</strong>"). It governs
      Brikly's processing of Personal Data on Customer's behalf in connection with the Service.
    </p>

    <h2>1. Definitions</h2>
    <p>
      "<strong>Applicable Data Protection Law</strong>" means all data-protection and privacy laws
      applicable to the processing of Personal Data under this DPA, including the EU General Data
      Protection Regulation (Regulation (EU) 2016/679) ("<strong>GDPR</strong>"), the UK GDPR and
      Data Protection Act 2018, the California Consumer Privacy Act as amended by the California
      Privacy Rights Act ("<strong>CCPA/CPRA</strong>"), the Virginia CDPA, the Colorado Privacy
      Act, the Connecticut Data Privacy Act, the Texas Data Privacy and Security Act, and other
      U.S. state privacy laws as they enter into force.
    </p>
    <p>
      "<strong>Personal Data</strong>," "<strong>Processing</strong>," "<strong>Controller</strong>
      ," "<strong>Processor</strong>," "<strong>Data Subject</strong>," and "
      <strong>Sub-processor</strong>" have the meanings given in Applicable Data Protection Law.
      Under the CCPA/CPRA, Brikly acts as a "<strong>Service Provider</strong>" and Customer as a "
      <strong>Business</strong>."
    </p>

    <h2>2. Scope and Roles</h2>
    <p>
      Customer is the Controller (or Business) of Personal Data submitted to the Service. Brikly
      processes Personal Data only on documented instructions from Customer and only for the
      following purposes:
    </p>
    <ul>
      <li>Providing, securing, and maintaining the Service in accordance with the Agreement;</li>
      <li>Providing customer support and resolving Service incidents at Customer's request;</li>
      <li>Complying with Customer's reasonable instructions consistent with the Agreement;</li>
      <li>Complying with applicable law (with notice to Customer where lawful).</li>
    </ul>
    <p>
      Brikly does not "sell" or "share" Personal Data within the meaning of the CCPA/CPRA, and does
      not retain, use, or disclose Personal Data for any purpose other than the business purposes
      specified in this DPA, except as required by law.
    </p>

    <h2>3. Subject Matter, Duration, Nature &amp; Purpose</h2>
    <p>
      <strong>Subject matter:</strong> processing necessary to provide the Service. <br />
      <strong>Duration:</strong> the term of the Agreement plus the data-return/deletion period.{' '}
      <br />
      <strong>Nature and purpose:</strong> hosting, storing, transmitting, displaying, organizing,
      backing up, and otherwise processing Personal Data so Customer can use the Service. <br />
      <strong>Categories of Data Subjects:</strong> Customer's employees, contractors, customers,
      vendors, subcontractors, and other authorized end users. <br />
      <strong>Categories of Personal Data:</strong> identification and contact information, account
      credentials, role and permissions, project participation, time and location data (where
      enabled), photos and documents uploaded by users, communications metadata, billing contact
      information, and any other Personal Data Customer chooses to submit to the Service.
    </p>

    <h2>4. Confidentiality and Security</h2>
    <p>
      Brikly will: (a) ensure that personnel authorized to process Personal Data are bound by
      confidentiality obligations; (b) implement and maintain appropriate technical and
      organizational measures designed to protect Personal Data against unauthorized or unlawful
      processing and against accidental loss, destruction, damage, or alteration ("
      <strong>Security Measures</strong>"); and (c) make Security Measures available for Customer
      review at <a href="/legal/security">Security</a>. Security Measures include encryption in
      transit (TLS 1.2+) and at rest, role-based access control, audit logging, secret rotation,
      multi-tenant data isolation via Postgres Row-Level Security, vendor security review, and
      regular penetration testing.
    </p>

    <h2>5. Sub-processors</h2>
    <p>
      Customer authorizes Brikly to engage Sub-processors to provide the Service. The current list
      is published at <a href="/subprocessors">/subprocessors</a> and is updated when changes
      occur. Brikly will notify Customer of any addition or replacement of a Sub-processor at
      least 14 days in advance (by email to the contact on file or via the in-app notification
      system). Customer may object on reasonable data-protection grounds within that period; if
      the parties cannot agree on a resolution, Customer may terminate the affected portion of the
      Service for convenience.
    </p>
    <p>
      Brikly remains liable for the acts and omissions of its Sub-processors to the same extent
      Brikly would be liable if performing the relevant services itself.
    </p>

    <h2>6. Data Subject Rights</h2>
    <p>
      Brikly will, to the extent legally permitted, promptly notify Customer of requests received
      from Data Subjects to exercise their rights (access, rectification, deletion, restriction,
      portability, objection, opt-out of sale/share, etc.). Brikly will provide reasonable
      assistance to enable Customer to respond, including via in-product self-service tools (data
      export, deletion). Brikly will not respond directly to a Data Subject request without
      Customer's prior authorization, unless required by law.
    </p>

    <h2>7. Personal Data Breach</h2>
    <p>
      Brikly will notify Customer without undue delay, and in any event within 72 hours, after
      becoming aware of a Personal Data Breach affecting Customer's Personal Data. The
      notification will include, to the extent known: the nature of the breach, categories and
      approximate number of Data Subjects and records involved, likely consequences, and measures
      taken or proposed.
    </p>

    <h2>8. International Data Transfers</h2>
    <p>
      Where Brikly processes EEA, UK, or Swiss Personal Data outside the relevant region, the
      transfer is governed by the European Commission's Standard Contractual Clauses (Module Two
      or Module Three, as applicable), the UK International Data Transfer Addendum, and the Swiss
      Federal Data Protection and Information Commissioner's amendments, each of which is
      incorporated into this DPA by reference and signed by the parties' acceptance of the DPA.
    </p>

    <h2>9. Audits</h2>
    <p>
      Brikly will make available to Customer the most recent third-party audit reports (e.g.,
      SOC 2 Type II once issued) and additional information reasonably necessary to demonstrate
      compliance with this DPA. Customer (or an independent auditor mandated by Customer that is
      not a competitor of Brikly) may, at Customer's expense and on at least 30 days' written
      notice, conduct an audit no more than once per twelve-month period (or more frequently if
      required by a regulator), subject to confidentiality and reasonable scheduling.
    </p>

    <h2>10. Return or Deletion</h2>
    <p>
      Upon termination of the Agreement, Brikly will, at Customer's choice and within 30 days,
      return or delete all Personal Data, except to the extent retention is required by law. Data
      contained in standard backups will be deleted in accordance with the documented backup
      retention schedule.
    </p>

    <h2>11. Order of Precedence</h2>
    <p>
      In the event of a conflict between this DPA and the Agreement, this DPA controls with
      respect to the processing of Personal Data. With respect to international data transfers,
      the Standard Contractual Clauses (and applicable addenda) prevail over the rest of the DPA
      and the Agreement.
    </p>

    <h2>12. How to Execute</h2>
    <p>
      For most customers, this DPA is automatically incorporated into the Terms of Service. To
      receive a counter-signed copy or to negotiate enterprise-specific terms, email{' '}
      <a href="mailto:privacy@brikly.net">privacy@brikly.net</a> with your legal entity name and
      jurisdiction.
    </p>
  </LegalPageLayout>
);

export default DataProcessingAgreement;
