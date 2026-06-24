import { ShieldAlert } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Acceptable Use Policy (AUP)
 *
 * Standalone AUP referenced by the Terms of Service. Defines prohibited uses,
 * enforcement, and reporting procedures. Required by enterprise procurement
 * teams and supports UDAAP/SOC 2 compliance.
 */
const AcceptableUsePolicy = () => (
  <LegalPageLayout
    title="Acceptable Use Policy"
    metaDescription="Brikly Acceptable Use Policy: rules for use of the platform, prohibited content and conduct, enforcement, and reporting abuse."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<ShieldAlert className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Terms of Service', href: '/terms-of-service' },
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'DMCA Policy', href: '/dmca' },
      { label: 'Report Abuse', href: '/contact' },
    ]}
  >
    <p>
      This Acceptable Use Policy ("<strong>AUP</strong>") governs the use of the Brikly construction
      management platform and related services (the "<strong>Service</strong>"). It applies to every
      account, end user, and authorized guest. By accessing the Service you agree to comply with this
      AUP. Capitalized terms not defined here have the meaning given in the{' '}
      <a href="/terms-of-service">Terms of Service</a>.
    </p>

    <h2>1. Prohibited Conduct</h2>
    <p>You may not, and may not permit any third party to:</p>
    <ul>
      <li>Violate any applicable federal, state, local, or international law or regulation;</li>
      <li>
        Infringe, misappropriate, or otherwise violate any intellectual property, privacy, publicity,
        contract, or other right of any person;
      </li>
      <li>
        Upload, store, or transmit content that is unlawful, defamatory, harassing, threatening,
        sexually explicit, hateful, or that exploits minors;
      </li>
      <li>
        Send unsolicited commercial messages, "spam," chain letters, or pyramid schemes through the
        Service or in violation of CAN-SPAM, TCPA, CASL, or similar laws;
      </li>
      <li>
        Introduce malware, ransomware, viruses, worms, time bombs, trojan horses, or other harmful
        code, files, or programs;
      </li>
      <li>
        Attempt to gain unauthorized access to the Service, other accounts, computer systems, or
        networks connected to the Service, including by probing, scanning, or testing
        vulnerabilities without our prior written authorization;
      </li>
      <li>
        Interfere with or disrupt the integrity, security, or performance of the Service (including
        denial-of-service attacks, traffic flooding, or excessive automated requests);
      </li>
      <li>
        Use the Service to develop, train, or fine-tune competing artificial-intelligence models or
        large-language models without express written permission from Brikly;
      </li>
      <li>
        Resell, sublicense, lease, or rent the Service or share login credentials outside your
        organization, except as expressly permitted by your subscription;
      </li>
      <li>
        Use the Service to make decisions that have legal or similarly significant effects on
        natural persons (for example, employment, credit, housing, or insurance) without independent
        human review and compliance with applicable law (FCRA, ECOA, Title VII, ADA, and equivalent
        state and local laws);
      </li>
      <li>
        Process protected health information (PHI), payment card data outside of Stripe-tokenized
        flows, government-classified information, biometric identifiers, or other regulated data
        unless authorized in a separate written agreement with Brikly;
      </li>
      <li>
        Use the Service in or for the benefit of any country, region, entity, or individual subject
        to U.S. sanctions (OFAC) or comparable export controls.
      </li>
    </ul>

    <h2>2. Customer Responsibility for User Content</h2>
    <p>
      You are solely responsible for all data, files, photos, drawings, models, time records, daily
      reports, communications, and other content you or your authorized users submit to the Service
      ("<strong>User Content</strong>"). You represent and warrant that you have all rights,
      consents, and authority necessary to submit User Content and to allow Brikly to process it as
      contemplated by the Terms of Service and Privacy Policy.
    </p>

    <h2>3. Security and Integrity</h2>
    <p>
      You must maintain the confidentiality of account credentials, enable multi-factor
      authentication where available, promptly notify Brikly at{' '}
      <a href="mailto:security@brikly.net">security@brikly.net</a> of any suspected unauthorized
      access or security incident, and cooperate with reasonable security investigations.
    </p>

    <h2>4. Industry-Specific Conduct</h2>
    <p>
      Construction-specific features (OSHA logs, safety reports, certified payroll, AIA billing,
      lien waivers) are tools that support your compliance program. You remain responsible for the
      accuracy of submissions to government agencies, customers, employees, and subcontractors. You
      must not use the Service to falsify time records, safety incidents, prevailing-wage
      certifications, or other regulated documentation.
    </p>

    <h2>5. AI and Automated Outputs</h2>
    <p>
      AI-assisted features (estimating, content generation, document analysis, classification) may
      produce inaccurate or incomplete results. You must independently review AI-generated outputs
      before relying on them for financial, contractual, safety, employment, or legal decisions. See
      our <a href="/ai-disclosure">AI Disclosure</a> for details.
    </p>

    <h2>6. Reporting Violations</h2>
    <p>
      To report a suspected violation of this AUP — including spam, abuse, malware, or unlawful
      content — email <a href="mailto:abuse@brikly.net">abuse@brikly.net</a>. To report a security
      vulnerability, email <a href="mailto:security@brikly.net">security@brikly.net</a>. Copyright
      claims must follow our <a href="/dmca">DMCA Policy</a>.
    </p>

    <h2>7. Enforcement</h2>
    <p>
      We may investigate suspected violations and may, in our reasonable discretion and without
      prior notice when necessary to protect the Service or third parties: (a) remove or disable
      offending content, (b) suspend or terminate access for the responsible account or user, (c)
      cooperate with law-enforcement and regulatory authorities, and (d) pursue any remedies
      available under contract or law. We will use good-faith efforts to provide notice and an
      opportunity to cure where reasonably practicable.
    </p>

    <h2>8. Updates</h2>
    <p>
      We may update this AUP from time to time. Material changes will be communicated through the
      Service or by email at least 30 days before they take effect, except where a shorter notice
      period is required by law or to address security or legal risks.
    </p>

    <h2>9. Contact</h2>
    <p>
      Questions about this AUP: <a href="mailto:legal@brikly.net">legal@brikly.net</a>.
    </p>
  </LegalPageLayout>
);

export default AcceptableUsePolicy;
