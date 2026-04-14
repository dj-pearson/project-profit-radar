import React from 'react';
import { Cookie } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Cookie Policy.
 *
 * Required disclosure for ePrivacy / GDPR / CCPA-CPRA / state law. Pairs with
 * the existing CookieConsentManager component, which collects granular
 * opt-in consent for non-essential cookies.
 */
const CookiePolicy = () => (
  <LegalPageLayout
    title="Cookie Policy"
    metaDescription="How Brikly uses cookies and similar technologies, what categories of cookies are set, and how to manage your cookie preferences."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<Cookie className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Manage cookie preferences', href: '#cookie-preferences' },
    ]}
  >
    <p>
      This Cookie Policy explains how Brikly Inc. ("<strong>Brikly</strong>", "we", "us") uses
      cookies and similar tracking technologies ("<strong>Cookies</strong>") on our websites and in
      the Brikly construction-management application (the "<strong>Service</strong>").
    </p>

    <h2>1. What Are Cookies?</h2>
    <p>
      Cookies are small text files placed on your device when you visit a website. They are widely
      used to make websites work, to make them work more efficiently, and to provide reporting
      information. Similar technologies include local storage, session storage, pixel tags, and
      software development kits ("SDKs").
    </p>

    <h2>2. Categories of Cookies We Use</h2>
    <h3>Strictly Necessary</h3>
    <p>
      Required to operate the Service: authentication and session management, load balancing,
      security, cookie-consent state, and accessibility preferences. These cannot be disabled
      because the Service will not function without them.
    </p>
    <h3>Analytics &amp; Performance</h3>
    <p>
      Help us understand how visitors interact with our marketing site and product so we can
      improve them. Currently provided by PostHog and Cloudflare Web Analytics.
    </p>
    <h3>Functional / Preferences</h3>
    <p>
      Remember choices you make (theme, language, layout) to personalize your experience.
    </p>
    <h3>Marketing</h3>
    <p>
      Used on our public marketing pages to measure the effectiveness of campaigns and (where
      applicable) to deliver relevant advertising. Currently provided by Google Tag Manager and
      Google Analytics.
    </p>

    <h2>3. Your Choices</h2>
    <p>
      In jurisdictions that require opt-in (EEA, UK, Switzerland), non-essential Cookies are not
      set until you accept them through our cookie banner. In other jurisdictions, you may opt out
      at any time through the in-product preferences panel. You can also:
    </p>
    <ul>
      <li>Use your browser settings to block or delete cookies.</li>
      <li>
        Enable a Global Privacy Control ("<strong>GPC</strong>") signal in your browser — we treat
        GPC as a valid opt-out of "sale" or "sharing" of personal information under CCPA/CPRA and
        the Colorado Privacy Act.
      </li>
      <li>
        Opt out of Google Analytics tracking using{' '}
        <a href="https://tools.google.com/dlpage/gaoptout">Google's opt-out browser add-on</a>.
      </li>
    </ul>
    <p id="cookie-preferences">
      <strong>Manage preferences:</strong> click the "Cookie Preferences" link in the footer of any
      page to reopen the consent center at any time.
    </p>

    <h2>4. Do Not Track</h2>
    <p>
      Browser "Do Not Track" signals are not standardized; we honor GPC instead.
    </p>

    <h2>5. Updates</h2>
    <p>
      We may update this Cookie Policy from time to time. Material changes will be announced
      through the Service or by email at least 30 days before they take effect.
    </p>

    <h2>6. Contact</h2>
    <p>
      Email <a href="mailto:privacy@brikly.net">privacy@brikly.net</a> with cookie-related
      questions.
    </p>
  </LegalPageLayout>
);

export default CookiePolicy;
