import { FileText } from 'lucide-react';
import LegalPageLayout from '@/components/legal/LegalPageLayout';

/**
 * Terms of Service.
 *
 * Updated for FTC "click-to-cancel" rule (Negative Option Rule), ROSCA
 * disclosure requirements, AAA arbitration / class-action waiver with
 * 30-day opt-out, FLSA / OSHA / certified-payroll disclaimers, AI
 * limitations, IP licensing, and assignment.
 */
const TermsOfService = () => (
  <LegalPageLayout
    title="Terms of Service"
    metaDescription="Brikly Terms of Service: subscription, billing, auto-renewal, cancellation, acceptable use, intellectual property, disclaimers, limitations of liability, and dispute resolution."
    effectiveDate="April 13, 2026"
    lastUpdated="April 13, 2026"
    icon={<FileText className="h-5 w-5 text-primary" aria-hidden="true" />}
    relatedLinks={[
      { label: 'Privacy Policy', href: '/privacy-policy' },
      { label: 'Acceptable Use Policy', href: '/acceptable-use-policy' },
      { label: 'Refund & Cancellation Policy', href: '/refund-policy' },
      { label: 'Service Level Agreement', href: '/sla' },
      { label: 'Data Processing Agreement', href: '/dpa' },
      { label: 'AI Disclosure', href: '/ai-disclosure' },
      { label: 'DMCA Policy', href: '/dmca' },
    ]}
  >
    <div className="not-prose mb-6 p-4 border border-yellow-300 bg-yellow-50 dark:bg-yellow-900/20 rounded-md text-sm">
      <p className="font-semibold mb-1">Important — please read carefully.</p>
      <p>
        These Terms include an <strong>arbitration agreement</strong> and a{' '}
        <strong>class-action waiver</strong> in Section 17. You may opt out of arbitration within
        30 days of first acceptance by following the procedure described there.
      </p>
    </div>

    <h2>1. Acceptance of Terms</h2>
    <p>
      These Terms of Service ("<strong>Terms</strong>") govern your access to and use of the Brikly
      construction-management platform, mobile applications, websites, APIs, and related services
      (collectively, the "<strong>Service</strong>"). They are a binding agreement between you (and,
      if you are using the Service on behalf of an organization, that organization) ("
      <strong>Customer</strong>", "you", "your") and Brikly Inc. ("<strong>Brikly</strong>", "we",
      "us", "our"). By creating an account, accessing, or using the Service, you agree to these
      Terms, our <a href="/privacy-policy">Privacy Policy</a>, our{' '}
      <a href="/acceptable-use-policy">Acceptable Use Policy</a>, and any additional terms
      referenced herein.
    </p>

    <h2>2. Eligibility &amp; Authority</h2>
    <p>
      You must be at least 18 years old (or the age of majority in your jurisdiction) to use the
      Service. If you accept these Terms on behalf of an organization, you represent that you have
      the authority to bind that organization. The Service is not intended for, and may not be
      used by, persons subject to U.S. or other applicable economic sanctions or located in
      embargoed jurisdictions.
    </p>

    <h2>3. Accounts &amp; Authorized Users</h2>
    <ul>
      <li>You must provide accurate registration information and keep it current.</li>
      <li>You are responsible for all activity that occurs under your account credentials.</li>
      <li>
        You must immediately notify <a href="mailto:security@brikly.net">security@brikly.net</a> of
        any unauthorized access or security incident.
      </li>
      <li>
        Customer is responsible for the acts and omissions of its end users and authorized guests.
      </li>
    </ul>

    <h2>4. Subscription, Auto-Renewal, Pricing &amp; Billing</h2>
    <h3>4.1 Subscription Plans</h3>
    <p>
      The Service is offered as a recurring subscription. Plans, features, included usage, and
      prices are described on our <a href="/pricing">pricing page</a> or in an applicable order
      form.
    </p>

    <h3>4.2 Auto-Renewal — Important Disclosure (ROSCA)</h3>
    <p>
      <strong>
        Your subscription will automatically renew at the end of each billing period (monthly or
        annual) at the then-current rate, plus applicable taxes, charged to the payment method on
        file, until you cancel.
      </strong>{' '}
      You authorize Brikly and our payment processor (Stripe) to store your payment method and to
      charge it for each renewal. We will email a renewal reminder for annual plans at least 30
      days before the renewal charge.
    </p>

    <h3>4.3 Click to Cancel</h3>
    <p>
      You may cancel at any time online from{' '}
      <a href="/subscription-settings">Subscription Settings</a> or by emailing{' '}
      <a href="mailto:billing@brikly.net">billing@brikly.net</a>. Cancellation is effective at the
      end of the then-current billing period. Cancellation will not require a phone call, a
      retention conversation, or any additional steps beyond those used to subscribe. See our{' '}
      <a href="/refund-policy">Refund &amp; Cancellation Policy</a>.
    </p>

    <h3>4.4 Free Trials</h3>
    <p>
      Free trials run for the period stated at sign-up. Unless you cancel before the trial ends
      (or unless we expressly indicate otherwise at sign-up), the trial converts to a paid
      subscription on the plan you selected. We will email you at least 3 days before any first
      paid charge.
    </p>

    <h3>4.5 Taxes</h3>
    <p>
      Prices are exclusive of taxes. You are responsible for any sales, use, value-added, or
      similar taxes, except taxes on Brikly's net income.
    </p>

    <h3>4.6 Price Changes</h3>
    <p>
      We may change prices upon at least 30 days' prior notice for monthly plans (effective at the
      next renewal) and at least 60 days' prior notice for annual plans (effective at the next
      annual renewal). Continued use after the effective date constitutes acceptance.
    </p>

    <h3>4.7 Failed Payments</h3>
    <p>
      We will retry failed payments and may suspend or downgrade access if payment is not received.
      We will not delete Customer Content during a normal dunning cycle.
    </p>

    <h2>5. Acceptable Use</h2>
    <p>
      Your use of the Service is subject to our{' '}
      <a href="/acceptable-use-policy">Acceptable Use Policy</a>, which is incorporated into these
      Terms.
    </p>

    <h2>6. Customer Content &amp; Licenses</h2>
    <p>
      As between the parties, you retain all rights in Customer Content. You grant Brikly a
      worldwide, non-exclusive, royalty-free license to host, copy, transmit, display, modify
      (e.g., resize images), and process Customer Content solely as needed to provide and improve
      the Service consistent with the <a href="/privacy-policy">Privacy Policy</a>. You represent
      and warrant that you have all rights and consents necessary to grant this license.
    </p>
    <p>
      You may export your Customer Content at any time through in-product export tools (CSV, JSON,
      PDF as applicable).
    </p>

    <h2>7. Brikly Intellectual Property</h2>
    <p>
      The Service, including all software, content, designs, trademarks, and documentation, is
      owned by Brikly or its licensors and is protected by intellectual-property and other laws.
      We grant you a limited, revocable, non-transferable, non-exclusive license to access and use
      the Service during your subscription, solely for your internal business purposes and subject
      to these Terms. All rights not expressly granted are reserved.
    </p>

    <h2>8. Feedback</h2>
    <p>
      If you provide feedback or suggestions about the Service, you grant Brikly a perpetual,
      irrevocable, royalty-free license to use the feedback for any purpose without obligation to
      you.
    </p>

    <h2>9. Third-Party Services &amp; Integrations</h2>
    <p>
      The Service may interoperate with third-party services (e.g., Stripe, QuickBooks, Google,
      Microsoft, Apple, Anthropic). Your use of those services is governed by their own terms and
      privacy policies. Brikly is not responsible for third-party services or for any data
      processing performed by them.
    </p>

    <h2>10. Beta Features</h2>
    <p>
      Beta, pre-release, or "labs" features are provided "<strong>AS IS</strong>" without warranty
      and may be modified or withdrawn at any time. SLAs and uptime commitments do not apply to
      Beta Features.
    </p>

    <h2>11. AI Features &amp; Disclaimer</h2>
    <p>
      AI-assisted features can produce inaccurate, incomplete, or biased outputs and do not
      constitute professional advice. You are responsible for independently reviewing AI outputs
      before relying on them and for complying with laws governing automated decision-making in
      your jurisdiction. See our <a href="/ai-disclosure">AI Disclosure</a>.
    </p>

    <h2>12. Industry-Specific Disclaimers (Construction)</h2>
    <p>
      Tools that support time tracking, payroll, certified payroll, prevailing-wage compliance,
      OSHA recordkeeping, lien waivers, AIA-style billing, change orders, financial reporting, and
      similar functions are <strong>tools to assist your compliance program</strong>. They are not
      a substitute for legal, accounting, engineering, or safety advice. You remain solely
      responsible for: (a) classifying workers correctly under the FLSA and applicable state law;
      (b) accurately recording time, wages, and benefits; (c) preparing and filing certified
      payroll, tax, and regulatory reports; (d) maintaining OSHA-required logs; and (e) the
      accuracy of any document, invoice, or filing produced through the Service.
    </p>

    <h2>13. Service Levels &amp; Support</h2>
    <p>
      Service availability and support response times are described in our{' '}
      <a href="/sla">Service Level Agreement</a>. Service credits described there are the
      exclusive remedy for any failure to meet the Service Commitment.
    </p>

    <h2>14. Suspension &amp; Termination</h2>
    <p>
      You may terminate by canceling as described in Section 4.3. We may suspend or terminate the
      Service or your account: (a) for material breach of these Terms or our Acceptable Use Policy
      that is not cured within 10 days of notice (or immediately for serious breaches that cannot
      be cured); (b) for non-payment more than 30 days past due; (c) to comply with law or to
      prevent harm to the Service or third parties; or (d) for convenience on at least 60 days'
      notice (with a pro-rated refund of pre-paid, unused fees). Upon termination, your right to
      use the Service ends. Brikly will retain Customer Content for 30 days after termination so
      you can export it, then delete it as described in the Privacy Policy.
    </p>

    <h2>15. Disclaimers</h2>
    <p>
      <strong>
        EXCEPT AS EXPRESSLY STATED IN THESE TERMS, THE SERVICE IS PROVIDED "AS IS" AND "AS
        AVAILABLE". TO THE FULLEST EXTENT PERMITTED BY LAW, BRIKLY DISCLAIMS ALL WARRANTIES,
        EXPRESS, IMPLIED, OR STATUTORY, INCLUDING WARRANTIES OF MERCHANTABILITY, FITNESS FOR A
        PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT. BRIKLY DOES NOT WARRANT THAT THE SERVICE
        WILL BE UNINTERRUPTED, ERROR-FREE, OR FREE OF HARMFUL COMPONENTS.
      </strong>
    </p>

    <h2>16. Limitation of Liability</h2>
    <p>
      <strong>
        TO THE FULLEST EXTENT PERMITTED BY LAW, NEITHER PARTY (NOR ITS AFFILIATES, OFFICERS,
        EMPLOYEES, OR LICENSORS) WILL BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
        CONSEQUENTIAL, EXEMPLARY, OR PUNITIVE DAMAGES, OR FOR ANY LOSS OF PROFITS, REVENUE, GOODWILL,
        OR DATA, ARISING OUT OF OR RELATED TO THESE TERMS, EVEN IF ADVISED OF THE POSSIBILITY OF
        SUCH DAMAGES. EACH PARTY'S TOTAL CUMULATIVE LIABILITY ARISING OUT OF OR RELATED TO THESE
        TERMS WILL NOT EXCEED THE FEES PAID OR PAYABLE BY CUSTOMER TO BRIKLY UNDER THESE TERMS IN
        THE 12 MONTHS BEFORE THE EVENT GIVING RISE TO THE LIABILITY.
      </strong>{' '}
      The foregoing limitations do not apply to (a) Customer's payment obligations, (b) breach of
      Sections 5 (Acceptable Use) or 7 (IP), or (c) liabilities that cannot be limited under
      applicable law.
    </p>

    <h2>17. Dispute Resolution; Arbitration; Class-Action Waiver</h2>
    <p>
      <strong>Informal resolution.</strong> Before filing a formal claim, the parties will try in
      good faith to resolve the dispute by sending written notice to{' '}
      <a href="mailto:legal@brikly.net">legal@brikly.net</a> and conferring within 30 days.
    </p>
    <p>
      <strong>Binding arbitration.</strong> Except for (i) claims for injunctive relief to protect
      intellectual property, (ii) small-claims-court actions within the court's jurisdiction, and
      (iii) the right of either party to seek a public-injunction in court where required by law,
      any dispute arising out of or relating to these Terms will be resolved by final and binding
      individual arbitration administered by the American Arbitration Association ("
      <strong>AAA</strong>") under its Commercial Arbitration Rules and, where applicable, its
      Consumer Arbitration Rules. The seat of arbitration will be the U.S. state where Customer's
      billing address is located. Judgment on the award may be entered in any court of competent
      jurisdiction.
    </p>
    <p>
      <strong>Class-action waiver.</strong> Disputes will be resolved on an individual basis only.
      The parties waive any right to participate in a class, collective, or representative action
      to the fullest extent permitted by law.
    </p>
    <p>
      <strong>30-Day Opt-Out.</strong> You may opt out of this arbitration agreement and class
      waiver by sending a signed written notice to{' '}
      <a href="mailto:legal@brikly.net">legal@brikly.net</a> within 30 days of first accepting
      these Terms. Opt-out does not affect any other portion of these Terms.
    </p>

    <h2>18. Governing Law</h2>
    <p>
      These Terms are governed by the laws of the State of Delaware, USA, excluding its
      conflict-of-law rules and the United Nations Convention on Contracts for the International
      Sale of Goods. To the extent any dispute is heard in court (rather than arbitration), the
      parties consent to the exclusive jurisdiction of the state and federal courts located in
      Delaware. Nothing in this Section overrides mandatory consumer protections of your country
      or state of residence.
    </p>

    <h2>19. Indemnification</h2>
    <p>
      You will defend, indemnify, and hold harmless Brikly and its affiliates from and against any
      third-party claim arising out of (a) Customer Content, (b) your breach of these Terms or our
      Acceptable Use Policy, or (c) your violation of law. Brikly will defend you against
      third-party claims that the Service, used in accordance with these Terms, infringes a U.S.
      copyright, trademark, or patent issued as of the effective date, and will pay damages
      finally awarded; this is Brikly's exclusive IP-infringement obligation.
    </p>

    <h2>20. Confidentiality</h2>
    <p>
      Each party will protect the other's non-public business information disclosed under these
      Terms with reasonable care and use it only to perform the Terms.
    </p>

    <h2>21. Government &amp; Export</h2>
    <p>
      The Service is "commercial computer software" under FAR/DFARS. You may not export or re-export
      the Service in violation of U.S. or other applicable law.
    </p>

    <h2>22. Assignment</h2>
    <p>
      You may not assign these Terms without our prior written consent. We may assign these Terms
      in connection with a merger, acquisition, financing, or sale of assets.
    </p>

    <h2>23. Notices &amp; Modifications</h2>
    <p>
      We may modify these Terms from time to time. Material changes will be announced through the
      Service or by email at least 30 days before they take effect. Continued use after the
      effective date constitutes acceptance. Notices to Brikly should be sent to{' '}
      <a href="mailto:legal@brikly.net">legal@brikly.net</a>; notices to Customer may be sent to
      the email address on the account.
    </p>

    <h2>24. Miscellaneous</h2>
    <p>
      These Terms constitute the entire agreement between the parties regarding the Service and
      supersede prior agreements on the subject. If any provision is unenforceable, the remaining
      provisions remain in effect. No waiver is effective unless in writing. There are no third-
      party beneficiaries. The relationship of the parties is that of independent contractors.
    </p>

    <h2>25. Contact</h2>
    <address className="not-italic bg-muted p-4 rounded-md">
      <strong>Brikly Inc.</strong>
      <br />
      Legal: <a href="mailto:legal@brikly.net">legal@brikly.net</a>
      <br />
      Support: <a href="mailto:support@brikly.net">support@brikly.net</a>
      <br />
      Mail: 123 Construction Way, Suite 100, Builder City, BC 12345, USA
    </address>
  </LegalPageLayout>
);

export default TermsOfService;
