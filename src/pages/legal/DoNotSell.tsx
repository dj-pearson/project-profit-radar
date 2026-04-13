import React from 'react';
import { ShieldOff } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * "Your Privacy Choices" / Do Not Sell or Share My Personal Information.
 *
 * Required link in the footer for CCPA/CPRA, Colorado, Connecticut, Virginia,
 * and other U.S. state laws. Provides at least two methods to opt out.
 */
const DoNotSell = () => (
  <LegalPageLayout
    title="Your Privacy Choices"
    metaDescription="Exercise your right to opt out of the sale or sharing of personal information under CCPA/CPRA and other U.S. state privacy laws."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<ShieldOff className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Cookie Policy', href: '/cookie-policy' },
      { label: 'Contact Us', href: '/contact' },
    ]}
  >
    <p>
      Brikly does not sell personal information for monetary consideration. Some U.S. state laws
      (including the CCPA/CPRA, Colorado Privacy Act, Connecticut Data Privacy Act, Virginia
      Consumer Data Protection Act, and Texas Data Privacy and Security Act) define "sale" and
      "sharing" broadly to include certain uses of analytics or advertising cookies. To opt out of
      any such uses, please use one of the methods below.
    </p>

    <h2>Method 1 — Browser Signal (Global Privacy Control)</h2>
    <p>
      We honor the Global Privacy Control ("<strong>GPC</strong>") signal as a valid opt-out of
      "sale" and "sharing." Enabling GPC in your browser or browser extension automatically
      communicates the opt-out to our marketing site without any further action.
    </p>

    <h2>Method 2 — In-Product Cookie Preferences</h2>
    <p>
      Click the "Cookie Preferences" link in the footer of any page on brikly.net to open the
      consent center and disable Analytics and Marketing categories. Your preference is saved on
      your device and persists across sessions.
    </p>

    <h2>Method 3 — Submit a Verifiable Request</h2>
    <p>
      You may also submit a request by:
    </p>
    <ul>
      <li>
        Email: <a href="mailto:privacy@brikly.net">privacy@brikly.net</a> with the subject line
        "Opt Out — Sale/Share";
      </li>
      <li>
        Self-service Privacy Center: <a href="/gdpr-compliance">/gdpr-compliance</a>;
      </li>
      <li>
        Mail: Brikly, Attn: Privacy, 123 Construction Way, Suite 100, Builder City, BC 12345, USA.
      </li>
    </ul>
    <p>
      We will verify your identity using account information or, for non-account holders, by
      asking you to confirm details about your interactions with us. You may use an authorized
      agent (with written authorization). We respond within 15 business days for opt-out requests
      under CCPA/CPRA.
    </p>

    <h2>Sensitive Personal Information</h2>
    <p>
      We do not use sensitive personal information for purposes beyond those allowed under
      Cal. Civ. Code § 1798.121, so a "limit use" right does not apply to additional purposes.
    </p>

    <h2>Authorized Agents</h2>
    <p>
      You may designate an authorized agent to submit a request on your behalf. The agent must
      provide signed permission, and we may require you to verify your identity directly.
    </p>

    <h2>No Discrimination</h2>
    <p>
      We will not discriminate against you for exercising any privacy right (no denial of service,
      different prices, or different quality).
    </p>
  </LegalPageLayout>
);

export default DoNotSell;
